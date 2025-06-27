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
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { MetaFormBuilderForm } from 'src/app/models/entities/meta-form-builder-form.model';
import { ApirequestService } from 'src/services/api-request.service';
import { AppService } from 'src/services/app.service';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from 'src/services/notification.service';
import { Assessor } from '../models/entities/core-encounter';
import { CoreFormResponse } from '../models/entities/core-form-response.model';
import { filter, filterParams, filterparam, filters, orderbystatement, selectstatement } from '../models/synapse-dynamic-api/Filter.model';
import { DataRequest } from 'src/services/datarequest';
import * as moment from 'moment';
import { SubjectsService } from 'src/services/subjects.service';

@Component({
  selector: 'app-app-assessment-scheduler',
  templateUrl: './app-assessment-scheduler.component.html',
  styleUrls: ['./app-assessment-scheduler.component.css']
})
export class AppAssessmentSchedulerComponent implements OnInit {
  @Input() client: any;
  @Input() selectedAssessment: MetaFormBuilderForm;
  @Input() reScheduleAsessment: CoreFormResponse;
  @Output() closeEvent = new EventEmitter<boolean>();
  private subscriptions: Subscription = new Subscription();
  // public variables
  public minDate: Date;
  public startTime: Date;
  public endTime: Date;
  public assessmentDate: Date;
  public assessmentTypes: any = [];
  public assessmentAssessors: any = [];
  public selectedAssessorName: any;
  public assessors: any = [];
  public filteredAssessor: any = [];
  public showsearch = false;
  public searchedAssessor: any;
  public originalAssessor: any;
  public selectedService: string = "";
  public assessmentsource_id: string;
  public assessmentSource: any;
  public showOtherAssessmentSource: boolean = false;
  public showAssessmentSourceControl: boolean = false;
  public otherassessmentsource: string;
  public selectedCommissionerId: string;
  errorMessage: string = "";
  loading=false;

