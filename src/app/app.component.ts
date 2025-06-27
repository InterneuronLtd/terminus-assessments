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
// Interneuron Terminus
// Copyright(C) 2023  Interneuron Holdings Ltd
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// See the
// GNU General Public License for more details.
// You should have received a copy of the GNU General Public License
// along with this program.If not, see<http://www.gnu.org/licenses/>.

import { Component, OnDestroy, Input, ElementRef, ViewChild, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { Subscription, Subject, firstValueFrom } from 'rxjs';

import { ErrorHandlerService } from '../services/error-handler-service.service';
import { ModuleObservablesService } from '../services/module-observables.service';
import { ApirequestService } from '../services/api-request.service';
import { IconsService } from 'src/services/icons.service';
import { saveAs } from 'file-saver';
import { AppService } from 'src/services/app.service';
// import { isArray } from 'util';
import * as util from 'util';
import { v4 as uuidv4 } from 'uuid';
import { mapOrder, sortByProperty } from './utilities/sort-by-property.utility';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { CoreFormResponse, CoreFormresponsemediaversion } from './models/entities/core-form-response.model';
import { ToasterService } from 'src/services/toaster-service.service';
import { MetaFormBuilderForm } from './models/entities/meta-form-builder-form.model';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { FormioHistoryService } from './formio-history-viewer/formio-history-viewer.service';
import { action, filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from './models/synapse-dynamic-api/Filter.model';
import { LazyLoadEvent } from 'primeng/api';
import { CorePerson, Encounter } from './models/entities/core-encounter';
import { FormBuilderFactory } from './formresponse-builder/formresponse.builder.factory';
import { Table } from 'primeng/table';
import { DataRequest } from 'src/services/datarequest';
import { environment } from 'src/environments/environment';
import { NotificationService } from 'src/services/notification.service';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import * as moment from 'moment';
import * as $ from 'jquery';
import { SubjectsService } from 'src/services/subjects.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {

  title = "Assessments Module";
  public lazyEvent: LazyLoadEvent;
  public subscriptions: Subscription = new Subscription();
  public assessors: any = [];
  // Variables for page loading functionality
  isLoading: boolean = false;
  isPrinting: boolean = false;
  isDocumentDownloaded: boolean = true;
  showForm: boolean = false;
  isAddEditMode: boolean = false;
  showVersionWarning: boolean = false;
  reScheduleAsessment: CoreFormResponse;
  // Variables for load more functionality
  noOfRecordsToLoad: number;
  totalAssessmentCount: number;
  person: CorePerson = new CorePerson();
  // Variables for filter functionality
  assessmentTypes: MetaFormBuilderForm[] = [];
  //filteredAssessmentTypes: MetaFormBuilderForm[] = [];
  fltrAssessmentTypes: MetaFormBuilderForm[] = [];
  filter: string = "";
  sortDirection: number = -1; // 1 = ASC; -1 = DESC
  showScheduler = false;
  // Variables to load all assessments for a patient
  allAssessments: CoreFormResponse[] = [];
  filteredAssessments: CoreFormResponse[] = [];
  allDBAssessments: CoreFormResponse[] = [];
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
  dataObject: any;

  // Variables to control form elements
  @ViewChild("confirmDeleteModal") confirmDeleteModal: ModalDirective;
  @ViewChild("pdfBodyDiv") divPdfBody: ElementRef;
  @ViewChild("resetDeleteFormButton") resetDeleteFormButton: ElementRef;
  @ViewChild("deleteForm") deleteForm: UntypedFormGroup;
  @ViewChild('cancelAssessmentModal') private cancelAssessmentModal;

  @ViewChild('open_pm') open_pm: ElementRef;
  @ViewChild('close_pm') close_pm: ElementRef;

  @ViewChild('open_consent') open_consent: ElementRef;
  @ViewChild('close_consent') close_consent: ElementRef;
  assessTbl: Table;
  isInitComplete: boolean = false;
  cancelAssessment: CoreFormResponse;
  showerror = false;
  currentGrabImageRequest_Component: any;
  currentGrabImageRequest_fileComponent: any;
  refreshDownloadListeners: any;
  sendToPhotoMeasure: boolean;
  photoMeasureInput: any;
  currentPhotoMeasureRequest_Component: any;
  formImages = new FormImages();
  loadingMedia = false;
  mediaInfoText: string;
  supressSubmission: any;
  forminstance: any;
  isDraftBeingSaved: boolean;
  draftImages = new FormImages();
  showDeleteError = false;
  showDeleteModel = false;

  @ViewChild('assessTbl')
  set content(content: Table) {
    if (content) { // initially setter gets called with undefined
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
  showPhotoMeasure = false;
  clientFullName: any;

  whatthreewordsclickedvalue: string;
  showAssessmentSource: boolean = false;

  @Input() set datacontract(value: any) {
    this.initAppService(value);
  }

  @Output() frameworkAction = new EventEmitter<string>();
  @Output() destroyTemplate: EventEmitter<any> = new EventEmitter();
  @Output() triggerRefresh: EventEmitter<any> = new EventEmitter();
  @Output() photoMeasureAction: EventEmitter<any> = new EventEmitter();

  //constructor
  constructor(public appService: AppService,
    public apiRequestService: ApirequestService,
    public errorHandlerService: ErrorHandlerService,
    public moduleObservables: ModuleObservablesService,
    public icons: IconsService,
    public toasterService: ToasterService,
    private notificationService: NotificationService,
    public formioHistoryService: FormioHistoryService,
    public formBuilderFactory: FormBuilderFactory,
    private changeDetector: ChangeDetectorRef,
    private elRef: ElementRef,
    private dr: DataRequest,
    private cdr: ChangeDetectorRef,
    private modalService: NgbModal,
    private subjects: SubjectsService) {
    this.subscribeEvents();

  }

  OpenWhatThreeWords() {
    this.frameworkAction.emit("OPEN_W3W");
  }

  OpenConsent() {
    this.open_consent.nativeElement.click();
  }
  CloseConsent() {
    this.close_consent.nativeElement.click();
  }

  OpenPhotoMeasure() {
    this.showPhotoMeasure = true;
    this.cdr.detectChanges();
    this.open_pm.nativeElement.click();
  }

  ClosePhotoMeasure() {
    this.showPhotoMeasure = false;
    this.photoMeasureInput = undefined;
    this.close_pm.nativeElement.click();
  }

  RequestPhotoMeasureOutput() {
    this.photoMeasureAction.emit("getphoto");
  }

  OnPhotoMeasureOutput(e) {
    console.log(e);
    this.ClosePhotoMeasure();


    if (this.currentGrabImageRequest_Component) {
      const name = "Screenshot " + new Date().toISOString().replace(":", ".") + ".jpeg";
      const url = e;
      //calculate size of image
      var stringLength = url.length - 'data:image/jpeg;base64,'.length;
      var sizeInBytes = 4 * Math.ceil((stringLength / 3)) * 0.5624896334383812;
      // var sizeInKb = sizeInBytes / 1000;

      const storage = "base64";
      const type = "image/jpeg";
      let imageData = new ImageData(name, name, sizeInBytes, storage, type, url);
      this.currentGrabImageRequest_Component.data[this.currentGrabImageRequest_fileComponent][0] = imageData;

      //add to formimages
      // let imageKey = this.GetImageKeyforComponent(this.currentGrabImageRequest_Component.component, this.currentGrabImageRequest_fileComponent);
      let imageKey = this.GetImageKeyforComponent(this.currentGrabImageRequest_Component, this.currentGrabImageRequest_fileComponent);

      let formImage = new FormImage(imageKey, imageKey, url, false);
      this.formImages.Push(formImage);

      var refreshGridsEvent = new Event('input');
      let refreshGridsbtn = <HTMLInputElement>document.getElementById("refreshGridsbtn");
      if (refreshGridsbtn) {
        refreshGridsbtn.value = Math.random().toString();
        refreshGridsbtn.dispatchEvent(refreshGridsEvent);
      }

      // this.triggerRefresh.emit({
      //   property: 'submission',
      //   value: this.submission
      // });
    }

  }


  async initAppService(value: any) {
    // Initialise AppService
    this.appService.apiServiceReference = value.apiService;
    this.moduleObservables.unload = value.unload;
    this.appService.contexts = value.contexts;
    this.appService.personId = value.personId;
    if (value.additionalInfo) {
      let meetingHandler = value.additionalInfo.find(x => x.key == "meetingrenderer");
      this.appService.meetingRenderer = meetingHandler ? meetingHandler.value : null;

      let S3Client = value.additionalInfo.find(x => x.key == "awsS3Client");
      this.appService.awsS3client = S3Client ? S3Client.value : null;
    }
    if (value.moduleAction)
      this.subscriptions.add(value.moduleAction.subscribe((e) => {
        this.ModuleAction(e);
      }));
    //Initialise logged-in user name
    let decodedToken: any;
    this.bearerAuthToken = this.appService.apiServiceReference.authService.user.access_token;
    if (!this.appService.loggedInUserName) {
      decodedToken = this.appService.decodeAccessToken(this.bearerAuthToken);
      if (decodedToken != null) {
        if (environment.production) {
          this.appService.loggedInUserName = decodedToken.name ? (Array.isArray(decodedToken.name) ? decodedToken.name[0] : decodedToken.name) : decodedToken.IPUId
          this.appService.loggedInUserId = decodedToken.IPUId;
        } else {
          //for running the code locally
          this.appService.loggedInUserId = "team@interneuron.org";
          this.appService.loggedInUserName = "Dev Team"
        }
      }
    }
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
            this.moduleObservables.contextChanged.next(undefined);
          }
        )
      );
    }
    else {
      this.moduleObservables.contextChanged.next(undefined);
    }

  }

  ModuleAction(e) {
    console.log(e)
    if (e.type == "w3w") {
      this.WhatThreeWordsUnloadWithResult(e.data);
    }
    if(e == "SECONDARY_MODULE_CLOSED") {
      this.subjects.secondaryModuleClosed.next(true);
    }
  }

  async ngOnInit() {

    //for running the code locally
    if (!environment.production) {
      var value: any = {};
      value.contexts = JSON.parse("[{\"encounter_id\": \"\", \"person_id\": \"01438e84-a718-421e-a5ff-06d49477ab0f\"}]");
      value.personId = "01438e84-a718-421e-a5ff-06d49477ab0f"; //ALLEN, Catherine

      this.appService.personId = "01438e84-a718-421e-a5ff-06d49477ab0f";
      this.appService.contexts = value.contexts;

      value.apiService = {};
      value.apiService.authService = {};
      value.apiService.authService.user = {};
      let auth = this.apiRequestService.authService;
      auth.getToken().then(async (token) => {
        value.apiService.authService.user.access_token = token;
        await this.initAppService(value);
      });
    }
  }

  // Subscribe to observables
  subscribeEvents() {
    this.subscriptions.add(
      this.moduleObservables.contextChanged.subscribe(
        async () => {
          //this.noOfRecordsToLoad = this.appService.moduleConfig.siteSettings.noOfRecordsToDisplay;
          this.getEncounters();
          
          //this.getAssessmentTypes(() => this.fetchTotalAssessmentCount(() => {this.canLoadTable = true;}));
          this.getAssessmentTypes(() => { this.canLoadTable = true; });
          if (this.appService.moduleConfig.Environment == "social_care") {
            this.getAssessar();
            this.getAllDropdown();
          }
          

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

  async getAssessmentTypes(cb: any) {
    this.isLoading = true;
    let formIdsConfigured = ""
    if (this.appService.moduleConfig.Environment == "hospital") {
      formIdsConfigured = this.appService.moduleConfig.siteSettings.formIdsHospitalCare;
    }
    else {
      formIdsConfigured = this.appService.moduleConfig.siteSettings.formIds;
    }
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
              let formIdsConfiguredArr = formIdsConfigured.split(',').map(rec => rec.trim().replace(/'/g, ''));
              this.assessmentTypes = mapOrder(this.assessmentTypes, formIdsConfiguredArr, 'formbuilderform_id');

              this.fltrAssessmentTypes = [];

              let filteredAssessmentTypes: MetaFormBuilderForm[] = [];

              this.fltrAssessmentTypes = this.assessmentTypes;

              if (this.appService.moduleConfig.Environment == "hospital") {
                if (this.appService.authoriseAction('assessments_resp_add_edit') || this.appService.authoriseAction('assessments_vte_add_edit')) {
                  for (let element of this.fltrAssessmentTypes) {
                    if (this.appService.moduleConfig.siteSettings.formIdsHospitalCare.includes(element.formbuilderform_id)) {
                      filteredAssessmentTypes.push(element);
                    }
                  }
                }
              }
              else if (this.appService.moduleConfig.Environment == "social_care") {
                if (this.appService.authoriseAction('assessments_add_edit') || this.appService.authoriseAction('assessments_schedule')) {
                  for (let element of this.fltrAssessmentTypes) {
                    if (this.appService.moduleConfig.siteSettings.formIds.includes(element.formbuilderform_id)) {

                      filteredAssessmentTypes.push(element);

                    }
                  }
                }
              }
              /// Remove the assessment where we dont have schedul access
              if (!this.appService.authoriseAction('assessments_schedule')) {
                for (let element of this.fltrAssessmentTypes) {
                  if (this.appService.moduleConfig.assessmentRequiredSchedul.find(x => x.formId == element.formbuilderform_id)) {
                    filteredAssessmentTypes = filteredAssessmentTypes.filter(x => x.formbuilderform_id != element.formbuilderform_id)
                  }
                }
              }



              if (filteredAssessmentTypes.length > 0) {
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
            //this.fetchTotalAssessmentCount();
            this.fetchAll();
            if (cb) {
              cb();
            }

          }));
  }
  getAssessarName(id: string) {
    if (this.assessors.find(x => x.assessorid == id)) {
      return this.assessors.find(x => x.assessorid == id).firstname + " " + this.assessors.find(x => x.assessorid == id).surname
    }
    else {
      return ""
    }
  }
  getAssessar() {
    this.subscriptions.add(
      this.apiRequestService.getRequest(`${this.appService.moduleConfig.apiEndpoints.getAssessorUri}`)
        .subscribe(
          (response: any) => {

            this.assessors = JSON.parse(response);

          }
        )
    );
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
                a._assessorname = this.assessors.find(x => x.assessorid == a.assessorid).firstname + " " + this.assessors.find(x => x.assessorid == a.assessorid).surname
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
    this.showerror = false;
  }

  async buildDataObject() {
    this.dataObject = JSON.parse('{"data":' + this.formResponse.formresponse + '}');
    if (this.formResponse.formbuilderform_id == "63a37208-5191-4685-d6f3-67f69f2b2f81") {
      this.dataObject["data"]["engineerName"] = this.formResponse._assessorname;
      this.dataObject["data"]["clientName"] = this.clientFullName;
      let assessorlocation = this.assessors.find(x => x.assessorid == this.formResponse.assessorid);
      if (!this.dataObject["data"]["postcodeOfAssessorServiceCertificate"]) {
        if (assessorlocation) {
          this.dataObject["data"]["postcodeOfAssessorServiceCertificate"] = this.assessors.find(x => x.assessorid == this.formResponse.assessorid).assessorlocation;
        }

      }
    }

    if (this.formResponse.formbuilderform_id == "7d0c118f-1b01-6881-39d4-3c5fe4a80678") {
      let assessorlocation = this.assessors.find(x => x.assessorid == this.formResponse.assessorid);
      if (!this.dataObject["data"]["postcodeOfAssessorOTAssessment"] || !this.dataObject["data"]["assessorw3w"]) {
        if (assessorlocation) {
          this.dataObject["data"]["postcodeOfAssessorOTAssessment"] = this.assessors.find(x => x.assessorid == this.formResponse.assessorid).assessorlocation;
          this.dataObject["data"]["assessorw3w"] = this.assessors.find(x => x.assessorid == this.formResponse.assessorid).whatthreewords;
        }
        
      }
    }

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
    delete this.dataObject["data"]["saveAsDraft"];

    return this.dataObject;
  }

  onCloseForm() {
    this.fetchAll();
    this.showScheduler = false;
  }

  async onAddAssessment() {
    this.formImages.images = [];
    this.fromPrevTableState = true;
    this.showerror = false;
    if (this.selectedAssessment == null) {
      this.showerror = true;
      return;
    }
    if (this.appService.moduleConfig.assessmentRequiredSchedul.find(x => x.formId == this.selectedAssessment.formbuilderform_id)) {
      this.reScheduleAsessment = null;
      this.showScheduler = true;
      return;
    }

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

  async oncancelAssessment(assessment: CoreFormResponse) {
    this.open(this.cancelAssessmentModal);
    this.cancelAssessment = assessment
  }


  onReschedule(assessment: CoreFormResponse) {
    this.reScheduleAsessment = assessment;

    this.selectedAssessment = this.fltrAssessmentTypes.find(x => x.formbuilderform_id == assessment.formbuilderform_id)

    this.showScheduler = true;


  }
  private async prePopulateFormData() {

    let latestPlateletResult = await firstValueFrom(this.apiRequestService.getRequest(this.appService.moduleConfig.apiEndpoints.latestPlateletCountUri + this.appService.personId));
    latestPlateletResult = JSON.parse(latestPlateletResult);
    //latestPlateletResult.observationvaluenumeric = 49;

    let latestBMI = await firstValueFrom(this.apiRequestService.getRequest(this.appService.moduleConfig.apiEndpoints.latestBmiUri + this.appService.personId));
    latestBMI = JSON.parse(latestBMI);
    //latestBMI.observationvaluenumeric = 31;

    let latestCancerRecord = await firstValueFrom(this.apiRequestService.getRequest(this.appService.moduleConfig.apiEndpoints.latestCancerRecordUri + this.appService.personId));
    latestCancerRecord = JSON.parse(latestCancerRecord);
    //latestCancerRecord.observationvalue = true;

    let latestVteHistory = await firstValueFrom(this.apiRequestService.getRequest(this.appService.moduleConfig.apiEndpoints.latestVteHistoryUri + this.appService.personId));
    latestVteHistory = JSON.parse(latestVteHistory);
    //latestVteHistory.observationvalue = true;

    let currentPatientAge = await firstValueFrom(this.apiRequestService.getRequest(this.appService.moduleConfig.apiEndpoints.currentPatientAgeUri + this.appService.personId));
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
          this.submission["data"]["noContraIndications"] = false;
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
          this.submission["data"]["noContraIndications"] = false;
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
          this.submission.data['noThrombosisRisks'] = false;
          if (!this.submission["data"]["contraIndicationsAdditional"]) {
            this.submission["data"]["contraIndicationsAdditional"] = {};
          }
          this.submission["data"]["contraIndicationsAdditional"]["obesity"] = true;
          this.submission["data"]["noContraIndications"] = false;
        }
        //Adolescents VTE form
        else if (this.selectedAssessment.formbuilderform_id == "e8b4c163-bf5f-fbaa-7f66-139b026f9e76") {
          if (!this.submission["data"]["patientRelatedThrombosisRisk"]) {
            this.submission["data"]["patientRelatedThrombosisRisk"] = {};
          }
          this.submission["data"]["patientRelatedThrombosisRisk"]["obesity"] = true;
          this.submission.data['noThrombosisRisks'] = false;

        }
        //VTE Reassessment form
        else if (this.selectedAssessment.formbuilderform_id == "032fcd09-6979-14f8-4a80-91cb1a94390d") {
          if (!this.submission["data"]["patientRelatedThrombosisRisk"]) {
            this.submission["data"]["patientRelatedThrombosisRisk"] = {};
          }
          this.submission["data"]["patientRelatedThrombosisRisk"]["obesityBmi30KgM"] = true;
          this.submission.data['noThrombosisRisks'] = false;

          if (!this.submission["data"]["contraIndicationsAdditional"]) {
            this.submission["data"]["contraIndicationsAdditional"] = {};
          }
          this.submission["data"]["contraIndicationsAdditional"]["obesity"] = true;
          this.submission["data"]["noContraIndications"] = false;
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
      else if (this.selectedAssessment.formbuilderform_id == "e8b4c163-bf5f-fbaa-7f66-139b026f9e76") {
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

    let formSettings = this.appService.moduleConfig.assessmentFormsHospital.find(form => form.formId == this.selectedAssessment.formbuilderform_id);

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

      let previousFormData = await firstValueFrom(this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.latestAssessmentResponse, payload));

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
      if (control.columns) {
        for (const c of control.columns) {
          for (const item of c.components) {
            if (item.key == "save" || item.key == "saveAsDraft") {
              control.hidden = true;
            }
            if (item.key == "isConsentRead") {
              item.disabled = true;
            }
          }
        }
      }
      if (control.key == 'footercolumns' || control.key == 'submit' || control.key == 'saveAsDraft') {
        control.hidden = true;
      }
      else if (control.key == 'goToTop') {
        control.disabled = false;
      }
      else if (control.type == "tabs") {
        for (const c of control.components) {
          for (const item of c.components) {
            item.disabled = true;
            if (item.type == 'columns' && item.columns) {
              for (const c1 of item.columns) {
                c1.disabled = true;
                for (const cp1 of c1.components) {
                  if (cp1.type) {
                    cp1.disabled = true;
                    if (cp1.columns) {
                      for (const cp2 of cp1.columns) {
                        for (const cp3 of cp2.components) {
                          cp3.disabled = true;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
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
    let frp = await this.PrepareImagesFromAWS(JSON.parse(this.formResponse.formresponse));
    this.formResponse.formresponse = JSON.stringify(frp);


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
  grabImage() {
    this.appService.meetingRenderer.PostMessageToChimeWindow("GRAB_FRAME");
  }
  updateClientdetailsForOtAssessment(client: any, assessment: CoreFormResponse) {
    if (assessment.responsestatus == "New") {
      let submission = JSON.parse('{"data":' + assessment.formresponse + '}')


      if (client) {
        submission["data"]["title"] = client.titlecode;
        submission["data"]["firstName1"] = client.firstname;
        submission["data"]["middleName"] = client.middlename
        submission["data"]["surname1"] = client.familyname
        submission["data"]["dateTime"] = client.dateofbirth;

        submission["data"]["assessmentSource"] = assessment.assessmentsourceid;
        submission["data"]["otherassessmentsource"] = assessment.otherassessmentsource;
        submission["data"]["assessorsName1"] = assessment._assessorname;
        submission["data"]["assessorsPhonenumber1"] = this.assessors.find(x => x.assessorid == assessment.assessorid).phoneno;

        let phone = client.__personContactInfos.find(x => x.contacttypecode == "phone");
        let email = client.__personContactInfos.find(x => x.contacttypecode == "email");
        let otherphone = client.__personContactInfos.find(x => x.contacttypecode == "otherphone");
        let otheremail = client.__personContactInfos.find(x => x.contacttypecode == "otheremail");
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
        if (otherphone) {
          if(otherphone.contactdetails.indexOf("|") > -1){
            let arrContactDetails = otherphone.contactdetails.split("|");
            submission["data"]["otherISDCode"] = arrContactDetails[0];
            submission["data"]["otherTelephoneNumber"] = arrContactDetails[1];
          }
          else{
            submission["data"]["otherTelephoneNumber"] = otherphone.contactdetails;
          }
        }
        if (email) {
          submission["data"]["emailAddress"] = email.contactdetails;
        }
        if (otheremail) {
          submission["data"]["otherEmailAddress"] = otheremail.contactdetails;
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
            let livewithperson = '';
            if (houseHoldMemberList[i].__maincarer == 'MC') {
              mainCare = 'yes';
            }
            if (houseHoldMemberList[i].__nexofkin == 'NOK') {
              nextOfKin = 'yes';
            }
            if (houseHoldMemberList[i].__emergencycontact == 'EC') {
              emergencyContact5 = 'yes';
            }
            if (houseHoldMemberList[i].livewithperson == '1') {
              livewithperson = 'yes';
            }
            else if(houseHoldMemberList[i].livewithperson == '0') {
              livewithperson = 'no';
            }
            var age = moment(houseHoldMemberList[i].dob, "DD-MM-YYYY");
            submission["data"]["editGridPersonalInformation1"].push({
              "name2": (houseHoldMemberList[i].givenname || '') + ' ' + (houseHoldMemberList[i].middlename || '') + ' ' + (houseHoldMemberList[i].familyname || ''),
              "relationship1": houseHoldMemberList[i].relationship,
              "age1": age.isValid() ? age.toDate() : "",
              "telephoneNumber": houseHoldMemberList[i].primarycontactnumber,
              "mainCare": mainCare,
              "nextOfKin": nextOfKin,
              "emergencyContact5": emergencyContact5,
              "presentForAssessment": presentForAssessment,
              "notes": houseHoldMemberList[i].notes,
              "livesWithClient": livewithperson
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
        assessment.formresponse = JSON.stringify(submission["data"]);
        return assessment;
      } else {
        return assessment;
      }



    }
    return assessment;
  }
  async onEditAssessment(assessment: CoreFormResponse) {
    this.formImages.images = [];


    if (environment.production) {
      if (this.appService.meetingRenderer && this.appService.moduleConfig.siteSettings.formsRequireMeeting.includes(assessment.formbuilderform_id)) {
        const meetingid = assessment.formbuilderresponse_id + "_joinas_" + assessment._assessorname;
        this.appService.meetingRenderer.RenderNewMeeting(meetingid);
        this.appService.meetingRenderer.RegisterCallback("assessments_grabimagecallback", (event) => {
          if (event.data && event.data.type == "image" && event.data.data) {
            const name = "Screenshot " + new Date().toISOString().replace(":", ".") + ".jpeg";
            const url = event.data.data;
            //calculate size of image
            var stringLength = url.length - 'data:image/jpeg;base64,'.length;
            var sizeInBytes = 4 * Math.ceil((stringLength / 3)) * 0.5624896334383812;
            // var sizeInKb = sizeInBytes / 1000;

            const storage = "base64";
            const type = "image/jpeg";
            let imageData = new ImageData(name, name, sizeInBytes, storage, type, url);

            this.refreshDownloadListeners = true;

            if (!this.sendToPhotoMeasure) {
              this.currentGrabImageRequest_Component.data[this.currentGrabImageRequest_fileComponent][0] = imageData;
              // if (Object.keys(this.submission.data).indexOf(this.currentGrabImageRequest_fileComponent) == -1)//part of edit grid, update submission manually 
              // {
              //   const editgridkey = Object.keys(this.submission.data).find(x => Array.isArray(this.submission.data[x])
              //     && this.submission.data[x].find(y => Object.keys(y).indexOf(this.currentGrabImageRequest_fileComponent) != -1));
              //   if (editgridkey) {
              //     const editgrid = this.submission.data[editgridkey];
              //     if (Array.isArray(editgrid)) {
              //       const rownumbertoupdate = this.currentGrabImageRequest_Component.component.row.split('-')[0];
              //       if (editgrid.length - 1 >= rownumbertoupdate)
              //         editgrid[rownumbertoupdate][this.currentGrabImageRequest_fileComponent][0] = imageData;
              //     }
              //   }
              // }

              //add to formimages
              // let imageKey = this.GetImageKeyforComponent(this.currentGrabImageRequest_Component.component, this.currentGrabImageRequest_fileComponent);
              let imageKey = this.GetImageKeyforComponent(this.currentGrabImageRequest_Component, this.currentGrabImageRequest_fileComponent);

              let formImage = new FormImage(imageKey, imageKey, url, false);
              this.formImages.Push(formImage);

              var refreshGridsEvent = new Event('input');
              let refreshGridsbtn = <HTMLInputElement>document.getElementById("refreshGridsbtn");
              refreshGridsbtn.value = Math.random().toString();
              refreshGridsbtn.dispatchEvent(refreshGridsEvent);
            }
            else {
              this.photoMeasureInput = url;
              this.OpenPhotoMeasure();
              this.sendToPhotoMeasure = false;
            }
            // this.triggerRefresh.emit({
            //   property: 'submission',
            //   value: this.submission
            // });




          }
        });
      }
      else {
        console.log("Meeting Renderer not initiated");
      }
    }
    else {
      var myWindow = window.open("https://meet.interneuron.io", "mypopup", "resizable=no, toolbar=no, scrollbars=no, menubar=no, status=no, directories=no, location=no, width=1000, height=600, left=10 top=100");
      if (myWindow) { myWindow.focus() }
    }
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
    let frp = await this.PrepareImagesFromAWS(JSON.parse(this.formResponse.formresponse));
    this.formResponse.formresponse = JSON.stringify(frp);

    this.generatedForm = {
      title: this.formResponse.formname,
      components: JSON.parse(this.formResponse.formcomponents)
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

    this.supressSubmission = false;

  }

  RefreshFileControls() {
    Object.keys(this.submission.data).forEach(control => {
      if (control.startsWith("addPhoto_") || control.startsWith("addMeasure_")) {
        if (Array.isArray(this.submission.data[control]) && this.submission.data[control].length != 0
          && this.submission.data[control][0].hasOwnProperty("originalName")
          && this.submission.data[control][0].hasOwnProperty("url")) {
          const downloadButton = document.getElementById(control);
          if (downloadButton) {
            let newDownloadButton = downloadButton.cloneNode(true);
            //@ts-ignore
            newDownloadButton.disabled = false;
            downloadButton.parentNode.replaceChild(newDownloadButton, downloadButton);
            newDownloadButton.addEventListener('click', _e => {
              console.log(this.submission.data[control]);
              this.DownloadUrl(this.submission.data[control][0].url,
                this.submission.data[control][0].originalName);
            });
          }
        }
      }
    })
  }

  onConfirmDeleteAssessment(assessment: CoreFormResponse) {
    this.assessmentToDelete = assessment;
    this.assessmentToDelete.responsestatusreason = ""
    this.showDeleteModel = true;
  }
  hideDeleteModal() {
    this.showDeleteModel = false;
    this.showDeleteError = false;
  }
  onDeleteAssessment() {
    if (this.assessmentToDelete.responsestatusreason == null || this.assessmentToDelete.responsestatusreason.trim() == "") {

      this.showDeleteError = true;
      return;
    }

    this.showDeleteError = false;

    this.isLoading = true;
    const deleteionDate: any = new Date();
    this.showDeleteModel = false;
    this.assessmentToDelete.responsestatus = "Deleted";
    //this.assessmentToDelete._createddate = deleteionDate.toJSON().substr(0, 19);

    delete this.assessmentToDelete.formname;
    delete this.assessmentToDelete._assessorname;

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
    // this.fetchTotalAssessmentCount();
    this.fetchAll();
  }

  async onSubmit(submission: any) {

    if (!this.supressSubmission) {
      if (submission["data"]["saveAsDraft"] && submission["data"]["saveAsDraft"] == true) {
        submission.state = "draft";
      }
      this.isDraftBeingSaved = false;
      this.draftImages.images = [];
      this.supressSubmission = true;

      let mediaversions = await this.ProcessImageControlsOnSubmission(submission.data);

      this.formResponse.assessmentsourceid = submission["data"].assessmentSource ? submission["data"].assessmentSource : null;
      this.formResponse.otherassessmentsource = submission["data"].otherassessmentsource ? submission["data"].otherassessmentsource : null;
      
      this.formResponse = this.formBuilderFactory.getFormBuilder(this.formResponse.formbuilderform_id).BuildFormResponse(submission, this.formResponse);
      delete this.formResponse._assessorname;

      this.subscriptions.add(
        this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.formBuilderResponsePostUrl, this.formResponse)
          .subscribe((response) => {

            if (this.formResponse.formbuilderform_id == "7d0c118f-1b01-6881-39d4-3c5fe4a80678" || this.formResponse.formbuilderform_id == "63a37208-5191-4685-d6f3-67f69f2b2f81") {
              let getassessor = this.assessors.find(x => x.assessorid == this.formResponse.assessorid);
              let assessorfullname;
              if(getassessor){
                assessorfullname = getassessor.firstname + ' ' + getassessor.surname;
              }
              this.formResponse._assessorname = assessorfullname;
              // this.formResponse._assessorname = this.assessors.find(x => x.assessorid == this.formResponse.assessorid).firstname + " " + this.assessors.find(x => x.assessorid == this.formResponse.assessorid).surname
              this.dr.updateDataToClient(submission, () => {
                this.toasterService.showToaster("Success", "Assessment Saved " + (submission.state == "draft" ? "as draft" : ""));
                this.emitFrameworkEvent("REFRESH_BANNER");
                if (submission.state != "draft") {
                  this.fetchAll();
                  this.showForm = false;//this will reload the list again
                  this.isAddEditMode = false;
                }
                else {
                  this.isDraftBeingSaved = true;
                  this.formImages.images.forEach(img => {
                    this.draftImages.Push(img);
                  });
                  this.formResponse.formname = this.assessmentTypes.find(x => x.formbuilderform_id == this.formResponse.formbuilderform_id).formname
                  this.onEditAssessment(this.formResponse);

                }

                this.supressSubmission = false;
              });
            }
            else {
              this.toasterService.showToaster("Success", "Assessment Saved " + (submission.state == "draft" ? "as draft" : ""));
              this.emitFrameworkEvent("REFRESH_BANNER");
              if (submission.state != "draft") {
                this.fetchAll();
                this.showForm = false;//this will reload the list again
                this.isAddEditMode = false;
              }
              else {
                this.isDraftBeingSaved = true;
                this.formImages.images.forEach(img => {
                  this.draftImages.Push(img);
                });
                this.formResponse.formname = this.assessmentTypes.find(x => x.formbuilderform_id == this.formResponse.formbuilderform_id).formname
                this.onEditAssessment(this.formResponse);
              }
              this.supressSubmission = false;
            }

            if (mediaversions && Array.isArray(mediaversions)) {
              let formresponsemedia = [];
              for (let resp of mediaversions) {
                let fm = new CoreFormresponsemediaversion();
                fm.awskey = resp.key;
                fm.awsversionid = resp.versionid;
                fm.formresponseid = this.formResponse.formbuilderresponse_id;
                fm.formresponsemediaversion_id = uuidv4();
                fm.mediakey = resp.key;
                fm.versiondatetime = response[0].lastupdateddatetime;
                formresponsemedia.push(fm);
              }
              this.SaveMediaVersions(formresponsemedia);
            }
          }
          ));

    }



  }

  SaveMediaVersions(CoreFormresponsemediaversion: Array<CoreFormresponsemediaversion>) {
    this.subscriptions.add(
      this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.formresponsemediaversionUrl, CoreFormresponsemediaversion)
        .subscribe(
      ));
  }


  onRender() {
    if (this.formResponse.formbuilderform_id == "7d0c118f-1b01-6881-39d4-3c5fe4a80678") {
      const consentCheckBox = document.getElementById("consentCheckbox");
      //bind action to consent checkbox
      if (consentCheckBox) {
        consentCheckBox.addEventListener("change", (e) => {
          var currentStatus = (<HTMLInputElement>e.target).checked;
          const b = <HTMLInputElement>document.getElementById("formTabsVisibility");

          if (!currentStatus) {
            const confirmation = confirm("All the unsaved changes in the form will be lost. Do you want to continue?");
            if (confirmation) {
              //hide here
              b.checked = false;
              const changeevent = new Event("click");
              b.dispatchEvent(changeevent);
            }
            else {
              (<HTMLInputElement>e.target).checked = true;
            }
          }
          else {
            //show here
            b.checked = true;
            const changeevent = new Event("click");
            b.dispatchEvent(changeevent);

          }
        });
      }

    }

    if (this.formResponse.formbuilderform_id == '63a37208-5191-4685-d6f3-67f69f2b2f81') {
      setTimeout(() => {
        this.RefreshFileControls();
      }, 500);

    }

    const scrollToTopBtn = document.getElementById("scrollToTopButton");
    if (scrollToTopBtn) {
      $('#scrollToTopButton').hide();
      window.addEventListener("scroll", function () {
        let scroll = this.scrollY;
        if (scroll > 20) {
          $('#scrollToTopButton').show();
        } else {
          $('#scrollToTopButton').hide();
        }
      });
      scrollToTopBtn.addEventListener("click", function () {
        document.body.scrollTop = 0; // For Safari
        document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE, and Opera
      });
    }

    if(this.formResponse.formbuilderform_id == "24add288-6e6b-baa9-97d6-eb472c96dd28" || this.formResponse.formbuilderform_id == 'e8b4c163-bf5f-fbaa-7f66-139b026f9e76' || this.formResponse.formbuilderform_id == '6a898df4-b11a-399a-07e6-883d823cb4b2' || this.formResponse.formbuilderform_id == '032fcd09-6979-14f8-4a80-91cb1a94390d')
    {
      const updateCheckboxes = document.getElementById("redrawCheckboxes");
      if (updateCheckboxes) {
        var refreshCheckboxesEvent = new Event('input');
        let refreshCheckboxesControl = <HTMLInputElement>document.getElementById("redrawCheckboxes");
        refreshCheckboxesControl.value = Math.random().toString();
        refreshCheckboxesControl.dispatchEvent(refreshCheckboxesEvent);
      }
    }
    
  }

  FormCustomEvent(event) {
    console.log(event);
    if (event.type == "whatthreewords") {
      this.isInitComplete = true;
      this.whatthreewordsclickedvalue = event.component.key;
      this.OpenWhatThreeWords();
    } else if (event.type == "openconsent") {
      this.OpenConsent();
    }
    else if (event.type.indexOf("grabimage") != -1) {
      this.currentGrabImageRequest_fileComponent = event.type.replace("grabimage_", "");
      this.currentGrabImageRequest_Component = event;
      this.grabImage();
    }
    if (event.type.indexOf("measure_") != -1) {
      this.currentGrabImageRequest_fileComponent = event.type.replace("measure_", "");
      this.currentGrabImageRequest_Component = event;
      if (this.appService.meetingRenderer.meetingStarted != undefined) {
        if (this.appService.meetingRenderer.meetingStarted) {
          this.sendToPhotoMeasure = true;
          this.grabImage();
        }
        else {
          this.sendToPhotoMeasure = false;
          this.OpenPhotoMeasure();
        }
      }
      else {
        if (this.appService.meetingRenderer.meetingStatus) {
          this.sendToPhotoMeasure = true;
          this.grabImage();
        }
        else {
          this.sendToPhotoMeasure = false;
          this.OpenPhotoMeasure();
        }
      }

    }
  }
  FormLoadComplete(value) {

  }

  async ProcessImageControlsOnSubmission(submissionData) {
    this.DeleteBase64ImageDatafromFileControls(submissionData);
    this.loadingMedia = true;
    this.mediaInfoText = "Uploading form media, please wait..."
    let postresponse = await this.formImages.SyncToAWS(this.appService.awsS3client);
    this.loadingMedia = false;
    return postresponse;
  }


  GetAllMediaControls(submissionData, controls = [], rownum = -1, multilivelIndices = []): Array<any> {
    Object.keys(submissionData).forEach((d) => {
      const control = submissionData[d];
      if (Array.isArray(control)) {
        if (d.startsWith("addPhoto_") || d.startsWith("addVideo_") || d.startsWith("addMeasure_")) { //root level media control
          let multilevelindices = "";
          if (multilivelIndices.length) {
            multilevelindices = multilivelIndices.join("::")
          }
          control.forEach((mc) => {
            controls.push({ file: mc, key: d, rownumber: multilevelindices != "" ? multilevelindices : rownum });
          });
        }
        else //grid level media control
        {
          control.forEach((gridElement, index) => {
            multilivelIndices.push(index);
            this.GetAllMediaControls(gridElement, controls, index, multilivelIndices);
            multilivelIndices.pop();
          });
        }
      }
    });
    return controls;
  }

  DeleteBase64ImageDatafromFileControls(submissionData) {
    Object.keys(submissionData).forEach((d) => {
      const control = submissionData[d];
      if (Array.isArray(control)) {
        if (d.startsWith("addPhoto_") || d.startsWith("addVideo_") || d.startsWith("addMeasure_")) { //root level media control
          control.forEach((mc) => {
            mc.url = "";
          });
        }
        else //grid level media control
        {
          control.forEach((gridElement, index) => {
            this.DeleteBase64ImageDatafromFileControls(gridElement);
          });
        }
      }
    });
  }
  async PrepareImagesFromAWS(submissionData) {
    this.isLoading = true;
    this.loadingMedia = true;
    this.mediaInfoText = "Downloading form media..."
    this.formImages.images = [];
    let allMediaControls = this.GetAllMediaControls(submissionData);
    let awskeys = []

    for (const filecontrol of allMediaControls) {
      let key = filecontrol.key;
      let rownumber = filecontrol.rownumber
      let awsKey = this.GetImageKey(rownumber, key);
      awskeys.push(awsKey);
      //get aws image by key
      //let imageBase64 = await this.appService.awsS3client.DownloadMedia(awsKey);
    }

    if (awskeys.length != 0) {
      if (!this.isDraftBeingSaved) {
        await this.appService.awsS3client.DownloadMediaAsync(awskeys).then(
          (results) => {
            for (const filecontrol of allMediaControls) {
              let key = filecontrol.key;
              let rownumber = filecontrol.rownumber
              let awsKey = this.GetImageKey(rownumber, key);

              let result = results.find(x => x.key == awsKey);
              if (result) {
                filecontrol.file.url = result.data;
                let isVideo = result.key.startsWith("addVideo_");
                let formImage = new FormImage(result.key, result.key, result.data, isVideo);
                formImage.uploadedtoAws = true;
                this.formImages.Push(formImage);
              }
            }
          });
      }
      else {
        for (const filecontrol of allMediaControls) {
          let key = filecontrol.key;
          let rownumber = filecontrol.rownumber
          let awsKey = this.GetImageKey(rownumber, key);

          let result = this.draftImages.Get(awsKey);
          if (result) {
            filecontrol.file.url = result.base64Data;
            result.uploadedtoAws = true;
            this.formImages.Push(result);
          }
        }
      }
    }
    this.isDraftBeingSaved = false;
    this.draftImages.images = [];
    this.loadingMedia = false;
    this.isLoading = false;
    return submissionData;
  }

  onChange(value: any) {
    console.log('onchange');
    console.log(value);
    if(this.formResponse.formbuilderform_id == "7d0c118f-1b01-6881-39d4-3c5fe4a80678") {
      var setCommissionerEvent = new Event('input');
      let setCommissionerbtn = <HTMLInputElement>document.getElementById("setCommissionerValue");
      if (setCommissionerbtn) {
        setCommissionerbtn.value = (this.showAssessmentSource ? '9ef56fac-520a-4d2a-9524-0281c58d31ac' : '');
        setCommissionerbtn.dispatchEvent(setCommissionerEvent);
      }
    }
      

    if (this.formResponse.formbuilderform_id == "24add288-6e6b-baa9-97d6-eb472c96dd28" || this.formResponse.formbuilderform_id == 'e8b4c163-bf5f-fbaa-7f66-139b026f9e76' || this.formResponse.formbuilderform_id == '6a898df4-b11a-399a-07e6-883d823cb4b2' || this.formResponse.formbuilderform_id == '032fcd09-6979-14f8-4a80-91cb1a94390d') {
      this.UpdateVTEAssessmentThrombosisCheckbox(value);
    }

    if (((value.state && value.state != "submitted") || !value.state) && value.data) {
      value.data["saveAsDraft"] = false;
      value.data["submit"] = false;
    }

    if (value.changed && value.changed.component && value.changed.component.key != "saveAsDraft") {

      if (value.changed.component.key == "tabs") {
        const showFormErrorsBtn = document.getElementById("showFormErrorsBtn");
        if (showFormErrorsBtn) {
          showFormErrorsBtn.click();
        }
      }
      // when a new media is uploaded or deleted
      if (value.changed && value.changed.component && value.changed.component.type == "file") {

        // let imageKey = this.GetImageKeyforComponent(value.changed.component);
        let imageKey = this.GetImageKeyforComponent(value.changed);

        if (value.changed.value && Array.isArray(value.changed.value) && value.changed.value.length != 0) {
          //image added
          //add to formimages
          let url = value.changed.value[0].url;
          value.changed.value[0].originalName = new Date().toISOString().replace(":", "") + "_" + value.changed.value[0].originalName;
          let isVideo = (<string>value.changed.component.key).startsWith("addVideo_");
          let formImage = new FormImage(imageKey, imageKey, url, isVideo);
          this.formImages.Push(formImage);
        }
        else {
          //image deleted
          this.formImages.Delete(imageKey);
        }
      }

      //find all the components that are file uploades
      if (this.refreshDownloadListeners ||
        (value.changed && value.changed.component && (value.changed.component.type == "file" || value.changed.component.type == "editgrid" || value.changed.component.type == "tabs")) ||
        !value.changed) {
        setTimeout(() => {
          Object.keys(this.submission.data).forEach(control => {
            if (control.startsWith("addPhoto_") || control.startsWith("addMeasure_")) {
              if (Array.isArray(this.submission.data[control]) && this.submission.data[control].length != 0
                && this.submission.data[control][0].hasOwnProperty("originalName")
                && this.submission.data[control][0].hasOwnProperty("url")) {
                const downloadButton = document.getElementById(control);
                if (downloadButton) {
                  let newDownloadButton = downloadButton.cloneNode(true);
                  //@ts-ignore
                  newDownloadButton.disabled = false;
                  downloadButton.parentNode.replaceChild(newDownloadButton, downloadButton);
                  newDownloadButton.addEventListener('click', _e => {
                    console.log(this.submission.data[control]);
                    this.DownloadUrl(this.submission.data[control][0].url,
                      this.submission.data[control][0].originalName);
                  });
                }
              }
            }
            else {//edit grids
              const gridObject = this.submission.data[control];
              if (Array.isArray(gridObject)) {
                gridObject.forEach(set => {
                  Object.keys(set).forEach(question => {
                    if (Array.isArray(set[question])) {
                      //2nd level grid 
                      //iterate 

                      set[question].forEach(q_set => {
                        Object.keys(q_set).forEach(q_question => {
                          if (q_question.startsWith("addPhoto_") || q_question.startsWith("addMeasure_") || q_question.startsWith("addVideo_")) {
                            if (Array.isArray(q_set[q_question]) && q_set[q_question].length != 0 &&
                              q_set[q_question][0].hasOwnProperty("originalName") &&
                              q_set[q_question][0].hasOwnProperty("url")) {
                              const downloadButton = document.getElementById(q_set[q_question][0].originalName);
                              if (downloadButton) {
                                let newDownloadButton = downloadButton.cloneNode(true);
                                downloadButton.parentNode.replaceChild(newDownloadButton, downloadButton);
                                newDownloadButton.addEventListener('click', _e => {
                                  this.DownloadUrl(q_set[q_question][0].url, q_set[q_question][0].originalName);
                                });
                              }
                            }
                          }
                          else {
                            if (Array.isArray(set[question]) && set[question].length != 0 &&
                              set[question][0].hasOwnProperty("originalName") &&
                              set[question][0].hasOwnProperty("url")) {
                              const downloadButton = document.getElementById(set[question][0].originalName);
                              if (downloadButton) {
                                let newDownloadButton = downloadButton.cloneNode(true);
                                downloadButton.parentNode.replaceChild(newDownloadButton, downloadButton);
                                newDownloadButton.addEventListener('click', _e => {
                                  this.DownloadUrl(set[question][0].url, set[question][0].originalName);
                                });
                              }
                            }
                          }
                        });

                      });

                    }
                    else {
                      if (question.startsWith("addPhoto_") || question.startsWith("addMeasure_") || question.startsWith("addVideo_")) {
                        if (Array.isArray(set[question]) && set[question].length != 0 &&
                          set[question][0].hasOwnProperty("originalName") &&
                          set[question][0].hasOwnProperty("url")) {
                          const downloadButton = document.getElementById(set[question][0].originalName);
                          if (downloadButton) {
                            let newDownloadButton = downloadButton.cloneNode(true);
                            downloadButton.parentNode.replaceChild(newDownloadButton, downloadButton);
                            newDownloadButton.addEventListener('click', _e => {
                              this.DownloadUrl(set[question][0].url, set[question][0].originalName);
                            });
                          }
                        }
                      }
                    }

                  });
                });
              }
            }
          });
        }, 500);
        this.refreshDownloadListeners = false;
      }
    }
    // }
  }

  UpdateVTEAssessmentThrombosisCheckbox(value) {
    if (value.data && value.changed != undefined && value.changed.component.key != 'redrawCheckboxes') {
      // console.log('inside');
      if ((value.changed.component.key == 'patientRelatedThrombosisRisk' || value.changed.component.key == 'admissionRelatedThrombosisRisk') || value.changed.component.key == 'noThrombosisRisks') {
        this.patientRelatedThrombosisRisks(value);
      }

      if ((value.changed.component.key == 'patientRelatedBleedingRisk' || value.changed.component.key == 'admissionRelatedBleedingRisk') || value.changed.component.key == 'noBleedingRisks') {
        this.patientRelatedBleedingRisks(value);
      }

      if ((value.changed.component.key == 'contraIndicationsAES' || value.changed.component.key == 'contraIndicationsAESSCD' || value.changed.component.key == 'contraIndicationsLMWH' || value.changed.component.key == 'contraIndicationsAspirin' || value.changed.component.key == 'contraIndicationsAdditional') || (value.changed.component.key == 'noContraIndications' || value.changed.component.key == 'noContraindications')) {
        this.contraIndications(value);
      }

      if ((value.changed.component.key == 'newVTERiskFactors') || value.changed.component.key == 'noNewThrombosisRisks') {
        this.newVTERiskFactors(value);
      }

      if ((value.changed.component.key == 'newBleedingRiskFactors') || value.changed.component.key == 'noNewBleedingRisks') {
        this.newBleedingRiskFactors(value);
      }

    }
    // else {
    //   if(value.data)
    //   {
    //     value.data.redrawCheckboxes = false;
    //   }

    // }


  }

  patientRelatedThrombosisRisks(value) {
    let checkValidation = false;
    if (value.changed && value.changed.component && value.changed.component.key == 'noThrombosisRisks' && value.data.noThrombosisRisks) {
      Object.keys(value.data.patientRelatedThrombosisRisk).forEach(element => {
        value.data.patientRelatedThrombosisRisk[element] = false;
      });

      Object.keys(value.data.admissionRelatedThrombosisRisk).forEach(element => {
        value.data.admissionRelatedThrombosisRisk[element] = false;
      });
    }

    if (value.changed && value.changed.component && value.changed.component.key == 'patientRelatedThrombosisRisk') {
      let changeStauts = false;
      Object.keys(value.data.patientRelatedThrombosisRisk).forEach(element => {
        if (value.data.patientRelatedThrombosisRisk[element] == true) {
          changeStauts = true;
          checkValidation = true;
        }
      });

      if (changeStauts = true) {
        value.data['noThrombosisRisks'] = false;
      }

    }

    if (value.changed && value.changed.component && value.changed.component.key == 'admissionRelatedThrombosisRisk') {
      let changeStauts = false;
      Object.keys(value.data.admissionRelatedThrombosisRisk).forEach(element => {
        if (value.data.admissionRelatedThrombosisRisk[element] == true) {
          changeStauts = true;
          checkValidation = true;
        }
      });

      if (changeStauts = true) {
        value.data['noThrombosisRisks'] = false;
      }

    }

    if (checkValidation || value.data['noThrombosisRisks']) {
      //This will happens only once
      const updateCheckboxes = document.getElementById("redrawCheckboxes");
      if (updateCheckboxes) {
        var refreshCheckboxesEvent = new Event('input');
        let refreshCheckboxesControl = <HTMLInputElement>document.getElementById("redrawCheckboxes");
        refreshCheckboxesControl.value = Math.random().toString();
        refreshCheckboxesControl.dispatchEvent(refreshCheckboxesEvent);
      }
    }
  }

  patientRelatedBleedingRisks(value) {
    let checkValidation = false;
    if (value.changed && value.changed.component && value.changed.component.key == 'noBleedingRisks' && value.data.noBleedingRisks) {
      Object.keys(value.data.patientRelatedBleedingRisk).forEach(element => {
        value.data.patientRelatedBleedingRisk[element] = false;
      });

      Object.keys(value.data.admissionRelatedBleedingRisk).forEach(element => {
        value.data.admissionRelatedBleedingRisk[element] = false;
      });
    }



    if (value.changed && value.changed.component && value.changed.component.key == 'patientRelatedBleedingRisk') {
      let changeStauts = false;
      Object.keys(value.data.patientRelatedBleedingRisk).forEach(element => {
        if (value.data.patientRelatedBleedingRisk[element] == true) {
          changeStauts = true;
          checkValidation = true;
        }
      });

      if (changeStauts = true) {
        value.data['noBleedingRisks'] = false;
      }

    }

    if (value.changed && value.changed.component && value.changed.component.key == 'admissionRelatedBleedingRisk') {
      let changeStauts = false;
      Object.keys(value.data.admissionRelatedBleedingRisk).forEach(element => {
        if (value.data.admissionRelatedBleedingRisk[element] == true) {
          changeStauts = true;
          checkValidation = true;
        }
      });

      if (changeStauts = true) {
        value.data['noBleedingRisks'] = false;
      }

    }

    //This will happens only once
    if (checkValidation || value.data['noBleedingRisks']) {
      const updateCheckboxes = document.getElementById("redrawCheckboxes");
      if (updateCheckboxes) {
        var refreshCheckboxesEvent = new Event('input');
        let refreshCheckboxesControl = <HTMLInputElement>document.getElementById("redrawCheckboxes");
        refreshCheckboxesControl.value = Math.random().toString();
        refreshCheckboxesControl.dispatchEvent(refreshCheckboxesEvent);
      }
    }
  }

  contraIndications(value) {
    let checkValidation = false;
    if (value.changed && value.changed.component && value.changed.component.key == 'noContraIndications' && value.data.noContraIndications) {
      Object.keys(value.data.contraIndicationsAES).forEach(element => {
        value.data.contraIndicationsAES[element] = false;
      });

      Object.keys(value.data.contraIndicationsLMWH).forEach(element => {
        value.data.contraIndicationsLMWH[element] = false;
      });

      Object.keys(value.data.contraIndicationsAspirin).forEach(element => {
        value.data.contraIndicationsAspirin[element] = false;
      });

      Object.keys(value.data.contraIndicationsAdditional).forEach(element => {
        value.data.contraIndicationsAdditional[element] = false;
      });
    }

    if (value.changed && value.changed.component && value.changed.component.key == 'noContraindications' && value.data.noContraindications) {
      Object.keys(value.data.contraIndicationsAESSCD).forEach(element => {
        value.data.contraIndicationsAESSCD[element] = false;
      });

      Object.keys(value.data.contraIndicationsLMWH).forEach(element => {
        value.data.contraIndicationsLMWH[element] = false;
      });
    }

    if (value.changed && value.changed.component && value.changed.component.key == 'contraIndicationsAES') {
      let changeStauts = false;
      Object.keys(value.data.contraIndicationsAES).forEach(element => {
        if (value.data.contraIndicationsAES[element] == true) {
          changeStauts = true;
          checkValidation = true;
        }
      });

      if (changeStauts = true) {
        value.data['noContraIndications'] = false;
      }

    }

    if (value.changed && value.changed.component && value.changed.component.key == 'contraIndicationsAESSCD') {
      let changeStauts = false;
      Object.keys(value.data.contraIndicationsAESSCD).forEach(element => {
        if (value.data.contraIndicationsAESSCD[element] == true) {
          changeStauts = true;
          checkValidation = true;
        }
      });

      if (changeStauts = true) {
        value.data['noContraindications'] = false;
      }

    }

    if (value.changed && value.changed.component && value.changed.component.key == 'contraIndicationsLMWH') {
      let changeStauts = false;
      Object.keys(value.data.contraIndicationsLMWH).forEach(element => {
        if (value.data.contraIndicationsLMWH[element] == true) {
          changeStauts = true;
          checkValidation = true;
        }
      });

      if (changeStauts = true) {
        value.data['noContraIndications'] = false;
      }

    }

    if (value.changed && value.changed.component && value.changed.component.key == 'contraIndicationsLMWH') {
      let changeStauts = false;
      Object.keys(value.data.contraIndicationsLMWH).forEach(element => {
        if (value.data.contraIndicationsLMWH[element] == true) {
          changeStauts = true;
          checkValidation = true;
        }
      });

      if (changeStauts = true) {
        value.data['noContraindications'] = false;
      }

    }

    if (value.changed && value.changed.component && value.changed.component.key == 'contraIndicationsAspirin') {
      let changeStauts = false;
      Object.keys(value.data.contraIndicationsAspirin).forEach(element => {
        if (value.data.contraIndicationsAspirin[element] == true) {
          changeStauts = true;
          checkValidation = true;
        }
      });

      if (changeStauts = true) {
        value.data['noContraIndications'] = false;
      }

    }

    if (value.changed && value.changed.component && value.changed.component.key == 'contraIndicationsAdditional') {
      let changeStauts = false;
      Object.keys(value.data.contraIndicationsAdditional).forEach(element => {
        if (value.data.contraIndicationsAdditional[element] == true) {
          changeStauts = true;
          checkValidation = true;
        }
      });

      if (changeStauts = true) {
        value.data['noContraIndications'] = false;
      }

    }

    //This will happens only once
    if (checkValidation || (value.data['noContraIndications'] || value.data['noContraindications'])) {
      const updateCheckboxes = document.getElementById("redrawCheckboxes");
      if (updateCheckboxes) {
        var refreshCheckboxesEvent = new Event('input');
        let refreshCheckboxesControl = <HTMLInputElement>document.getElementById("redrawCheckboxes");
        refreshCheckboxesControl.value = Math.random().toString();
        refreshCheckboxesControl.dispatchEvent(refreshCheckboxesEvent);
      }
    }
  }

  newVTERiskFactors(value) {
    let checkValidation = false;
    if (value.changed && value.changed.component && value.changed.component.key == 'noNewThrombosisRisks' && value.data.noNewThrombosisRisks) {
      Object.keys(value.data.newVTERiskFactors).forEach(element => {
        value.data.newVTERiskFactors[element] = false;
      });
    }

    if (value.changed && value.changed.component && value.changed.component.key == 'newVTERiskFactors') {
      let changeStauts = false;
      Object.keys(value.data.newVTERiskFactors).forEach(element => {
        if (value.data.newVTERiskFactors[element] == true) {
          changeStauts = true;
          checkValidation = true;
        }
      });

      if (changeStauts = true) {
        value.data['noNewThrombosisRisks'] = false;
      }

    }

    if (checkValidation || (value.data['noNewThrombosisRisks'])) {
      const updateCheckboxes = document.getElementById("redrawCheckboxes");
      if (updateCheckboxes) {
        var refreshCheckboxesEvent = new Event('input');
        let refreshCheckboxesControl = <HTMLInputElement>document.getElementById("redrawCheckboxes");
        refreshCheckboxesControl.value = Math.random().toString();
        refreshCheckboxesControl.dispatchEvent(refreshCheckboxesEvent);
      }
    }
  }

  newBleedingRiskFactors(value) {
    let checkValidation = false;
    if (value.changed && value.changed.component && value.changed.component.key == 'noNewBleedingRisks' && value.data.noNewBleedingRisks) {
      Object.keys(value.data.newBleedingRiskFactors).forEach(element => {
        value.data.newBleedingRiskFactors[element] = false;
      });
    }

    if (value.changed && value.changed.component && value.changed.component.key == 'newBleedingRiskFactors') {
      let changeStauts = false;
      Object.keys(value.data.newBleedingRiskFactors).forEach(element => {
        if (value.data.newBleedingRiskFactors[element] == true) {
          changeStauts = true;
          checkValidation = true;
        }
      });

      if (changeStauts = true) {
        value.data['noNewBleedingRisks'] = false;
      }

    }

    if (checkValidation || (value.data['noNewBleedingRisks'])) {
      const updateCheckboxes = document.getElementById("redrawCheckboxes");
      if (updateCheckboxes) {
        var refreshCheckboxesEvent = new Event('input');
        let refreshCheckboxesControl = <HTMLInputElement>document.getElementById("redrawCheckboxes");
        refreshCheckboxesControl.value = Math.random().toString();
        refreshCheckboxesControl.dispatchEvent(refreshCheckboxesEvent);
      }
    }
  }

  DownloadUrl(url, filename) {
    console.log("image capture start");
    var a = document.createElement("a");
    document.body.appendChild(a);
    //@ts-ignore
    a.style = "display: none";
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    console.log("image capture end");
  }

  onCancel(isAddEditMode: boolean) {
    this.fetchAll();
    if (isAddEditMode) {
      if (confirm("This will cancel any changes, do you want to continue?")) {
        this.generatedForm = null;
        this.showForm = false;
        this.isAddEditMode = false;
      }
    }
    else {
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
    if (this.resetDeleteFormButton) {
      this.resetDeleteFormButton.nativeElement.click();
    }
  }


  createRoleFilter(decodedToken: any) {
    let condition = "";
    let pm = new filterParams();
    let synapseroles;
    if (this.appService.moduleConfig.siteSettings.prodbuild)
      synapseroles = decodedToken.SynapseRoles
    else
      synapseroles = decodedToken.client_SynapseRoles
    if (!Array.isArray(synapseroles)) {
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
  createassmentFilter() {
    let condition = "";
    let pm = new filterParams();
    let synapseroles;
    if (this.fltrAssessmentTypes.length > 0) {
      condition = "person_id = @personId and (";
      pm.filterparams.push(new filterparam("personId", this.appService.personId));
    } else {
      condition = "person_id = @personId";
      pm.filterparams.push(new filterparam("personId", this.appService.personId));
    }
    for (var i = 0; i < this.fltrAssessmentTypes.length; i++) {
      condition += "formbuilderform_id = @formbuilderform_id" + i + " or ";
      pm.filterparams.push(new filterparam("formbuilderform_id" + i, this.fltrAssessmentTypes[i].formbuilderform_id));
    } if (this.fltrAssessmentTypes.length > 0) {
      condition = condition.substring(0, condition.length - 3,);
      condition = condition + ")"
    }
    condition = condition.replace(/^\or+|\or+$/g, '');


    let f = new filters();
    f.filters.push(new filter(condition));


    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY createddatetime DESC");

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
    this.appService.reset();
    this.moduleObservables.unload.next("app-assessments-module");
  }

  loadAssessments(lazyEvent: LazyLoadEvent) {
    let filterColumn: string = null;
    this.lazyEvent = lazyEvent;
    if (lazyEvent === undefined || this.allDBAssessments.length < 1) {
      return;
    }

    //Session pf primeng table can handle - but make sure this works on primeng upgrade
    //this.manageTableState(lazyEvent);
    //let event = this.tableEventState;
    //Uncommennt above two lines and comment below line if inbuilt primeng table session does not work
    let event = lazyEvent;
    if (event && event.filters && event.filters.formname && event.filters.formname.value) {
      this.filteredAssessments = this.allDBAssessments.filter(x => x.formbuilderform_id == event.filters.formname.value.formbuilderform_id)
    }
    else {
      this.filteredAssessments = this.allDBAssessments;
    }
    if (lazyEvent.sortField && this.appService.moduleConfig.Environment == "social_care" && lazyEvent.sortField == "createddatetime") {
      lazyEvent.sortField = "startdatetime"
    }
    if (lazyEvent.sortField && this.appService.moduleConfig.Environment == "social_care" && lazyEvent.sortField == "_createdby") {
      lazyEvent.sortField = "_assessorname"
    }
    this.filteredAssessments.sort(sortByProperty(lazyEvent.sortField, lazyEvent.sortOrder));
    this.filteredAssessments = this.filteredAssessments.slice(lazyEvent.first, lazyEvent.first + lazyEvent.rows)

    this.filterCol = '';
    this.filterVal = '';

    if (event && event.filters && event.filters.formname && event.filters.formname.value && event.filters.formname.value.formbuilderform_id) {
      filterColumn = `formbuilderform_id='${event.filters.formname.value.formbuilderform_id}'`;
      this.filterCol = 'formbuilderform_id';
      this.filterVal = event.filters.formname.value.formbuilderform_id;
    }

    this.pageNumber = (event.first / event.rows);
    this.pageSize = event.rows;
    this.sortColumn = event.sortField;
    this.sortOrder = event.sortOrder;
    this.filterColumnComposed = filterColumn;


  }

  manageTableState(lazyEvent: LazyLoadEvent) {
    this.changeDetector.detectChanges();

    if (this.tableEventState && this.fromPrevTableState) {
      this.assessTbl.filters = this.tableEventState.filters;
      this.assessTbl.first = this.tableEventState.first;
      this.assessTbl.rows = this.tableEventState.rows;
      this.assessTbl.sortField = this.tableEventState.sortField;
      this.assessTbl.sortOrder = this.tableEventState.sortOrder;
      //Unable to find the exact method to refresh - Resorted to direct dom manipulation
      let th = this.elRef.nativeElement.querySelector(`th[ng-reflect-field="${this.tableEventState.sortField}"]`);
      let thICon = this.elRef.nativeElement.querySelector(`th[ng-reflect-field="${this.tableEventState.sortField}"]  p-sorticon i`);
      if (th && thICon) {
        th.className = `${th.className} p-highlight`;
        thICon.className = `${thICon.className} ${this.sortOrder == -1}? pi-sort-amount-down-alt: pi-sort-amount-up-alt`;
      }
    }
    else {
      this.tableEventState = lazyEvent;
    }
    this.fromPrevTableState = false;
  }
  GetFormResponseObject(assessment: CoreFormResponse, action: string) {
    this.formImages.images = [];
    this.isLoading = true;
    this.subscriptions.add(
      this.apiRequestService.getRequest(this.appService.moduleConfig.apiEndpoints.GetFormResponseObject + assessment.formbuilderresponse_id)
        .subscribe(
          (response: any) => {
            let fetchedAssessments = JSON.parse(response);;
            assessment.formresponse = fetchedAssessments.formresponse;
            assessment.formcomponents = fetchedAssessments.formcomponents

            const configGlobalURL = new RegExp('configGlobalURL', "g");
            const URL = new RegExp(this.appService.moduleConfig.siteSettings.dynamicApiURIRegExp, "g")
            const configBearerAuthToken = new RegExp('Bearer [a-zA-Z0-9-_.]*', "g");
            const assessor = this.assessors.find(x => x.assessorid == assessment.assessorid);

            assessment._assessorname = assessor ? (assessor.firstname + " " + assessor.surname) : "";
            assessment.formcomponents = assessment.formcomponents.replace(configGlobalURL, this.appService.moduleConfig.apiEndpoints.dynamicApiURI);
            assessment.formcomponents = assessment.formcomponents.replace(URL, this.appService.moduleConfig.apiEndpoints.dynamicApiURI);
            assessment.formcomponents = assessment.formcomponents.replace(configBearerAuthToken, "Bearer " + this.bearerAuthToken);
            this.isLoading = false;
            if (action == "View") {
              this.onViewAssessment(assessment)
            }
            else if (action == "Edit") {
              if(this.appService.moduleConfig.Environment == "social_care") {
                this.dr.getClient((client) => {
                  // console.log('client',client);
                  if(this.appService.moduleConfig.Environment == "social_care") {
                    if(client.__personCommissioner[0].commissioner_id == '9ef56fac-520a-4d2a-9524-0281c58d31ac') {
                      this.showAssessmentSource = true
                    }
                    else {
                      this.showAssessmentSource = false;
                    }
                  }
                  
                  if (assessment.formbuilderform_id == "7d0c118f-1b01-6881-39d4-3c5fe4a80678") {
                    assessment = this.updateClientdetailsForOtAssessment(client, assessment)
                  }
                  
  
                });
              }
              this.onEditAssessment(assessment)

            }
            else if (action == "Delete") {
              this.onConfirmDeleteAssessment(assessment)
            }
            else if (action == "cancel") {
              this.oncancelAssessment(assessment)
            }
            else if (action == "reschedule") {
              this.onReschedule(assessment)
            }

          }
        )
    );
  }
  fetchAll() {
    let sortColumn = this.sortColumn;
    let filterColumn = this.filterColumnComposed;

    this.isLoading = true;

    if (!filterColumn && this.fltrAssessmentTypes && this.fltrAssessmentTypes.length > 0) {
      this.fltrAssessmentTypes.forEach(element => {
        if (!filterColumn) {
          filterColumn = `formbuilderform_id='${element.formbuilderform_id}'`;
        }
        else {
          filterColumn = filterColumn + ' OR ' + `formbuilderform_id='${element.formbuilderform_id}'`;
        }
      });
    }

    let objDic = {};
    this.assessmentTypes.forEach(assessmentType => {
      if (assessmentType.formbuilderform_id)
        objDic[assessmentType.formbuilderform_id] = assessmentType.formname;
    });

    sortColumn = sortColumn || 'createddatetime';

    let url: string = `${this.appService.moduleConfig.apiEndpoints.patientAssessmentsUrl}`;

    this.subscriptions.add(
      this.apiRequestService.postRequest(`${url}`, this.createassmentFilter())
        .subscribe(
          (response: any) => {
            let fetchedAssessments = response;

            if (fetchedAssessments) {

              this.allDBAssessments = fetchedAssessments.map(rec => {
                if (this.assessors.find(x => x.assessorid == rec.assessorid)) {
                  rec._assessorname = this.assessors.find(x => x.assessorid == rec.assessorid).firstname + " " + this.assessors.find(x => x.assessorid == rec.assessorid).surname
                }
                else {
                  rec._assessorname = "";
                }
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

                if (components && Array.isArray(components)) {
                  const formcomponentsObj = components.map(comp => {
                    if (comp && comp.key == 'completedByName')
                      comp.disabled = true;
                    return comp;
                  });

                  rec.formcomponents = JSON.stringify(formcomponentsObj);
                }

                return rec;
              });
            }
            else {
              this.filteredAssessments = [];
            }


            if (this.allDBAssessments.length > 0) {
              this.totalAssessmentCount = this.allDBAssessments.length;
            }
            else {
              this.totalAssessmentCount = 0;
            }
            this.loadAssessments(this.lazyEvent);
            this.isLoading = false;
          }
        )
    );

    if(this.appService.moduleConfig.Environment == "social_care") {
      this.dr.getClient((client) => {
        if (client) {
          this.clientFullName = client.firstname + ' ' + client.familyname;
        }
      });
    }
    
  }


  fetchTotalAssessmentCount(cb?: any) {
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

    if (!this.filterCol && this.fltrAssessmentTypes && this.fltrAssessmentTypes.length > 0) {
      for (var i = 0; i < this.fltrAssessmentTypes.length; i++) {
        filter = filter ? filter + " or formbuilderform_id = @formbuilderform_id" + i + " " : " formbuilderform_id = @formbuilderform_id" + i + "";
        filterParams.push(new filterparam("formbuilderform_id" + i, this.fltrAssessmentTypes[i].formbuilderform_id));
      }
    }
    else {
      if (this.filterCol) {
        filter = " formbuilderform_id = '" + this.filterVal + "' ";
        // filterParams.push({
        //   "paramName": this.filterCol,
        //   "paramValue": this.filterVal
        // });
      }
    }

    let filterClause = "(person_id = @personId) AND ((responsestatus = 'submitted' OR responsestatus = 'Deleted') OR (responsestatus = 'draft' AND _createdby = @createdBy))"

    if (filter) {
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
            else {
              this.totalAssessmentCount = 0;
            }

            if (cb) {
              cb();
            }
          }
        )
    );
  }

  getEncounters() {
    if (this.appService.moduleConfig.Environment == "social_care") {
      this.appService.encounterId = null
    }
    else {
      let url = `${this.appService.moduleConfig.apiEndpoints.dynamicApiURI}/GetBaseViewListByPost/bv_core_inpatientappointments`;

      this.apiRequestService.postRequest(url, this.createEncounterFilter())
        .subscribe(encList => {
          if (encList && Array.isArray(encList) && encList.length > 0) {
            let encountersFromSvc: Encounter[] = [];

            let activeInpatientEncounter = encList.filter(rec => rec.patientclasscode && (rec.patientclasscode.toLowerCase() == 'ip' || rec.patientclasscode.toLowerCase() == 'i')
              && rec.dischargedatetime == null
              && rec.episodestatuscode && rec.episodestatuscode.toLowerCase() != 'cancelled');

            this.appService.encounterId = null;

            if (activeInpatientEncounter && activeInpatientEncounter.length > 0) {
              this.appService.encounterId = activeInpatientEncounter[0].encounter_id;
            }

          }
          else {
            this.appService.encounterId = null;

          }

        });
    }
  }
  OnWhatThreeWordsUnLoad(event) {
    //console.log("Called1");

  }
  OnWhatThreeWordsLoadComplete(event) {
    // console.log("Called2");

  }
  WhatThreeWordsUnloadWithResult(event) {
    let whatthreewordscontrol;
    if (this.whatthreewordsclickedvalue) {
      if (this.whatthreewordsclickedvalue.startsWith('search_')) {
        whatthreewordscontrol = this.whatthreewordsclickedvalue.replace('search_', '');
      }
      else {
        whatthreewordscontrol = 'whatThreeWords';
      }
      this.submission["data"][whatthreewordscontrol] = event.detail;
    }
    const whatthreewordscontrolname = "data[" + whatthreewordscontrol + "]";
    let elements = document.getElementsByName(whatthreewordscontrolname);
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i] as HTMLInputElement;
      element.value = event.detail;
    }
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

  printOTAssessment() {
    this.isPrinting = true;
  }

  pdfDownloaded() {

    // this.destroyTemplate.emit('true');
    this.isPrinting = false;
    this.changeDetector.detectChanges();
  }

  async getAllDropdown() {
    this.subscriptions.add(this.apiRequestService.getRequest(this.appService.moduleConfig.apiEndpoints.getAllDropdownUrl)
      .subscribe(
        (response: any) => {
          let com = JSON.parse(response);
          // this.appService.commissioner = [];
          // this.appService.gender = [];
          // this.appService.ethenic = [];
          // this.appService.maritalstatus = [];
          // this.appService.religion = [];
          // this.appService.relationship = [];
          // this.appService.roles = [];
          // this.appService.commissioner.push(...JSON.parse(com[0].commissioner));
          this.appService.gender.push(...JSON.parse(com[0].gender));
          this.appService.ethenic.push(...JSON.parse(com[0].ethenic));
          this.appService.maritalstatus.push(...JSON.parse(com[0].maritalstatus));
          this.appService.religion.push(...JSON.parse(com[0].religion));
          this.appService.accommodationtype.push(...JSON.parse(com[0].accommodationtype));
          this.appService.tenureofproperty.push(...JSON.parse(com[0].tenureofproperty));
          // this.relationship.push(...JSON.parse(com[0].relationship));
          this.appService.roles.push(...JSON.parse(com[0].roles));
          this.appService.isdcode.push(...JSON.parse(com[0].isdcode));
          this.appService.assessmentsource.push(...JSON.parse(com[0].assessmentsource));
        }));
  }


  cancelAssessments(confirm) {
    if (confirm) {
      let assessmentType;
      let assessorName;
      this.isLoading = true;
      this.cancelAssessment.responsestatus = "cancelled";
      assessmentType = this.cancelAssessment.formname;
      assessorName = this.cancelAssessment._assessorname;
      Object.keys(this.cancelAssessment).map((e) => {
        if (e.startsWith('formname')) delete this.cancelAssessment[e];
        if (e.startsWith('_assessorname')) delete this.cancelAssessment[e];
      });
      this.cancelAssessment._createdby = this.appService.loggedInUserName;
      this.subscriptions.add(
        this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.formBuilderResponsePostUrl, this.cancelAssessment)
          .subscribe(
            async () => {
              let clientDetails = await firstValueFrom(this.apiRequestService.getRequest(this.appService.moduleConfig.apiEndpoints.getClientCommunicationUri + this.appService.personId));
              clientDetails = JSON.parse(clientDetails);
              if (clientDetails != null && clientDetails.person_id) {
                await this.notificationService.cancelNotifyClient(this.cancelAssessment.formbuilderresponse_id,
                  moment(this.cancelAssessment.startdatetime).format("DD/MM/YYYY HH:mm"),
                  clientDetails.title + ' ' + clientDetails.surname,
                  clientDetails.email,
                  clientDetails.phonenumber,
                  assessmentType,
                  assessorName
                );
              }
              this.fetchAll();
              this.emitFrameworkEvent("REFRESH_BANNER");
            }
          ));
    }
    this.modalService.dismissAll();
  }

  open(content) {
    this.modalService.open(content, { size: 'dialog-centered', backdrop: 'static' }).result.then((result) => {
    }, (reason) => {
    });
  }

  // GetImageKeyforComponent(component, keyoverride?) {
  //   let rownum = -1; //non grid element
  //   let key = keyoverride ? keyoverride : component.key;
  //   if (component.row) {
  //     //grid element
  //     rownum = component.row.split('-')[0];
  //   }
  //   return this.formResponse.formbuilderresponse_id + "/" + key + "::" + rownum
  // }

  GetImageKeyforComponent(c, keyoverride?) {
    let rownum = "-1"; //non grid element
    let key = keyoverride ? keyoverride : c.component.key;

    //get grid or multilivel grid indices 
    const regex = /\[\d+\]/g;
    let matches = [];
    let inputString = "";
    if (c.instance && c.instance.path) {
      inputString = c.instance.path;
    }
    else if (c.event.srcElement && c.event.srcElement.name) {
      inputString = c.event.srcElement.name;
    }
    if (inputString) {
      matches = inputString.match(regex);
    }

    if (matches && matches.length) {
      const extractedPositionNumbers = matches.map(match => match.match(/\d+/)[0]);
      rownum = extractedPositionNumbers.join("::");
    }
    else {
      if (c.component.row) {
        //grid element
        rownum = c.component.row.split('-')[0];
      }
    }

    return this.formResponse.formbuilderresponse_id + "/" + key + "::" + rownum
  }

  GetImageKey(rownum, key) {
    return this.formResponse.formbuilderresponse_id + "/" + key + "::" + rownum
  }

  FormReady(e) {
    this.forminstance = e;
  }

}



class ImageData {
  constructor(public name: string,
    public originalName: string,
    public size: number,
    public storage: string,
    public type: string,
    public url: string) {

  }
}

class FormImage {
  public uploadedtoAws;
  constructor(public imageKey, public awsPath?, public base64Data?, isVideo = false, public isDeleted = false) {

  }
}
class FormImages {
  constructor() {
  }
  images: Array<FormImage> = [];

  Push(image: FormImage) {
    let existing = this.images.find(x => x.imageKey == image.imageKey)
    if (existing) {
      image.uploadedtoAws = existing.uploadedtoAws;
      this.RemoveImage(image.imageKey);
    }
    this.images.push(image);
  }

  Get(imageKey: string) {
    return this.images.find(x => x.imageKey == imageKey);
  }

  Delete(imageKey) {
    //if image is uploaded to AWS, mark for deletion 
    //else remove from list
    let image = this.images.find(x => x.imageKey == imageKey)
    if (image && image.uploadedtoAws) {
      image.isDeleted = true;
    }
    else {
      this.RemoveImage(imageKey)
    }
  }

  RemoveImage(imageKey) {
    let index = this.GetIndex(imageKey);
    if (index != -1) {
      this.images.splice(index, 1);
    }
  }

  private GetIndex(imageKey) {
    return this.images.indexOf(this.images.find(x => x.imageKey == imageKey));
  }

  async SyncToAWS_Synchronous(awsS3client) {
    //delete first
    const deleteList = this.images.filter(x => x.isDeleted == true);
    for (const d of deleteList) {
      //delete command aws
      try {
        await awsS3client.DeleteMedia(d.awsPath);
      }
      catch (e) {
        console.log("aws delete error:");
        console.log(e);
      }
    }

    const addUpdateList = this.images.filter(x => x.isDeleted != true);
    for (const au of addUpdateList) {
      //put command aws 
      try {
        await awsS3client.UploadMedia(au.awsPath, au.base64Data);
      }
      catch (e) {
        console.log("aws upload error:");
        console.log(e);
      }
    }
  }

  async SyncToAWS(awsS3client) {
    //delete first
    const deleteList = this.images.filter(x => x.isDeleted == true);
    if (deleteList.length! - 0) {
      //delete command aws
      try {
        await awsS3client.DeleteMediaAsync(deleteList.map(x => x.awsPath));
      }
      catch (e) {
        console.log("aws delete error:");
        console.log(e);
      }
    }

    const addUpdateList = this.images.filter(x => x.isDeleted != true);
    if (addUpdateList.length != 0) {
      //put command aws 
      try {
        return await awsS3client.UploadMediaAsync(addUpdateList.map(x => { return { "key": x.awsPath, "body": x.base64Data } }));
      }
      catch (e) {
        console.log("aws upload error:");
        console.log(e);
      }
    }
  }
}
