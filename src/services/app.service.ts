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
import { Injectable } from '@angular/core';
import { TerminusModuleAssessmentsConfig } from 'src/app/models/config/terminus-module-assessments.model';
import {jwtDecode} from "jwt-decode";
import { action } from 'src/app/models/synapse-dynamic-api/Filter.model';
import { CorePerson } from 'src/app/models/entities/core-person.model';

@Injectable({
    providedIn: 'root'
})
export class AppService {
    personId: string;
    encounterId: string;
    contexts: string;
    loggedInUserName: string;
    loggedInUserId: string;
    apiServiceReference: any;
    roleActions: action[] = [];
    client: CorePerson
    moduleConfig: TerminusModuleAssessmentsConfig;
    gender: any = [];
    ethenic: any = [];
    maritalstatus: any = [];
    religion: any = [];
    accommodationtype: any = [];
    tenureofproperty: any = [];
    roles: any = [];
    meetingRenderer: any;
    refWeightValue: number;
    refHeightValue: number;
    awsS3client: any;
    isdcode: any = [];
    assessmentsource: any = [];
    reset(): void {
        this.personId = null;
        this.encounterId = null;
        this.contexts = null;
        this.loggedInUserName = null;
        this.loggedInUserId = null;
        this.apiServiceReference = null;
        this.roleActions = [];
        this.client = null;
        this.moduleConfig = null;
        this.gender = [];
        this.ethenic = [];
        this.maritalstatus = [];
        this.religion = [];
        this.accommodationtype = [];
        this.tenureofproperty = [];
        this.roles = [];
        this.meetingRenderer = null;
        this.refWeightValue = null;
        this.refHeightValue = null;
        this.awsS3client = null;
        this.isdcode = [];
        this.assessmentsource = [];
    }
    decodeAccessToken(token: string): any {
        try {
            return jwtDecode(token)
        }
        catch (Error) {
            return null;
        }
    }

    public authoriseAction(action: string): boolean {
        return this.roleActions.filter(x => x.actionname.toLowerCase() == action.toLowerCase()).length > 0;
    }
}