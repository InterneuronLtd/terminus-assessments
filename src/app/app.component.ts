//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2024  Interneuron Limited

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


import { Component, OnDestroy, Input, ElementRef, ViewChild, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { Subscription, Subject } from 'rxjs';

import { ErrorHandlerService } from '../services/error-handler-service.service';
import { ModuleObservablesService } from '../services/module-observables.service';
import { ApirequestService } from '../services/api-request.service';
import { IconsService } from 'src/services/icons.service';
import { saveAs } from 'file-saver';
import { AppService } from 'src/services/app.service';
import { isArray } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { mapOrder, sortByProperty } from './utilities/sort-by-property.utility';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { CoreFormResponse } from './models/entities/core-form-response.model';
import { ToasterService } from 'src/services/toaster-service.service';
import { MetaFormBuilderForm } from './models/entities/meta-form-builder-form.model';
import { FormGroup, NgForm } from '@angular/forms';
import { FormioHistoryService } from './formio-history-viewer/formio-history-viewer.service';
import { action, filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from './models/synapse-dynamic-api/Filter.model';
import { LazyLoadEvent } from 'primeng/api';
import { Encounter } from './models/entities/core-encounter';
import { FormBuilderFactory } from './formresponse-builder/formresponse.builder.factory';
import { Table } from 'primeng/table';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {

  title = "Assessments Module";

  public subscriptions: Subscription = new Subscription();

  // Variables for page loading functionality
  isLoading: boolean = false;
  isPrinting: boolean = false;
  isDocumentDownloaded: boolean = true;
  showForm: boolean = false;
  isAddEditMode: boolean = false;
  showVersionWarning: boolean = false;

  // Variables for load more functionality
  noOfRecordsToLoad: number;
  totalAssessmentCount: number;

  // Variables for filter functionality
  assessmentTypes: MetaFormBuilderForm[] = [];
  //filteredAssessmentTypes: MetaFormBuilderForm[] = [];
  fltrAssessmentTypes: MetaFormBuilderForm[] = [];
  filter: string = "";
  sortDirection: number = -1; // 1 = ASC; -1 = DESC

  // Variables to load all assessments for a patient
  allAssessments: CoreFormResponse[] = [];
  filteredAssessments: CoreFormResponse[] = [];
  //fltrAssessments: CoreFormResponse[] = [];

  // variables for adding / viewing / editing an assessment
  popupHeader: string = "";
  selectedAssessment: MetaFormBuilderForm = null;
  modalPatientBannerData: any = [];

  // API variables
  bearerAuthToken: string;
  //globalURL: string = this.appService.mod.baseURI;

  //FormIO
  submission: any;
  generatedForm: any;
  formOptions: Object = {
    submitMessage: "",
    disableAlerts: true,
    noAlerts: true,
    readOnly: true
  };
  formResponse: CoreFormResponse;
  triggerRefresh: EventEmitter<unknown>;
  dataObject: any;

  // Variables to control form elements
  @ViewChild("confirmDeleteModal", {static: false}) confirmDeleteModal: ModalDirective;
  @ViewChild("pdfBodyDiv", {static: false}) divPdfBody: ElementRef;
  @ViewChild("resetDeleteFormButton", {static: false}) resetDeleteFormButton: ElementRef;
  @ViewChild("deleteForm", {static: false}) deleteForm: FormGroup;
  
  assessTbl: Table;

 @ViewChild('assessTbl', {static: false}) 
 set content(content: Table) {
    if(content) { // initially setter gets called with undefined
      this.assessTbl = content;
    }
 }

 tableEventState: any = null;
 fromPrevTableState: boolean = false;

  assessmentToDelete: CoreFormResponse = new CoreFormResponse();
  isAssessmentTypeSelected: boolean = false;
  currentFormVersion: number;

  canLoadTable: boolean = false;

  pageNumber: number; 
  pageSize: number; 
  sortColumn: string;
  sortOrder: number; 
  filterColumnComposed: string;
  filterCol: string;
  filterVal: string;

  selectedAssessmentType: MetaFormBuilderForm = new MetaFormBuilderForm();

  @Input() set datacontract(value: any) {
    this.initAppService(value);
  }

  @Output() frameworkAction = new EventEmitter<string>();

  //constructor
  constructor(public appService: AppService,
    public apiRequestService: ApirequestService,
    public errorHandlerService: ErrorHandlerService,
    public moduleObservables: ModuleObservablesService,
    public icons: IconsService,
    public toasterService: ToasterService,
    public formioHistoryService: FormioHistoryService,
    public formBuilderFactory: FormBuilderFactory, 
    private changeDetector: ChangeDetectorRef,
    private elRef: ElementRef) {
    this.subscribeEvents();
  }



  async initAppService(value: any) {
    // Initialise AppService
    this.appService.apiServiceReference = value.apiService;
    this.moduleObservables.unload = value.unload;
    this.appService.contexts = value.contexts;
    this.appService.personId = value.personId;

    //Initialise logged-in user name
    let decodedToken: any;
    this.bearerAuthToken = this.appService.apiServiceReference.authService.user.access_token;
    if (!this.appService.loggedInUserName) {
      decodedToken = this.appService.decodeAccessToken(this.bearerAuthToken);
      if (decodedToken != null) {
        this.appService.loggedInUserName = decodedToken.name ? (isArray(decodedToken.name) ? decodedToken.name[0] : decodedToken.name) : decodedToken.IPUId;
        this.appService.loggedInUserId = decodedToken.IPUId;
      }
    }
    //for running the code locally
    //this.appService.loggedInUserId = "gautam@interneuron.org";
   
    // Initialise module configuration file
    if (!this.appService.moduleConfig) {
      this.subscriptions.add(
        this.apiRequestService.getRequest("./assets/config/terminus-module-assessments.json?v=" + Math.random()).subscribe(
          (response) => {
            this.appService.moduleConfig = response;

            //get actions for rbac
            this.subscriptions.add(this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.getRBACActionsUri, this.createRoleFilter(decodedToken))
              .subscribe((response: action[]) => {
                this.appService.roleActions = response;
              }));

            this.moduleObservables.contextChanged.next();
          }
        )
      );
    }
    else {
      this.moduleObservables.contextChanged.next();
    }
  }

  async ngOnInit() {
    //for running the code locally
    // var value: any = {};
    // value.contexts = JSON.parse("[{\"encounter_id\": \"8d9c5be0-c4ad-4176-9118-3f6d801db552\", \"person_id\": \"8d09d866-498d-4511-8472-ba24ce4e52ca\"}]");
    // value.personId = "8d09d866-498d-4511-8472-ba24ce4e52ca"; //ALLEN, Catherine

    // this.appService.personId = "8d09d866-498d-4511-8472-ba24ce4e52ca";
    // this.appService.contexts = value.contexts;

    // value.apiService = {};
    // value.apiService.authService = {};
    // value.apiService.authService.user = {};
    // let auth = this.apiRequestService.authService;
    // auth.getToken().then(async (token) => {
    //   value.apiService.authService.user.access_token = token;
    //   await this.initAppService(value);
    // });
  }

  // Subscribe to observables
  subscribeEvents() {
    this.subscriptions.add(
      this.moduleObservables.contextChanged.subscribe(
        async () => {
          //this.noOfRecordsToLoad = this.appService.moduleConfig.siteSettings.noOfRecordsToDisplay;
          this.getEncounters();
          //this.getAssessmentTypes(() => this.fetchTotalAssessmentCount(() => {this.canLoadTable = true;}));
          this.getAssessmentTypes(() => {this.canLoadTable = true;});
          
          
        },
        error => this.errorHandlerService.handleError(error)
      ));
  }

  fetchModalPatientBannerData(personId) {
    this.subscriptions.add(
      this.apiRequestService.getRequest(this.appService.moduleConfig.apiEndpoints.personDataForModalBannerUrl + personId)
        .subscribe(
          (response: string) => {
            this.modalPatientBannerData = JSON.parse(response)[0];
          }));
  }

  // getAllAssessmentCount() {
  //   this.subscriptions.add(
  //     this.apiRequestService.getRequest(this.appService.moduleConfig.apiEndpoints.patientAssessmentCountUrl +
  //       this.appService.personId).subscribe(
  //         (response: any) => {
  //           let data = JSON.parse(response);
  //           if (data.length > 0) {
  //             this.totalAssessmentCount = data[0].totalAssessmentCount;
  //           }
  //         }
  //       )
  //   );
  // }

  // onLoadMore() {
  //   this.noOfRecordsToLoad = this.noOfRecordsToLoad + this.appService.moduleConfig.siteSettings.noOfRecordsToDisplay;
  //   this.fetchallAssessments();
  // }

  async getAssessmentTypes(cb:any) {
    this.isLoading = true;
    let formIdsConfigured = this.appService.moduleConfig.siteSettings.formIds;
    var payload: any = [
      {
        "filters": [{
          "filterClause": "(formbuilderform_id in (" + formIdsConfigured + "))"
        }]
      },
      {
        "filterparams": []
      },
      {
        "selectstatement": "SELECT *"
      },
      {
        "ordergroupbystatement": "ORDER BY formname DESC "// Limit " + this.noOfRecordsToLoad
      }
    ];

    this.subscriptions.add(
      this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.assessmentTypesUrl, payload)
        .subscribe(
          (response: MetaFormBuilderForm[]) => {
            this.assessmentTypes = response;
            if (this.assessmentTypes.length > 0) {
              //this.selectedAssessment = this.assessmentTypes[0];
              let formIdsConfiguredArr = formIdsConfigured.split(',').map(rec=> rec.trim().replace(/'/g, ''));
              this.assessmentTypes = mapOrder(this.assessmentTypes, formIdsConfiguredArr,'formbuilderform_id');

              this.fltrAssessmentTypes = [];

              let filteredAssessmentTypes:MetaFormBuilderForm[] = [];

              this.fltrAssessmentTypes = this.assessmentTypes;

              if(this.appService.authoriseAction('assessments_resp_add_edit')){
                let assessmentTypes = this.fltrAssessmentTypes.filter(x => x.formname.toLowerCase() == 'respiratory symptoms assessment');

                if(assessmentTypes.length > 0){
                  assessmentTypes.forEach(element => {
                    if(!filteredAssessmentTypes.find(el => el == element))
                    {
                      filteredAssessmentTypes.push(element);
                    }
                  });
                }
              }

              if(this.appService.authoriseAction('assessments_vte_add_edit')){
                let term = 'vte ';
                let assessmentTypes = this.fltrAssessmentTypes.filter(x => x.formname.toLowerCase().indexOf(term) > -1);
                
                if(assessmentTypes.length > 0){
                  assessmentTypes.forEach(element => {
                    if(!filteredAssessmentTypes.find(el => el == element))
                    {
                      filteredAssessmentTypes.push(element);
                    }
                  });
                }
              }

              if(this.appService.authoriseAction('assessments_resp_view')){
                let assessmentTypes = this.fltrAssessmentTypes.filter(x => x.formname.toLowerCase() == 'respiratory symptoms assessment');

                if(assessmentTypes.length > 0){
                  assessmentTypes.forEach(element => {
                    if(!filteredAssessmentTypes.find(el => el == element))
                    {
                      filteredAssessmentTypes.push(element);
                    }
                  });
                }
              }

              if(this.appService.authoriseAction('assessments_vte_view')){
                let term = 'vte ';
                let assessmentTypes = this.fltrAssessmentTypes.filter(x => x.formname.toLowerCase().indexOf(term) > -1);
                
                if(assessmentTypes.length > 0){
                  assessmentTypes.forEach(element => {
                    if(!filteredAssessmentTypes.find(el => el == element))
                    {
                      filteredAssessmentTypes.push(element);
                    }
                  });
                }
              }

              if(filteredAssessmentTypes.length > 0){
                this.fltrAssessmentTypes = [];
                this.fltrAssessmentTypes = filteredAssessmentTypes;
              }
              
            }

            // Code to disable Completed By Field

            this.assessmentTypes.map(assessment => {
              let formComponents: any[] = JSON.parse(assessment.formcomponents);

              formComponents.map(comp => {
                if (comp.components) {
                  comp.components.map(component => {
                    if (component.key == "completedByName") {
                      component.disabled = true;
                    }
                  });
                }
              });

              assessment.formcomponents = JSON.stringify(formComponents);
            });
            //this.onSelectAll();

            if(cb){
              cb();
            }
            
          }));
  }

  async fetchallAssessments() {
    this.isLoading = true;
    var payload: any = [
      {
        "filters": [{
          "filterClause": "(person_id = @personId) AND ((responsestatus = 'submitted' OR responsestatus = 'Deleted') OR (responsestatus = 'draft' AND _createdby = @createdBy))"
        }]
      },
      {
        "filterparams": [
          {
            "paramName": "personId",
            "paramValue": this.appService.personId
          },
          {
            "paramName": "createdBy",
            "paramValue": this.appService.loggedInUserId
          }
        ]
      },
      {
        "selectstatement": "SELECT *"
      },
      {
        "ordergroupbystatement": "ORDER BY lastupdateddatetime DESC Limit " + this.noOfRecordsToLoad
      }
    ];

    this.subscriptions.add(
      this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.patientAssessmentsUrl, payload)
        .subscribe(
          async (response: any) => {
            this.allAssessments = response;

            if (this.allAssessments.length > 0) {
              this.allAssessments.map(a => {
                let assessmentType = this.assessmentTypes.find(x => x.formbuilderform_id == a.formbuilderform_id);
                if (assessmentType) {
                  a.formname = assessmentType.formname;
                }

                //remove system properties

                delete a._contextkey;
                delete a._createdmessageid;
                delete a._createdsource;
                delete a._recordstatus;
                delete a._row_id;
                delete a._sequenceid;
                delete a._tenant;
                delete a._timezonename;
                delete a._timezoneoffset;

                // Code to disable Completed By Field

                let formComponents: any[] = JSON.parse(a.formcomponents);

                formComponents.map(comp => {
                  if (comp.components) {
                    comp.components.map(component => {
                      if (component.key == "completedByName") {
                        component.disabled = true;
                      }
                    });
                  }
                });

                a.formcomponents = JSON.stringify(formComponents);
              });

              this.filteredAssessments = this.allAssessments;

              this.sortDirection = -1;
              this.sortAssessment("lastupdateddatetime");
            }

            this.isLoading = false;
          }
        )
    );
  }

  /*************** Filter Functionality ***************/

  // getSelectedOptions() {
  //   return this.assessmentTypes
  //     .filter(opt => opt.checked)
  //     .map(opt => opt.category)
  // }

  // filterAssessments() {
  //   let selectedOptions = this.getSelectedOptions();

  //   this.filteredAssessments = this.allAssessments.filter(function (el) {
  //     return selectedOptions.indexOf(el.category) != -1;
  //   });
  // }

  // onSelectAll() {
  //   this.assessmentTypes.forEach((option) => {
  //     option.dataCount = this.allAssessments.filter((fl) => {
  //       return fl.category == option.category;
  //     }).length;
  //     option.checked = option.dataCount > 0;
  //     option.disabled = option.dataCount == 0;
  //   });

  //   this.filterAssessments();
  // }

  // onSelectNone() {
  //   this.assessmentTypes.forEach(function (a) {
  //     a.checked = false;
  //   });

  //   this.filterAssessments();
  // }

  // onCheckboxChanged() {
  //   this.filterAssessments();
  // }

  /*************** Sort Functionality ***************/

  sortAssessment(propertyName) {
    this.filteredAssessments.sort(sortByProperty(propertyName, this.sortDirection));

    this.sortDirection = -1 * this.sortDirection; // 1 = ASC, -1 = DESC
  }

  /*************** Form Events ***************/

  onAssessmentTypeChange() {
    this.isAssessmentTypeSelected = this.selectedAssessment == null;
  }

  async buildDataObject() {
    this.dataObject = JSON.parse('{"data":' + this.formResponse.formresponse + '}');
    this.dataObject["data"]["configBearerAuthToken"] = this.bearerAuthToken;

    this.dataObject["data"]["configGlobalURL"] = this.appService.moduleConfig.apiEndpoints.dynamicApiURI;
    this.dataObject["data"]["configTerminologyURL"] = this.appService.moduleConfig.apiEndpoints.terminologyURI;
    this.dataObject["data"]["configImageServerURL"] = this.appService.moduleConfig.apiEndpoints.imageServerURI;
    this.dataObject["data"]["configCareRecordURL"] = this.appService.moduleConfig.apiEndpoints.careRecordURI;
    this.dataObject["data"]["configPersonId"] = this.appService.personId;
    this.dataObject["data"]["configDynamicApiUrl"] = this.appService.moduleConfig.apiEndpoints.dynamicApiURI;

    this.dataObject["data"]["configUserUsername"] = this.appService.loggedInUserId;
    this.dataObject["data"]["configUserDisplayName"] = this.appService.loggedInUserName;

    this.dataObject["data"]["configUserDisplayName"] = this.appService.loggedInUserName;


    delete this.dataObject["data"]["submit"];

    return this.dataObject;
  }

  async onAddAssessment() {
    this.fromPrevTableState = true;

    if (this.selectedAssessment != null) {

      this.formResponse = new CoreFormResponse();
      this.formResponse.formbuilderresponse_id = uuidv4();
      this.formResponse.formversion = this.selectedAssessment.version;
      this.formResponse.formcomponents = this.selectedAssessment.formcomponents;
      this.formResponse.formversion = this.selectedAssessment.version;
      this.formResponse.responseversion = 0;
      this.formResponse.responsestatus = "New";
      this.formResponse.formresponse = await this.getPreviousFormResponse();
      this.formResponse.person_id = this.appService.personId;
      this.formResponse.formbuilderform_id = this.selectedAssessment.formbuilderform_id;
      this.formResponse.formname = this.selectedAssessment.formname;

      this.formResponse.encounter_id = this.appService.encounterId;

      this.submission = await this.buildDataObject();

      // Prepopulate form values
      await this.prePopulateFormData();

      this.submission["data"]["completedByName"] = this.appService.loggedInUserId;


      this.generatedForm = {
        title: this.selectedAssessment.formname,
        components: JSON.parse(this.selectedAssessment.formcomponents)
      };

      this.showForm = true;

      this.isAddEditMode = true;

      this.showVersionWarning = false;

    }
    else {
      this.isAssessmentTypeSelected = true;
    }
  }

  private async prePopulateFormData() {    

    let latestPlateletResult = await this.apiRequestService.getRequest(this.appService.moduleConfig.apiEndpoints.latestPlateletCountUri + this.appService.personId).toPromise();
    latestPlateletResult = JSON.parse(latestPlateletResult);
    //latestPlateletResult.observationvaluenumeric = 49;

    let latestBMI = await this.apiRequestService.getRequest(this.appService.moduleConfig.apiEndpoints.latestBmiUri + this.appService.personId).toPromise();
    latestBMI = JSON.parse(latestBMI);
    //latestBMI.observationvaluenumeric = 31;

    let latestCancerRecord = await this.apiRequestService.getRequest(this.appService.moduleConfig.apiEndpoints.latestCancerRecordUri + this.appService.personId).toPromise();
    latestCancerRecord = JSON.parse(latestCancerRecord);
    //latestCancerRecord.observationvalue = true;

    let latestVteHistory = await this.apiRequestService.getRequest(this.appService.moduleConfig.apiEndpoints.latestVteHistoryUri + this.appService.personId).toPromise();
    latestVteHistory = JSON.parse(latestVteHistory);
    //latestVteHistory.observationvalue = true;

    let currentPatientAge = await this.apiRequestService.getRequest(this.appService.moduleConfig.apiEndpoints.currentPatientAgeUri + this.appService.personId).toPromise();
    currentPatientAge = JSON.parse(currentPatientAge);      

    // Initialise platelet checkbox
    if (latestPlateletResult.result_id && latestPlateletResult.observationvaluenumeric) {
      //VTE Assessment
      if (this.selectedAssessment.formbuilderform_id == "24add288-6e6b-baa9-97d6-eb472c96dd28") {
        if (latestPlateletResult.observationvaluenumeric < 50) {
          if (!this.submission["data"]["contraIndicationsLMWH"]) {
            this.submission["data"]["contraIndicationsLMWH"] = {};
          }
          this.submission["data"]["contraIndicationsLMWH"]["platelets50X109L"] = true;
        }
      }
      // Reassessments
      else if (this.selectedAssessment.formbuilderform_id == "032fcd09-6979-14f8-4a80-91cb1a94390d" ||
        this.selectedAssessment.formbuilderform_id == "db5a7a0a-3394-6f44-3ed6-df0db7388ca3") {
        if (latestPlateletResult.observationvaluenumeric < 100) {
          if (!this.submission["data"]["contraIndicationsLMWH"]) {
            this.submission["data"]["contraIndicationsLMWH"] = {};
          }
          this.submission["data"]["contraIndicationsLMWH"]["platelets50X109L"] = true;
        }
      }
    }

    // Initialise BMI checkboxes
    if (latestBMI.result_id && latestBMI.observationvaluenumeric) {
      if (latestBMI.observationvaluenumeric >= 30) {
        //VTE Assessment
        if (this.selectedAssessment.formbuilderform_id == "24add288-6e6b-baa9-97d6-eb472c96dd28") {          
          if (!this.submission["data"]["patientRelatedThrombosisRisk"]) {
            this.submission["data"]["patientRelatedThrombosisRisk"] = {};
          }
          this.submission["data"]["patientRelatedThrombosisRisk"]["obesityBmi30KgM"] = true;
        

          if (!this.submission["data"]["contraIndicationsAdditional"]) {
            this.submission["data"]["contraIndicationsAdditional"] = {};
          }
          this.submission["data"]["contraIndicationsAdditional"]["obesity"] = true;
        }
        //Adolescents VTE form
        else if (this.selectedAssessment.formbuilderform_id == "e8b4c163-bf5f-fbaa-7f66-139b026f9e76") {
          if (!this.submission["data"]["patientRelatedThrombosisRisk"]) {
            this.submission["data"]["patientRelatedThrombosisRisk"] = {};
          }
          this.submission["data"]["patientRelatedThrombosisRisk"]["obesity"] = true;
        }
        //VTE Reassessment form
        else if (this.selectedAssessment.formbuilderform_id == "032fcd09-6979-14f8-4a80-91cb1a94390d") {
          if (!this.submission["data"]["patientRelatedThrombosisRisk"]) {
            this.submission["data"]["patientRelatedThrombosisRisk"] = {};
          }
          this.submission["data"]["patientRelatedThrombosisRisk"]["obesityBmi30KgM"] = true;

          if (!this.submission["data"]["contraIndicationsAdditional"]) {
            this.submission["data"]["contraIndicationsAdditional"] = {};
          }
          this.submission["data"]["contraIndicationsAdditional"]["obesity"] = true;
        }
      }
    }

    // Initialise Cancer History Check
    if (latestCancerRecord.result_id && latestCancerRecord.observationvalue && latestCancerRecord.observationvalue == true) {
      //VTE Assessment
      if (this.selectedAssessment.formbuilderform_id == "24add288-6e6b-baa9-97d6-eb472c96dd28") {
        if (!this.submission["data"]["patientRelatedThrombosisRisk"]) {
          this.submission["data"]["patientRelatedThrombosisRisk"] = {};
        }
        this.submission["data"]["patientRelatedThrombosisRisk"]["activeCancerOrCancerTreatmentChemoRadioWithinLast6Months"] = true;

        if (!this.submission["data"]["contraIndicationsAdditional"]) {
          this.submission["data"]["contraIndicationsAdditional"] = {};
        }
        this.submission["data"]["contraIndicationsAdditional"]["activeCancerCancerTreatment"] = true;
      }
      // VTE Reassessment
      if (this.selectedAssessment.formbuilderform_id == "032fcd09-6979-14f8-4a80-91cb1a94390d") {
        if (!this.submission["data"]["patientRelatedThrombosisRisk"]) {
          this.submission["data"]["patientRelatedThrombosisRisk"] = {};
        }
        this.submission["data"]["patientRelatedThrombosisRisk"]["activeCancerOrCancerTreatmentChemoRadioWithinLast6Months"] = true;

        if (!this.submission["data"]["contraIndicationsAdditional"]) {
          this.submission["data"]["contraIndicationsAdditional"] = {};
        }
        this.submission["data"]["contraIndicationsAdditional"]["activeCancerCancerTreatment"] = true;
      }
      //Adolescents VTE form
      else if (this.selectedAssessment.formbuilderform_id == "e8b4c163-bf5f-fbaa-7f66-139b026f9e76") {
        if (!this.submission["data"]["patientRelatedThrombosisRisk"]) {
          this.submission["data"]["patientRelatedThrombosisRisk"] = {};
        }
        this.submission["data"]["patientRelatedThrombosisRisk"]["activeCancerOrCancerTreatment"] = true;
      }
    }

    // Initialise VTE History check
    if (latestVteHistory.result_id && latestVteHistory.observationvalue && latestVteHistory.observationvalue == true) {
      //VTE Assessment
      if (this.selectedAssessment.formbuilderform_id == "24add288-6e6b-baa9-97d6-eb472c96dd28") {
        if (!this.submission["data"]["patientRelatedThrombosisRisk"]) {
          this.submission["data"]["patientRelatedThrombosisRisk"] = {};
        }
        this.submission["data"]["patientRelatedThrombosisRisk"]["personalHistoryOfVte"] = true;

        if (!this.submission["data"]["contraIndicationsAdditional"]) {
          this.submission["data"]["contraIndicationsAdditional"] = {};
        }
        this.submission["data"]["contraIndicationsAdditional"]["previousVte"] = true;
      }
      //VTE reassessment
      if (this.selectedAssessment.formbuilderform_id == "032fcd09-6979-14f8-4a80-91cb1a94390d") {
        if (!this.submission["data"]["patientRelatedThrombosisRisk"]) {
          this.submission["data"]["patientRelatedThrombosisRisk"] = {};
        }
        this.submission["data"]["patientRelatedThrombosisRisk"]["personalHistoryOfVte"] = true;

        if (!this.submission["data"]["contraIndicationsAdditional"]) {
          this.submission["data"]["contraIndicationsAdditional"] = {};
        }
        this.submission["data"]["contraIndicationsAdditional"]["previousVte"] = true;
      }
      //Adolescents VTE form
      else if(this.selectedAssessment.formbuilderform_id == "e8b4c163-bf5f-fbaa-7f66-139b026f9e76") {          
        if (!this.submission["data"]["patientRelatedThrombosisRisk"]) {
          this.submission["data"]["patientRelatedThrombosisRisk"] = {};
        }
        this.submission["data"]["patientRelatedThrombosisRisk"]["personalHistoryOfVteFirstDegreeRelativeWithAHistoryOfVteAged40Yrs"] = true;          
      }
    }

    //Initialise Age checkbox
    if (currentPatientAge.person_id && currentPatientAge.value > 60) {
      // Initial VTE Risk Assessment form
      if (this.selectedAssessment.formbuilderform_id == "24add288-6e6b-baa9-97d6-eb472c96dd28") {
        if (!this.submission["data"]["patientRelatedThrombosisRisk"]) {
          this.submission["data"]["patientRelatedThrombosisRisk"] = {};
        }
        this.submission["data"]["patientRelatedThrombosisRisk"]["ageGt60Yrs"] = true;
      }
      // VTE Reassessment form
      if (this.selectedAssessment.formbuilderform_id == "032fcd09-6979-14f8-4a80-91cb1a94390d") {
        if (!this.submission["data"]["patientRelatedThrombosisRisk"]) {
          this.submission["data"]["patientRelatedThrombosisRisk"] = {};
        }
        this.submission["data"]["patientRelatedThrombosisRisk"]["ageGt60Yrs"] = true;
      }
    }
  }

  async getPreviousFormResponse(): Promise<string> {
    let formResponse = '{"new":"new"}';

    let formSettings = this.appService.moduleConfig.assessmentForms.find(form => form.formId == this.selectedAssessment.formbuilderform_id);
    
    if (formSettings && formSettings.relatedForms) {
      let payload: any = [
        {
          "filters": [{
            "filterClause": "(person_id = @personId) AND (responsestatus = 'submitted') AND formbuilderform_id in (" + formSettings.relatedForms + ")"
          }]
        },
        {
          "filterparams": [
            {
              "paramName": "personId",
              "paramValue": this.appService.personId
            }
          ]
        },
        {
          "selectstatement": "SELECT *"
        },
        {
          "ordergroupbystatement": "ORDER BY lastupdateddatetime desc limit 1"
        }
      ];
  
      let previousFormData = await this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.latestAssessmentResponse, payload).toPromise();
      
      if (previousFormData.length == 1) {
        let tempData = JSON.parse(previousFormData[0].formresponse);
        delete tempData.completedByName;
        delete tempData.position;
        delete tempData.completedDate

        if (tempData &&
          tempData.mobilityAssessment &&
          tempData.mobilityAssessment == "medicalAdmissionNotExpectedToHaveReducedMobilityRelativeToNormalState") {
            return formResponse;
          }

        formResponse = JSON.stringify(tempData);
      }
    }
    
    return formResponse;  
  }
  

  async onViewAssessment(assessment: CoreFormResponse) {
    this.isAddEditMode = false;
    this.fromPrevTableState = true;
    this.formResponse = assessment;

    // Disable components
    var resp = [];
    for (const control of JSON.parse(this.formResponse.formcomponents)) {
      if (control.key == 'submit' || control.key == 'saveAsDraft') {
        control.hidden = true;
      }
      else if (control.type == "table") {
        for (const row of control.rows) {
          for (const item of row) {
            for (const component of item.components) {
              component.disabled = true;
            }
          }
        }
      }
      else {
        control.disabled = true;
      }
      resp.push(control);
    }
    this.formResponse.formcomponents = JSON.stringify(resp);

    this.generatedForm = {
      title: this.formResponse.formname,
      components: JSON.parse(this.formResponse.formcomponents)
    };

    this.submission = await this.buildDataObject();

    this.showForm = true;

    // Version conflict check
    let currentAssessmentForm = this.assessmentTypes.find(x => x.formbuilderform_id == this.formResponse.formbuilderform_id);

    if (currentAssessmentForm && currentAssessmentForm.version != this.formResponse.formversion) {
      this.showVersionWarning = true;
      this.currentFormVersion = currentAssessmentForm.version;
    }
    else {
      this.showVersionWarning = false;
    }
  }

  async onEditAssessment(assessment: CoreFormResponse) {
    this.isAddEditMode = true;
    this.formResponse = assessment;
    this.fromPrevTableState = true;

    // Enable components
    var resp = [];
    for (const control of JSON.parse(this.formResponse.formcomponents)) {
      if (control.key == 'submit' || control.key == 'saveAsDraft') {
        control.hidden = false;
      }
      else if (control.type == "table") {
        for (const row of control.rows) {
          for (const item of row) {
            for (const component of item.components) {
              component.disabled = false;
            }
          }
        }
      }
      else {
        control.disabled = false;
      }
      resp.push(control);
    }
    this.formResponse.formcomponents = JSON.stringify(resp);

    this.generatedForm = {
      title: assessment.formname,
      components: JSON.parse(assessment.formcomponents)
    };

    this.submission = await this.buildDataObject();

    this.submission["data"]["completedByName"] = this.appService.loggedInUserId;
    this.submission["data"]["completedDate"] = new Date();

    this.showForm = true;

    // Version conflict check
    let currentAssessmentForm = this.assessmentTypes.find(x => x.formbuilderform_id == this.formResponse.formbuilderform_id);

    if (currentAssessmentForm && currentAssessmentForm.version != this.formResponse.formversion) {
      this.showVersionWarning = true;
      this.currentFormVersion = currentAssessmentForm.version;
    }
    else {
      this.showVersionWarning = false;
    }
  }

  onConfirmDeleteAssessment(assessment: CoreFormResponse) {
    this.assessmentToDelete = assessment;
    this.confirmDeleteModal.show();
  }

  onDeleteAssessment() {
    this.isLoading = true;
    const deleteionDate: any = new Date();
    this.confirmDeleteModal.hide();
    this.assessmentToDelete.responsestatus = "Deleted";
    //this.assessmentToDelete._createddate = deleteionDate.toJSON().substr(0, 19);

    delete this.assessmentToDelete.formname;

    this.subscriptions.add(
      this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.formBuilderResponsePostUrl, this.assessmentToDelete)
        .subscribe(() => {
          this.assessmentToDelete = new CoreFormResponse();
          //this.fetchTotalAssessmentCount();
          this.fetchAll();
          this.emitFrameworkEvent("REFRESH_BANNER");
          this.resetDeleteForm();
        }));
  }

  onViewAsPDF() {
    this.isPrinting = true;
    this.isDocumentDownloaded = false;
    var mediaType = 'application/pdf';

    setTimeout(() => {
      let pdfDocBody: any = {
        "pdfBodyHTML": this.divPdfBody.nativeElement.innerHTML,
        "pdfCssUrl": this.appService.moduleConfig.siteSettings.pdfCssUrl,
        "pdfFooterHTML": "<div class=\"page-footer\" style=\"width:100%; text-align:right; font-size:6px; margin-right:10px\">Page <span class=\"pageNumber\"></span> of <span class=\"totalPages\"></span></div>"
      };

      this.subscriptions.add(
        this.apiRequestService.getDocumentByPost(this.appService.moduleConfig.apiEndpoints.generatePdfDocumentUrl, pdfDocBody)
          .subscribe(
            (response) => {
              var blob = new Blob([response], { type: mediaType });
              saveAs(blob, this.popupHeader + ".pdf");
              this.isDocumentDownloaded = true;
              this.isPrinting = false;
            },
            error => {
              this.isDocumentDownloaded = true;
              this.errorHandlerService.handleError(error);
              this.isPrinting = false;
            }
          )
      );
    }, 1000);
  }

  onCloseModal() {
    this.popupHeader = "";
    this.fetchTotalAssessmentCount();
    this.fetchAll();
  }

  onSubmit(submission: any) {
    this.formResponse = this.formBuilderFactory.getFormBuilder(this.formResponse.formbuilderform_id).BuildFormResponse(submission, this.formResponse);

    this.subscriptions.add(
      this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.formBuilderResponsePostUrl, this.formResponse)
        .subscribe((response) => {

          this.toasterService.showToaster("Success", "Assessment Saved " + (submission.state == "draft" ? "as draft" : ""));
          // this.fetchTotalAssessmentCount();
          // this.fetchAll();//showform will re-load the list
          this.emitFrameworkEvent("REFRESH_BANNER");
          this.showForm = false;//this will reload the list again
          this.isAddEditMode = false;
        }
    ));
  }

  onRender() {
  }

  onChange(value: any) {
  }

  onCancel(isAddEditMode: boolean) {
    if(isAddEditMode){
      if (confirm("This will cancel any changes, do you want to continue?")) {
        this.generatedForm = null;
        this.showForm = false;
        this.isAddEditMode = false;
      }
    }
    else{
      this.generatedForm = null;
      this.showForm = false;
      this.isAddEditMode = false;
    }
  }

  async onViewHistory() {
    var response = false;
    await this.formioHistoryService.confirm(this.formResponse.formbuilderresponse_id, this.formResponse.formname)
      .then((confirmed) => response = confirmed)
      .catch(() => response = false);
    if (!response) {
      return;
    }
  }

  resetDeleteForm() {
    this.resetDeleteFormButton.nativeElement.click();
  }


  createRoleFilter(decodedToken: any) {
    let condition = "";
    let pm = new filterParams();
    let synapseroles;
    if (this.appService.moduleConfig.siteSettings.prodbuild)
      synapseroles = decodedToken.SynapseRoles
    else
      synapseroles = decodedToken.client_SynapseRoles
    if (!isArray(synapseroles)) {
      condition = "rolename = @rolename";
      pm.filterparams.push(new filterparam("rolename", synapseroles));
    }
    else
      for (var i = 0; i < synapseroles.length; i++) {
        condition += "or rolename = @rolename" + i + " ";
        pm.filterparams.push(new filterparam("rolename" + i, synapseroles[i]));
      }
    condition = condition.replace(/^\or+|\or+$/g, '');
    let f = new filters();
    f.filters.push(new filter(condition));


    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY 1");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  // Inherited methods
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.moduleObservables.unload.next("app-assessments-module");
  }

  loadAssessments(lazyEvent: LazyLoadEvent){
    let filterColumn: string = null;
    
    //Session pf primeng table can handle - but make sure this works on primeng upgrade
    //this.manageTableState(lazyEvent);
    //let event = this.tableEventState;
    //Uncommennt above two lines and comment below line if inbuilt primeng table session does not work
    let event = lazyEvent;

    this.filterCol = '';
    this.filterVal = '';
    
    if(event && event.filters && event.filters.formname &&  event.filters.formname.value && event.filters.formname.value.formbuilderform_id){
      filterColumn = `formbuilderform_id='${event.filters.formname.value.formbuilderform_id}'`;
      this.filterCol = 'formbuilderform_id';
      this.filterVal = event.filters.formname.value.formbuilderform_id;
    }

    this.pageNumber =  (event.first/ event.rows);
    this.pageSize = event.rows;
    this.sortColumn = event.sortField;
    this.sortOrder = event.sortOrder;
    this.filterColumnComposed = filterColumn;

    this.fetchTotalAssessmentCount();
    this.fetchAll();
  }

  manageTableState(lazyEvent: LazyLoadEvent) {
    this.changeDetector.detectChanges();

    if(this.tableEventState && this.fromPrevTableState){
      this.assessTbl.filters = this.tableEventState.filters;
      this.assessTbl.first = this.tableEventState.first;
      this.assessTbl.rows = this.tableEventState.rows;
      this.assessTbl.sortField = this.tableEventState.sortField;
      this.assessTbl.sortOrder = this.tableEventState.sortOrder;
      //Unable to find the exact method to refresh - Resorted to direct dom manipulation
      let th = this.elRef.nativeElement.querySelector(`th[ng-reflect-field="${this.tableEventState.sortField}"]`);
      let thICon = this.elRef.nativeElement.querySelector(`th[ng-reflect-field="${this.tableEventState.sortField}"]  p-sorticon i`);
      if(th && thICon) {
        th.className  = `${th.className} p-highlight`;
        thICon.className  = `${thICon.className} ${this.sortOrder == -1}? pi-sort-amount-down-alt: pi-sort-amount-up-alt`;
      }
    }
    else {
      this.tableEventState = lazyEvent;
    }
    this.fromPrevTableState = false;
  }

  fetchAll() {
    let pageNumber = this.pageNumber;
    let pageSize = this.pageSize; 
    let sortColumn = this.sortColumn; 
    let sortOrder = this.sortOrder; 
    let filterColumn = this.filterColumnComposed;

    this.isLoading = true;

    if(!filterColumn && this.fltrAssessmentTypes && this.fltrAssessmentTypes.length > 0){
      this.fltrAssessmentTypes.forEach(element => {
        if(!filterColumn){
          filterColumn = `formbuilderform_id='${element.formbuilderform_id}'`;
        }
        else{
          filterColumn = filterColumn + ' OR ' + `formbuilderform_id='${element.formbuilderform_id}'`;
        }
      });
    }
    
    var payload: any = [
      {
        "filters": [{
          "filterClause": "(person_id = @personId) AND ((responsestatus = 'submitted' OR responsestatus = 'Deleted') OR (responsestatus = 'draft' AND _createdby = @createdBy))"
        }]
      },
      {
        "filterparams": [
          {
            "paramName": "personId",
            "paramValue": this.appService.personId
          },
          {
            "paramName": "createdBy",
            "paramValue": this.appService.loggedInUserId
          }
        ]
      },
      {
        "selectstatement": "SELECT *"
      },
      {
        "ordergroupbystatement": "ORDER BY createddatetime DESC"
      }
    ];

    let objDic = {};

    this.assessmentTypes.forEach(assessmentType => {
      
      if(assessmentType.formbuilderform_id)
        objDic[assessmentType.formbuilderform_id] = assessmentType.formname;
    });

    let offSet = pageNumber * pageSize;
    let limit = pageSize;

    let defaultSortCol = sortColumn;
    sortColumn = sortColumn || 'createddatetime';
    let orderBy = !defaultSortCol ? `${sortColumn} desc` : (sortOrder == 1 ? 
      `${sortColumn} asc, createddatetime asc` : `${sortColumn} desc, createddatetime desc`);

    let url: string = `${this.appService.moduleConfig.apiEndpoints.patientAssessmentsUrl}/${orderBy}/${limit}/${offSet}`;
    
    if(filterColumn)
      url = `${this.appService.moduleConfig.apiEndpoints.patientAssessmentsUrl}/${orderBy}/${limit}/${offSet}/${filterColumn}`;

    this.subscriptions.add(
      this.apiRequestService.postRequest(`${url}`, payload)
        .subscribe(
          (response: any) => {
            let fetchedAssessments = response;

            if(fetchedAssessments) {
              this.filteredAssessments = fetchedAssessments.map(rec=> {
                
                //remove system properties

                delete rec._contextkey;
                delete rec._createdmessageid;
                delete rec._createdsource;
                delete rec._recordstatus;
                delete rec._row_id;
                delete rec._sequenceid;
                delete rec._tenant;
                delete rec._timezonename;
                delete rec._timezoneoffset;
                
                rec.formname = objDic[rec.formbuilderform_id];
                  
                  let components = rec.formcomponents ? JSON.parse(rec.formcomponents) : '';
                  
                  if(components && Array.isArray(components)) {
                    const formcomponentsObj  = components.map(comp=>{
                      if(comp && comp.key == 'completedByName')
                        comp.disabled = true;
                      return comp;
                    });

                    rec.formcomponents = JSON.stringify(formcomponentsObj);
                  }

                  return rec;
              });
            }
            else{
              this.filteredAssessments = [];
            }

            // if(this.filteredAssessments.length > 0){
              
            //   let fltrAssessments = [];

            //   if(this.appService.authoriseAction('assessments_resp_view')){
            //     let assessments = this.filteredAssessments.filter(x => x.formname.toLowerCase() == 'respiratory symptoms assessment');
  
            //     if(assessments.length > 0){
            //       assessments.forEach(element => {
            //         fltrAssessments.push(element);
            //       });
            //     }
            //   }
  
            //   if(this.appService.authoriseAction('assessments_vte_view')){
            //     let term = 'vte ';
            //     let assessments = this.filteredAssessments.filter(x => x.formname.toLowerCase().indexOf(term) > -1);
  
            //     if(assessments.length > 0){
            //       assessments.forEach(element => {
            //         fltrAssessments.push(element);
            //       });
            //     }
            //   }
  
            //   if(fltrAssessments.length > 0)
            //   {
            //     this.filteredAssessments = [];
            //     this.filteredAssessments = fltrAssessments;
            //   }
            // }
 
            this.isLoading = false;
          }
        )
    );
  }


  fetchTotalAssessmentCount(cb?:any) {
    let filter = '';

    let filterParams = [
      {
        "paramName": "personId",
        "paramValue": this.appService.personId
      },
      {
        "paramName": "createdBy",
        "paramValue": this.appService.loggedInUserId
      }
    ];

    if(!this.filterCol && this.fltrAssessmentTypes && this.fltrAssessmentTypes.length > 0){
      for (var i = 0; i < this.fltrAssessmentTypes.length; i++) {
        filter = filter ? filter + " or formbuilderform_id = @formbuilderform_id" + i + " " : " formbuilderform_id = @formbuilderform_id" + i + "";
        filterParams.push(new filterparam("formbuilderform_id" + i, this.fltrAssessmentTypes[i].formbuilderform_id));
      }
    }
    else {
      if(this.filterCol){
        filter = " formbuilderform_id = '" + this.filterVal + "' ";
        // filterParams.push({
        //   "paramName": this.filterCol,
        //   "paramValue": this.filterVal
        // });
      }
    }

    let filterClause = "(person_id = @personId) AND ((responsestatus = 'submitted' OR responsestatus = 'Deleted') OR (responsestatus = 'draft' AND _createdby = @createdBy))"

    if(filter){
      filterClause = "(person_id = @personId) AND (" + filter + ") AND ((responsestatus = 'submitted' OR responsestatus = 'Deleted') OR (responsestatus = 'draft' AND _createdby = @createdBy))"
    }

    let filters = [{
      "filterClause": filterClause
    }];

    // if(this.filterCol) {
    //   filterParams.push({
    //       "paramName": this.filterCol,
    //       "paramValue": this.filterVal
    //     });
    // }

    var payload: any = [
      {
        "filters": filters
      },
      {
        "filterparams": filterParams
      },
      {
        "selectstatement": "SELECT *"
      },
      {
        "ordergroupbystatement": "ORDER BY createddatetime DESC"
      }
    ];

    this.subscriptions.add(
      this.apiRequestService.postRequest(`${this.appService.moduleConfig.apiEndpoints.patientAssessmentsUrl}`, payload)
        .subscribe(
          (response: any) => {
            this.allAssessments = response;

            // let fltrAssessments = [];

            // let objDic = {};

            // this.assessmentTypes.forEach(assessmentType => {
              
            //   if(assessmentType.formbuilderform_id)
            //     objDic[assessmentType.formbuilderform_id] = assessmentType.formname;
            // });

            // this.allAssessments.map(rec=> {
            //   rec.formname = objDic[rec.formbuilderform_id];
            // });

            // if(this.allAssessments.length > 0){
            //   if(this.appService.authoriseAction('assessments_resp_view')){
            //     let assessments = this.allAssessments.filter(x => x.formname.toLowerCase() == 'respiratory symptoms assessment');
  
            //     if(assessments.length > 0){
            //       assessments.forEach(element => {
            //         fltrAssessments.push(element);
            //       });
            //     }
            //   }
  
            //   if(this.appService.authoriseAction('assessments_vte_view')){
            //     let term = 'vte ';
            //     let assessments = this.allAssessments.filter(x => x.formname.toLowerCase().indexOf(term) > -1);
  
            //     if(assessments.length > 0){
            //       assessments.forEach(element => {
            //         fltrAssessments.push(element);
            //       });
            //     }
            //   }
  
            //   if(fltrAssessments.length > 0)
            //   {
            //     this.allAssessments = [];
            //     this.allAssessments = fltrAssessments;
            //   }
            // }

            if (this.allAssessments.length > 0) {
              this.totalAssessmentCount = this.allAssessments.length;
            }
            else{
              this.totalAssessmentCount = 0;
            }

            if(cb){
              cb();
            }
          }
        )
    );
  }

  getEncounters() {

    let url = `${this.appService.moduleConfig.apiEndpoints.dynamicApiURI}/GetBaseViewListByPost/bv_core_inpatientappointments`;

    this.apiRequestService.postRequest(url, this.createEncounterFilter())
      .subscribe(encList => {
       if (encList && Array.isArray(encList) && encList.length > 0) {
          let encountersFromSvc: Encounter[] = [];

          let activeInpatientEncounter = encList.filter(rec => rec.patientclasscode && (rec.patientclasscode.toLowerCase() == 'ip' || rec.patientclasscode.toLowerCase() == 'i') 
                                                        && rec.dischargedatetime == null
                                                        && rec.episodestatuscode && rec.episodestatuscode.toLowerCase() != 'cancelled');

          this.appService.encounterId = null;

          if(activeInpatientEncounter && activeInpatientEncounter.length > 0){
            this.appService.encounterId = activeInpatientEncounter[0].encounter_id;
          }
         
        } 
        else {
          this.appService.encounterId = null;
         
        }

      });
  }

  createEncounterFilter() {

    let condition = "person_id=@person_id";
    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();

    pm.filterparams.push(new filterparam("person_id", this.appService.personId));

    let select = new selectstatement("SELECT person_id, encounter_id, admitdatetime, dischargedatetime, patientclasscode, episodestatuscode");

    let orderby = new orderbystatement("ORDER BY admitdatetime desc");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  emitFrameworkEvent(e: string) {
    this.frameworkAction.emit(e);
  }
}