  constructor(private apiRequestService: ApirequestService,
    private appService: AppService,
    private notificationService: NotificationService,
    private dr: DataRequest,
    private subjects: SubjectsService,
    private cb: ChangeDetectorRef) {
    this.minDate = new Date();
    this.subscriptions.add(this.subjects.secondaryModuleClosed.subscribe((e: boolean) => {
      this.getSelectedCommissior();
    }));
  }
  ngOnInit() {
    this.assessmentDate = new Date();
    this.startTime = new Date();
    if (this.startTime.getMinutes() > 30) {
      this.startTime.setHours(this.startTime.getHours() + 1, 0, 0);
    }
    else {
      this.startTime.setHours(this.startTime.getHours(), 30, 0);
    }
    this.endTime = new Date(this.startTime);
    this.endTime.setHours(this.startTime.getHours(), this.startTime.getMinutes() + 30, 0);
    if(this.reScheduleAsessment) {
      this.startTime = moment(this.reScheduleAsessment.startdatetime).toDate();
      this.endTime = moment(this.reScheduleAsessment.enddatetime).toDate();
      this.assessmentDate= moment(this.reScheduleAsessment.startdatetime).toDate(); 
    } 
    if(this.appService.moduleConfig.Environment == "social_care") {
      this.getSelectedCommissior();
      this.getAssessar();
    } 
    
    
  }
  getSelectedCommissior() {
    this.dr.getClient((client) => {
      this.selectedCommissionerId = client.__personCommissioner[0].commissioner_id;
      // if(this.selectedCommissionerId == '9ef56fac-520a-4d2a-9524-0281c58d31ac') {
      //   this.showAssessmentSourceControl = true
      // }
      // else {
      //   this.showAssessmentSourceControl = false;
      // }
      this.getAssessmentSource();
    });
  }
  getAssessar() {
    this.subscriptions.add(
      this.apiRequestService.getRequest(`${this.appService.moduleConfig.apiEndpoints.getAssessorUri}`)
        .subscribe(
          (response: any) => {
             let responseArray = JSON.parse(response);
             this.assessors= [];
            for (let r of responseArray) {
              r.__fullname= r.firstname + " "  + (r.middlename ||'') + " " + r.surname;
              this.assessors.push(r);
            }
            if (this.reScheduleAsessment) {
              let ass = this.assessors.find(x => x.assessorid == this.reScheduleAsessment.assessorid);
              if (ass) {
                this.searchedAssessor = ass;
                this.originalAssessor = ass;
              }
            }
          }
        )
    );
  }
  getAssessmentSource() {
    this.subscriptions.add(
      this.apiRequestService.getRequest(`${this.appService.moduleConfig.apiEndpoints.getAssessmentSource + this.selectedCommissionerId}`)
        .subscribe(
          (response: any) => {
             this.assessmentSource = JSON.parse(response);
            //  this.assessmentSource = this.assessmentSource.filter(x => x.commissioner_id == this.selectedCommissionerId);
             if(this.assessmentSource.length > 0) {
              this.showAssessmentSourceControl = true;
             }
             else {
              this.showAssessmentSourceControl = false;
             }
             this.assessmentsource_id = '';
             if (this.reScheduleAsessment) {
              let assessmentsource = this.assessmentSource.find(x => x.assessmentsource_id == this.reScheduleAsessment.assessmentsourceid);
              if (assessmentsource) {
                this.assessmentsource_id = assessmentsource.assessmentsource_id;
                if(this.assessmentsource_id == 'be10767b-9d08-45cc-a260-e981f50a8d64') {
                  this.showOtherAssessmentSource = true;
                  this.otherassessmentsource = this.reScheduleAsessment.otherassessmentsource;
                }
                else {
                  this.showOtherAssessmentSource = false;
                }
              }
            }
            this.cb.detectChanges();
          }
        )
    );
  }
  onSourceChange(event) {
    if(event.target.value == 'be10767b-9d08-45cc-a260-e981f50a8d64') {
      this.showOtherAssessmentSource = true;
    }
    else {
      this.showOtherAssessmentSource = false;
    }
  }
  filterAssessor(event) {
    let filtered: any[] = [];
    let query = event.query;
    for (let i = 0; i < this.assessors.length; i++) {
      let aaa = this.assessors[i];
      let fullname = aaa.firstname + ' ' + (aaa.middlename? aaa.middlename + ' ': '') + aaa.surname;
      if ((aaa.firstname || '').toLowerCase().indexOf(query.toLowerCase()) == 0 || (aaa.middlename || '').toLowerCase().indexOf(query.toLowerCase()) == 0 || (aaa.surname || '').toLowerCase().indexOf(query.toLowerCase()) == 0 || (fullname || '').toLowerCase().indexOf(query.toLowerCase()) == 0) {
        filtered.push(aaa);
      }
    }
    this.filteredAssessor = filtered;
  }
  createform() {
    if(!this.assessmentDate || !this.startTime || !this.endTime) {
      this.errorMessage = "Please fill all mandatory fields";
      return;
    }
    if (!(this.searchedAssessor instanceof Object)) {
      this.errorMessage = "Please fill all mandatory fields";
      return;
    }
    if(this.selectedCommissionerId == '9ef56fac-520a-4d2a-9524-0281c58d31ac') {
      if(this.assessmentsource_id == 'be10767b-9d08-45cc-a260-e981f50a8d64') {
        if (!(this.assessmentsource_id)) {
          // if(this.showOtherAssessmentSource && this.otherassessmentsource) {
            this.errorMessage = "Please fill all mandatory fields";
            return;
          // }
        }
        if (this.assessmentsource_id) {
          if(this.showOtherAssessmentSource && !this.otherassessmentsource && this.otherassessmentsource == undefined) {
            this.errorMessage = "Please fill all mandatory fields";
            return;
          }
        }
      }
      else {
          if (!(this.assessmentsource_id)) {
              this.errorMessage = "Please fill all mandatory fields";
              return;
          }
      }
    }
    
    
    this.errorMessage = "";
    this.loading=true;
    let startDatetime = new Date(this.assessmentDate.getFullYear(), this.assessmentDate.getMonth(), this.assessmentDate.getDate());
    startDatetime.setHours(this.startTime.getHours(), this.startTime.getMinutes(), this.startTime.getSeconds());

    let endDatetime = new Date(this.assessmentDate.getFullYear(), this.assessmentDate.getMonth(), this.assessmentDate.getDate());
    endDatetime.setHours(this.endTime.getHours(), this.endTime.getMinutes(), this.endTime.getSeconds());

    this.assessmentDate.setHours(this.startTime.getHours(), this.startTime.getMinutes(), this.startTime.getSeconds())
    let formBuilderResponse: CoreFormResponse
    formBuilderResponse = new CoreFormResponse();
    if (this.reScheduleAsessment == null) {
      formBuilderResponse.formbuilderresponse_id = uuidv4();
      formBuilderResponse.createdby = this.appService.loggedInUserName;
    }
    else {
      formBuilderResponse.formbuilderresponse_id = this.reScheduleAsessment.formbuilderresponse_id;
      formBuilderResponse.updatedby = this.appService.loggedInUserName;
    }
    formBuilderResponse._createdby = this.searchedAssessor.firstname + " " + this.searchedAssessor.surname;
    formBuilderResponse._createdsource = "RROTA Assessments Module";
    formBuilderResponse.person_id = this.appService.personId;
    formBuilderResponse.formbuilderform_id = this.selectedAssessment.formbuilderform_id;
    formBuilderResponse.formversion = this.selectedAssessment.version;
    formBuilderResponse.formcomponents = this.selectedAssessment.formcomponents;
    formBuilderResponse.formresponse = '{"new": "new"}';
    formBuilderResponse.responseversion = 0;
    formBuilderResponse.responsemeta = null;
    formBuilderResponse.responsestatus = "New";
    formBuilderResponse.createddatetime = this.getJsonDate(new Date());
    formBuilderResponse.lastupdateddatetime = this.getJsonDate(new Date());
    formBuilderResponse.assessorid=this.searchedAssessor.assessorid;
    formBuilderResponse.startdatetime = this.getJsonDate(startDatetime);
    formBuilderResponse.enddatetime = this.getJsonDate(endDatetime);
    formBuilderResponse.assessmentsourceid = this.assessmentsource_id ? this.assessmentsource_id : null;
    formBuilderResponse.otherassessmentsource = this.otherassessmentsource ? this.otherassessmentsource : null;

    if(this.appService.moduleConfig.Environment == "social_care") {
      this.prePopulateClientData(formBuilderResponse, (submission) => {

        formBuilderResponse.formresponse = JSON.stringify(submission["data"]);;
    
          this.subscriptions.add(this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.formBuilderResponsePostUrl, formBuilderResponse)
            .subscribe(
              async () => {
                let clientDetails = await firstValueFrom(this.apiRequestService.getRequest(this.appService.moduleConfig.apiEndpoints.getClientCommunicationUri + this.appService.personId));
                clientDetails = JSON.parse(clientDetails);
                if (clientDetails != null && clientDetails.person_id) {
                  if (this.reScheduleAsessment == null) {
                    await this.notificationService.notifyClient(formBuilderResponse.formbuilderresponse_id,
                      this.convertDateToString24Hrs(startDatetime),
                      clientDetails.title + " " + clientDetails.surname,
                      clientDetails.email,
                      clientDetails.phonenumber,
                      this.selectedAssessment.formname,
                      this.searchedAssessor.firstname + " " + this.searchedAssessor.surname);
                  }
                  else {
                    await this.notificationService.rescheduleNotifyClient(formBuilderResponse.formbuilderresponse_id,
                      moment(this.reScheduleAsessment.startdatetime).format("DD/MM/YYYY HH:mm"),
                      this.convertDateToString24Hrs(startDatetime),
                      clientDetails.title + " " + clientDetails.surname,
                      clientDetails.email,
                      clientDetails.phonenumber,
                      this.selectedAssessment.formname,
                      this.originalAssessor.firstname + " " + this.originalAssessor.surname,
                      this.searchedAssessor.firstname + " " + this.searchedAssessor.surname);
                  }
    
                }
                this.loading=false;
                this.closeEvent.emit(true);
              }
            )
          );
        });
    }
    
  }
  prePopulateClientData(formBuilderResponse, cb) {
    let submission = JSON.parse('{"data":' + formBuilderResponse.formresponse + '}')
    this.dr.getClient((client) => {
      this.dr.getHeightWeight(() => {
        if (client) {
          submission["data"]["title"] = client.titlecode;
          submission["data"]["firstName1"] = client.firstname;
          submission["data"]["middleName"] = client.middlename
          submission["data"]["surname1"] = client.familyname
          submission["data"]["dateTime"] = client.dateofbirth;

          let phone = client.__personContactInfos.find(x => x.contacttypecode == "phone");
          let email = client.__personContactInfos.find(x => x.contacttypecode == "email");
          if (phone) {
            if(phone.contactdetails.indexOf("|") > -1){
              let arrContactDetails = phone.contactdetails.split("|");
              submission["data"]["isdCode"] = arrContactDetails[0];
              submission["data"]["telephoneNumber"] = arrContactDetails[1];
            }
            else{
              submission["data"]["telephoneNumber"] = phone.contactdetails;
            }
          }
          if (email) {
            submission["data"]["emailAddress"] = email.contactdetails;
          }
          submission["data"]["maritalStatus"] = client.maritalstatuscode;
          submission["data"]["gender"] = client.gendercode;
          submission["data"]["ethenicGroup"] = client.ethnicitycode;
         // submission["data"]["religion"] = client.religioncode;
          submission["data"]["whatIsYourFirstLanguage"] = client.primarylanguagecode;
          if (client.__extendedPerson.length > 0) {
            submission["data"]["doYouSpeakAnyOtherLanguagesSpoken"] = client.__extendedPerson[0].otherlanguage;
          }
          if (client.interpreterrequired == "1")
            submission["data"]["doYouRequireATranslator"] = "yes";

          if (client.interpreterrequired == "0")
            submission["data"]["doYouRequireATranslator"] = "no";

          submission["data"]["editGridPersonalInformation1"] = [];
          if (client.__personAddresses && client.__personAddresses.length > 0) {
            submission["data"]["address3"] = client.__personAddresses[0].line1;
            submission["data"]["address4"] = client.__personAddresses[0].line2;
            submission["data"]["city1"] = client.__personAddresses[0].city;
            submission["data"]["county"] = client.__personAddresses[0].countystateprovince;
            submission["data"]["postcode"] = client.__personAddresses[0].postcodezip;
          }
          let houseHoldMemberList = [];
          if (client.__nextOfKins) {
            for (var i = 0; i < client.__nextOfKins.length; i++) {
              let ifNotExist = houseHoldMemberList.find(x => x.setid == client.__nextOfKins[i].setid);
              if (!ifNotExist) {
                houseHoldMemberList.push(client.__nextOfKins[i]);
              }
            }
            for (var i = 0; i < houseHoldMemberList.length; i++) {
              let kin = client.__nextOfKins.filter(x => x.setid == houseHoldMemberList[i].setid);
              kin.forEach((item) => {
                if (item.contactrolecode == "MC") {
                  houseHoldMemberList[i].__maincarer = item.contactrolecode;
                }
                if (item.contactrolecode == "NOK") {
                  houseHoldMemberList[i].__nexofkin = item.contactrolecode;
                }
                if (item.contactrolecode == "EC") {
                  houseHoldMemberList[i].__emergencycontact = item.contactrolecode;
                }
              });
            }

            for (var i = 0; i < houseHoldMemberList.length; i++) {
              let mainCare = '';
              let nextOfKin = '';
              let emergencyContact5 = '';
              let presentForAssessment = '';
              if (houseHoldMemberList[i].__maincarer == 'MC') {
                mainCare = 'yes';
              }
              if (houseHoldMemberList[i].__nexofkin == 'NOK') {
                nextOfKin = 'yes';
              }
              if (houseHoldMemberList[i].__emergencycontact == 'EC') {
                emergencyContact5 = 'yes';
              }
              var age = moment(houseHoldMemberList[i].dob, "DD-MM-YYYY");
              submission["data"]["editGridPersonalInformation1"].push({
                "name2": (houseHoldMemberList[i].givenname || '') + ' ' + (houseHoldMemberList[i].middlename || '') + ' ' + (houseHoldMemberList[i].familyname || ''),
                "relationship1": houseHoldMemberList[i].relationship,
                "age1": age.isValid() ? age.toDate() : "",
                "mainCare": mainCare,
                "nextOfKin": nextOfKin,
                "emergencyContact5": emergencyContact5,
                "presentForAssessment": presentForAssessment,
                "notes": houseHoldMemberList[i].notes
              });
            }
          }
          if (client.__personIdentifiers.length > 0) {
            let nhsNumber = client.__personIdentifiers.find(x => x.idtypecode == "NHS");
            if (nhsNumber) {
              submission["data"]["nhsNumber"] = nhsNumber.idnumber;
            }
          }
          if (client.__extendedPerson.length > 0) {
            submission["data"]["email2"] = client.__extendedPerson[0].organisationemail;
          }
          submission["data"]["editGridCareTeam1"] = [];

          if (client.__careTeam.length > 0) {
            for (var i = 0; i < client.__careTeam.length; i++) {
              submission["data"]["editGridCareTeam1"].push({
                "role1": client.__careTeam[i].roletext,
                "name3": (client.__careTeam[i].firstname || '') + " " + (client.__careTeam[i].middlename || '') + " " + (client.__careTeam[i].familyname || ''),
                "telephone1": client.__careTeam[i].telecom,
                "email3": client.__careTeam[i].email,
                "nameOfFormalCarersEmployer": client.__careTeam[i].orgnisationname
              });
            }
          }
          if (client.__extendedPerson.length > 0) {
            submission["data"]["gpName"] = (client.__extendedPerson[0].pcpgivenname || '') + " " + (client.__extendedPerson[0].pcpfamilyname || '');
            submission["data"]["gpPhoneNumber"] = client.__extendedPerson[0].organisationcontactinfo || '';
            submission["data"]["email2"] = client.__extendedPerson[0].organisationemail || '';
            submission["data"]["gpAddress"] = (client.__extendedPerson[0].pcpaddressline1 || '') + ' ' + (client.__extendedPerson[0].pcpaddressline3 || '') + ' ' + (client.__extendedPerson[0].pcpaddressline4 || '') + ' ' + (client.__extendedPerson[0].pcpaddresspostcode || '');
          }

          submission["data"]["height"] = this.appService.refHeightValue || '';
          submission["data"]["weight"] = this.appService.refWeightValue || '';
          cb(submission);
        } else {
          cb(submission);
        }
      });

    });

  }

  onCancel() {
    this.closeEvent.emit(true);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  public getJsonDate(dateObject: Date): string {
    if (!dateObject) {
      return null;
    }
    let year = dateObject.getFullYear();
    let month = ('0' + (dateObject.getMonth() + 1)).slice(-2);
    let date = ('0' + dateObject.getDate()).slice(-2);
    let hours = ('0' + dateObject.getHours()).slice(-2);
    let minutes = ('0' + dateObject.getMinutes()).slice(-2);
    let seconds = ('0' + dateObject.getSeconds()).slice(-2);
    return `${year}-${month}-${date}T${hours}:${minutes}:${seconds}`;
  }

  public convertDateToString24Hrs(dateObject: Date): string {
    if (!dateObject) {
      return null;
    }
    let year = dateObject.getFullYear();
    let month = ('0' + (dateObject.getMonth() + 1)).slice(-2);
    let date = ('0' + dateObject.getDate()).slice(-2);
    let hours = ('0' + dateObject.getHours()).slice(-2);
    let minutes = ('0' + dateObject.getMinutes()).slice(-2);
    let seconds = ('0' + dateObject.getSeconds()).slice(-2);
    return `${date}/${month}/${year} ${hours}:${minutes} Hrs`;
  }
}
