//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2025  Interneuron Limited

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

//See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with this program.If not, see<http://www.gnu.org/licenses/>.
//END LICENSE BLOCK 
import { Injectable, OnDestroy } from "@angular/core";
import { forkJoin, Subscription } from "rxjs";
import { v4 as uuid } from 'uuid';
import { ApirequestService } from "./api-request.service";
import { AppService } from "./app.service";
import { filter, filterParams, filterparam, filters, orderbystatement, selectstatement } from "src/app/models/synapse-dynamic-api/Filter.model";
import { UpsertTransactionManager } from "./upsert-transaction-manager.service";
import { CorePersonAddress } from "src/app/models/entities/core-personaddress.model";

@Injectable({
    providedIn: 'root'
})

export class DataRequest implements OnDestroy {
    subscriptions = new Subscription();
    patientDetails;
    nextRefresh;
    constructor(private apiRequestService: ApirequestService, private appService: AppService, private dr: DataRequest) {
    }
    getClient(cb) {
        this.subscriptions.add(this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.getClientUrl, this.createPersonFilter())
            .subscribe(
                (response: any) => {
                    let client: any;
                    if (response && response.length > 0) {
                        client = response[0];
                        client.__personIdentifiers = JSON.parse(client.personidentifiers);
                        client.__personAddresses = JSON.parse(client.personaddresses);
                        client.__personContactInfos = JSON.parse(client.personcontactinfos);
                        client.__nextOfKins = JSON.parse(client.nextofkins);
                        client.__careTeam = JSON.parse(client.careteam);
                        client.__personCommissioner = JSON.parse(client.commissioner);
                        client.__extendedPerson = JSON.parse(client.extendedperson);

                        delete client.personidentifiers;
                        delete client.personaddresses;
                        delete client.personcontactinfos;
                        delete client.nextofkins;
                        delete client.careteam;
                        delete client.commissioner;
                        delete client.extendedperson;
                        this.appService.client = client;
                    }
                    cb(client);
                }
            ));
    }


    updateDataToClient(submission, cb) {
        var upsertManager = new UpsertTransactionManager();
        let client = Object.assign({}, this.appService.client);;
        delete client['dob'];
        Object.keys(client).map((e) => { if (e.startsWith("__")) delete client[e]; });

        client.titlecode = submission["data"]["title"];
        client.firstname = submission["data"]["firstName1"];
        client.middlename = submission["data"]["middleName"];
        client.familyname = submission["data"]["surname1"]
        client.fullname = this.getFullName([client.titlecode, client.firstname, client.middlename, client.familyname]);
        if (!this.appService.client.__personAddresses) {
            this.appService.client.__personAddresses = [];
        }
        if(this.appService.client.__personAddresses.length ==0) {
            let personAddress = new CorePersonAddress();
            personAddress.personaddress_id = uuid();
            personAddress.person_id = this.appService.personId;
            this.appService.client.__personAddresses.push(personAddress);
        }
        this.appService.client.__personAddresses[0].line1 = submission["data"]["address3"];
        this.appService.client.__personAddresses[0].line2 = submission["data"]["address4"];
        this.appService.client.__personAddresses[0].city = submission["data"]["city1"];
        this.appService.client.__personAddresses[0].countystateprovince = submission["data"]["county"];
        this.appService.client.__personAddresses[0].postcodezip = submission["data"]["postcode"];
        upsertManager.beginTran(this.appService.moduleConfig.apiEndpoints.dynamicApiURI, this.apiRequestService);
        upsertManager.addEntity('core', 'person', JSON.parse(JSON.stringify(client)));

        if (this.appService.client.__personAddresses && this.appService.client.__personAddresses.length > 0) {
            upsertManager.addEntity('core', 'personaddress', JSON.parse(JSON.stringify(this.appService.client.__personAddresses[0])));

        }
        upsertManager.save((resp) => {
            cb();
        },
            (error) => {

            }
        );
    }

    getHeightWeight(cb: () => any) {
        this.appService.refWeightValue = null;
        this.appService.refHeightValue = null
        this.subscriptions.add(
            this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.baseURI + "/GetBaseViewListByPost/epma_getweightobservations", this.createWeightFilter())
                .subscribe((response) => {
                    if (response.length > 0) {
                        if (response[0].value != "" || response[0].value != null) {                          
                            this.appService.refWeightValue = response[0].value;                           
                        }
                        else {
                            this.appService.refWeightValue = null;
                        }
                    }                   
                    this.subscriptions.add(
                        this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.baseURI + "/GetBaseViewListByPost/epma_getheightobservations", this.createHeightFilter())
                            .subscribe((response) => {
                                if (response.length > 0) {
                                    if (response[0].value != "" || response[0].value != null) {
                                        this.appService.refHeightValue = response[0].value;
                                    } 
                                } else {
                                    this.appService.refHeightValue = null;
                                }
                                cb();
                            }));
                }));
    }

    private getFullName(data: string[]): string {
        let fullName = "";

        data.map(names => {
            if (names && names.trim() != "")
                fullName += names + " ";
        });

        return fullName.trimRight();
    }
    private createPersonFilter() {
        let condition = "person_id = @person_id";
        let f = new filters()
        f.filters.push(new filter(condition));
        let pm = new filterParams();
        pm.filterparams.push(new filterparam("person_id", this.appService.personId));
        let select = new selectstatement("SELECT *");
        let orderby = new orderbystatement("ORDER BY 1 desc");
        let body = [];
        body.push(f);
        body.push(pm);
        body.push(select);
        body.push(orderby);
        return JSON.stringify(body);
    }
    createWeightFilter() {
        // let condition = "person_id = @person_id and encounter_id = @encounter_id";
        let condition = "person_id = @person_id";

        let f = new filters()
        f.filters.push(new filter(condition));

        let pm = new filterParams();
        pm.filterparams.push(new filterparam("person_id", this.appService.personId));
        // pm.filterparams.push(new filterparam("encounter_id", this.appService.encounter.encounter_id));

        let select = new selectstatement("SELECT *");

        let orderby = new orderbystatement("ORDER BY observationeventdatetime desc");

        let body = [];
        body.push(f);
        body.push(pm);
        body.push(select);
        body.push(orderby);

        return JSON.stringify(body);
    }
    createHeightFilter() {
        // let condition = "person_id = @person_id and encounter_id = @encounter_id";
        let condition = "person_id = @person_id";

        let f = new filters()
        f.filters.push(new filter(condition));

        let pm = new filterParams();
        pm.filterparams.push(new filterparam("person_id", this.appService.personId));
        // pm.filterparams.push(new filterparam("encounter_id", this.appService.encounter.encounter_id));

        let select = new selectstatement("SELECT *");

        let orderby = new orderbystatement("ORDER BY observationeventdatetime desc");

        let body = [];
        body.push(f);
        body.push(pm);
        body.push(select);
        body.push(orderby);

        return JSON.stringify(body);
    }
    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
}

