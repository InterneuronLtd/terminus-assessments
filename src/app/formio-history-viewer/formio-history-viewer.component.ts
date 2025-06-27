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
import { Component, Input, OnInit, ViewEncapsulation, HostListener } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subscription } from 'rxjs';
import { CoreFormResponse, CoreFormresponsemediaversion } from '../models/entities/core-form-response.model';
import { ApirequestService } from '../../services/api-request.service';

import { AppService } from '../../services/app.service';
import { FormioForm, FormioOptions } from '@formio/angular';
import { IconsService } from 'src/services/icons.service';
import { filter, filterParams, filterparam, filters, orderbystatement, selectstatement } from '../models/synapse-dynamic-api/Filter.model';
import * as $ from 'jquery';

@Component({
  selector: 'app-formio-history-viewer',
  templateUrl: './formio-history-viewer.component.html',
  styleUrls: ['./formio-history-viewer.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class FormioHistoryViewerComponent implements OnInit {


  @Input() title: string;
  @Input() message: string;
  @Input() btnOkText: string;
  @Input() btnCancelText: string;
  @Input() formContextKey: string;

  getAssessmentHistoryURI: string;

  historyList: CoreFormResponse[];
  historyForm: CoreFormResponse;

  historyView: string;

  generatedForm: FormioForm;

  public formioOptions: FormioOptions = {
    'disableAlerts': true
  };

  //public options: FormioOptions;
  options: Object = {
    submitMessage: "",
    disableAlerts: true,
    noAlerts: true,
    readOnly: true
  }

  submission: any;

  //API Variables
  //globalURL: string = this.appService.baseURI;
  careRecordURL: string = this.appService.moduleConfig.apiEndpoints.careRecordURI;
  terminologyURL: string = this.appService.moduleConfig.apiEndpoints.terminologyURI;
  autonomicURL: string = this.appService.moduleConfig.apiEndpoints.autonomicURI;
  imageServerURL: string = this.appService.moduleConfig.apiEndpoints.imageServerURI;
  bearerAuthToken: string;

  subscriptions: Subscription = new Subscription();
  topPosToStartShowing = 100;
  isShow: boolean;

  constructor(private activeModal: NgbActiveModal,
    public appService: AppService,
    private apiRequest: ApirequestService,
    private spinner: NgxSpinnerService,
    public icons: IconsService) { }

  ngOnInit() {
    this.historyView = 'list';
    //this.bearerAuthToken = 'bearer '+ this.appService.apiServiceReference.authService.user.access_token;
    this.getAssessmentHistoryURI = this.appService.moduleConfig.apiEndpoints.getAssessmentHistoryURI + this.formContextKey;
    console.log(this.getAssessmentHistoryURI);
    this.GetFormHistory();
  }

  async GetFormHistory() {
    this.spinner.show("form-history-spinner");
    await this.subscriptions.add(
      this.apiRequest.getRequest(this.getAssessmentHistoryURI)
        .subscribe((response) => {
          var resp = JSON.parse(response);
          this.historyList = resp.reverse();
          this.spinner.hide("form-history-spinner");
        })
    )
  }

  public decline() {
    this.activeModal.close(false);
  }

  public accept() {
    this.activeModal.close(true);
  }

  public dismiss() {
    this.activeModal.dismiss();
  }

  async viewHistoryForm(obj: any) {
    this.historyView = 'form';
    this.historyForm = obj;

    //Make readonly
    var resp = [];
    for (const control of JSON.parse(this.historyForm.formcomponents)) {
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

    this.historyForm.formcomponents = JSON.stringify(resp);
    //get form images version and get images from aws 
    this.GetMediaVersions(this.historyForm.formbuilderresponse_id, this.historyForm.lastupdateddatetime, async (e) => {

      let frp = await this.PrepareImagesFromAWS(JSON.parse(this.historyForm.formresponse), e);
      this.historyForm.formresponse = JSON.stringify(frp);

      this.generatedForm = { components: JSON.parse(this.historyForm.formcomponents) };

      this.submission = this.buildDataObject();
    })



  }

  GetAllMediaControls(submissionData, controls = [], rownum = -1): Array<any> {
    Object.keys(submissionData).forEach((d) => {
      const control = submissionData[d];
      if (Array.isArray(control)) {
        if (d.startsWith("addPhoto_") || d.startsWith("addVideo_") || d.startsWith("addMeasure_")) { //root level media control
          control.forEach((mc) => {
            controls.push({ file: mc, key: d, rownumber: rownum });
          });
        }
        else //grid level media control
        {
          control.forEach((gridElement, index) => {
            this.GetAllMediaControls(gridElement, controls, index);
          });
        }
      }
    });
    return controls;
  }

  async PrepareImagesFromAWS(submissionData, versions: Array<CoreFormresponsemediaversion>) {

    let allMediaControls = this.GetAllMediaControls(submissionData);
    let awskeys = []
    for (const filecontrol of allMediaControls) {
      let key = filecontrol.key;
      let rownumber = filecontrol.rownumber;
      let awskey = this.GetImageKey(rownumber, key)
      let awsversion = versions.find(x => x.awskey == awskey);
      if (awsversion) {
        let awskeyswithversion = { key: awskey, versionid: awsversion.awsversionid };
        awskeys.push(awskeyswithversion);
      }

      //get aws image by key
      //let imageBase64 = await this.appService.awsS3client.DownloadMedia(awsKey);
    }
    if (awskeys.length != 0) {
      await this.appService.awsS3client.DownloadMediaAsync_Versioned(awskeys).then(
        (results) => {
          for (const filecontrol of allMediaControls) {
            let key = filecontrol.key;
            let rownumber = filecontrol.rownumber
            let awsKey = this.GetImageKey(rownumber, key);
            let result = results.find(x => x.key.key == awsKey);
            if (result) {
              filecontrol.file.url = result.data;
            }
          }
        });
    }
    return submissionData;
  }
  GetImageKey(rownum, key) {
    return this.historyForm.formbuilderresponse_id + "/" + key + "::" + rownum
  }

  dataObjectString: any;
  initialdataObjectString: string;
  dataObject: any;

  buildDataObject() {

    this.dataObject = JSON.parse('{"data":' + this.historyForm.formresponse + '}');
    this.dataObject["data"]["configBearerAuthToken"] = this.bearerAuthToken;
    //this.dataObject["data"]["submit"] = false;

    //this.dataObject["data"]["configGlobalURL"] = this.globalURL;
    this.dataObject["data"]["configAutonomicURL"] = this.autonomicURL;
    this.dataObject["data"]["configTerminologyURL"] = this.terminologyURL;
    this.dataObject["data"]["configImageServerURL"] = this.imageServerURL;
    this.dataObject["data"]["configCareRecordURL"] = this.careRecordURL;


    //this.dataObject["data"]["configUserUsername"] =  jwtDecode(this.appService.apiService.authService.user.access_token)["IPUId"];
    //this.dataObject["data"]["configUserDisplayName"] = jwtDecode(this.appService.apiService.authService.user.access_token)["name"];
    //console.log(this.dataObject);

    //delete this.dataObject["data"]["submit"];

    //console.log(this.dataObject);

    return this.dataObject;
  }

  onRender() {
    //console.log('onRender');
    $('.scrollToTopButton').hide();
    window.addEventListener("scroll", function () {
      let scroll = this.scrollY;
      // console.log('scroll');
      if (scroll > 20) {
        $('.scrollToTopButton').show();
      } else {
        $('.scrollToTopButton').hide();
      }
    });
  }

  onChange(value: any) {
    //console.log('onChange');
    //console.log(value);
    // if ((value.changed && value.changed.component && (value.changed.component.type == "file" || value.changed.component.type == "editgrid" || value.changed.component.type == "tabs")) ||
    //   !value.changed) {
    //   setTimeout(() => {
    //     Object.keys(this.submission.data).forEach(control => {
    //       if (control.startsWith("addPhoto_") || control.startsWith("addMeasure_")) {
    //         if (Array.isArray(this.submission.data[control]) && this.submission.data[control].length != 0
    //           && this.submission.data[control][0].hasOwnProperty("originalName")
    //           && this.submission.data[control][0].hasOwnProperty("url")) {
    //           const downloadButton = document.getElementById(control);
    //           if (downloadButton) {
    //             let newDownloadButton = downloadButton.cloneNode(true);
    //             //@ts-ignore
    //             newDownloadButton.disabled = false;
    //             downloadButton.parentNode.replaceChild(newDownloadButton, downloadButton);
    //             newDownloadButton.addEventListener('click', _e => {
    //               console.log(this.submission.data[control]);
    //               this.DownloadUrl(this.submission.data[control][0].url,
    //                 this.submission.data[control][0].originalName);
    //             });
    //           }
    //         }
    //       }
    //       else {//edit grids
    //         const gridObject = this.submission.data[control];
    //         if (Array.isArray(gridObject)) {
    //           gridObject.forEach(set => {
    //             Object.keys(set).forEach(question => {
    //               if (question.startsWith("addPhoto_") || question.startsWith("addMeasure_") || question.startsWith("addVideo_")) {
    //                 if (Array.isArray(set[question]) && set[question].length != 0 &&
    //                   set[question][0].hasOwnProperty("originalName") &&
    //                   set[question][0].hasOwnProperty("url")) {
    //                   const downloadButton = document.getElementById(set[question][0].originalName);
    //                   if (downloadButton) {
    //                     let newDownloadButton = downloadButton.cloneNode(true);
    //                     downloadButton.parentNode.replaceChild(newDownloadButton, downloadButton);
    //                     newDownloadButton.addEventListener('click', _e => {
    //                       this.DownloadUrl(set[question][0].url, set[question][0].originalName);
    //                     });
    //                   }
    //                 }
    //               }
    //             });
    //           });
    //         }
    //       }
    //     });
    //   }, 500);
    // }
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

  backToList() {
    this.historyForm = null;
    this.submission = null;
    this.historyView = 'list';
  }

  createMediaVersionsFilter(Formresponseid: string, Versiondatetime: string) {
    let condition = "";
    let pm = new filterParams();

    condition = "formresponseid = @formresponseid and versiondatetime = @versiondatetime ::timestamp ";
    pm.filterparams.push(new filterparam("formresponseid", Formresponseid));
    pm.filterparams.push(new filterparam("versiondatetime", Versiondatetime));


    condition = condition.replace(/^\or+|\or+$/g, '');


    let f = new filters();
    f.filters.push(new filter(condition));


    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY versiondatetime DESC");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  GetMediaVersions(Formresponseid: string, Versiondatetime: string, cb: Function) {
    let url: string = `${this.appService.moduleConfig.apiEndpoints.GetformresponseMediaVersion}`;
    this.subscriptions.add(
      this.apiRequest.postRequest(`${url}`, this.createMediaVersionsFilter(Formresponseid, Versiondatetime))
        .subscribe(
          (response: any) => {
            cb(response);
          }
        )
    );
  }

}
