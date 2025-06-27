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
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import * as moment from 'moment';

const pdfMake = require('pdfmake/build/pdfmake.js');
import * as pdfFonts from "pdfmake/build/vfs_fonts";  
import { Subscription } from 'rxjs';
import { ApirequestService } from 'src/services/api-request.service';
import { AppService } from 'src/services/app.service';
import { DataRequest } from 'src/services/datarequest';
declare var require: any;
const htmlToPdfmake = require("html-to-pdfmake");
(<any>pdfMake).vfs = pdfFonts.pdfMake.vfs;

@Component({
  selector: 'app-print-ot-assessment',
  templateUrl: './print-ot-assessment.component.html',
  styleUrls: ['./print-ot-assessment.component.css']
})
export class PrintOTAssessmentComponent implements OnInit, AfterViewInit {

  @Input() customTemplate: TemplateRef<any>;

  @Output() destroyComponent: EventEmitter<any> = new EventEmitter();

  @ViewChild('otAssessmentFormElement')
  otAssessmentFormElement: ElementRef;

  allergyIntoleranceList: any;
  allergiesString: string;
  clientDetails = { fullname: '', born: '', hospitalnumber: '', nhsnumber: '', allergies: '', dob: '', age: '', gendertext: '', address: '', clientIDNumber: '' };

  subscriptions: Subscription = new Subscription();

  constructor(public appService: AppService, private apiRequest: ApirequestService,private dr: DataRequest) { }

  ngOnInit() {
    this.getAllergiesList();
  }

  ngAfterViewInit() {
    this.dr.getClient((client) => {
      console.log(client)
      this.clientDetails = client;
      this.clientDetails.address = client.__personAddresses[0].line1 +', ' + client.__personAddresses[0].line2  +', '+ client.__personAddresses[0].city +', '+ client.__personAddresses[0].countystateprovince +', '+ client.__personAddresses[0].postcodezip;
      this.clientDetails.clientIDNumber = client.__personIdentifiers[0].idnumber;
    });
    setTimeout(() => {
      this.downloadAsPDF();
    }, 1000);
    
  }

  getAllergiesList()
  {
    let getAllergyListForPersonURI = this.appService.moduleConfig.apiEndpoints.baseURI +  "/GetBaseViewListByAttribute/terminus_personallergylist?synapseattributename=person_id&attributevalue=" + this.appService.personId + "&orderby=clinicalstatusvalue ASC, causativeagentcodesystem DESC, _sequenceid DESC";
  
    this.subscriptions.add(
      this.apiRequest.getRequest(getAllergyListForPersonURI)
      .subscribe((response) => {
          let allergies = JSON.parse(response);
          this.allergyIntoleranceList = allergies.filter(x => x.clinicalstatusvalue == 'Active');
          let string = '';
          this.allergyIntoleranceList.forEach(function(element, idx, array) {
            if (idx === array.length - 1){ 
              string += element.causativeagentdescription;
            }
            else{
              string += element.causativeagentdescription + ', ';
            }
          });
          this.allergiesString = string;
      })
    )
  }

  public downloadAsPDF() {
    let disabledLivingAddress = this.appService.moduleConfig.printHeader.address;
    let disabledLivingTelephone = this.appService.moduleConfig.printHeader.telephone;
    let adaptAndLiveLabel = this.appService.moduleConfig.printHeader.adaptAndLiveLabel;
    let adaptAndLiveURL = this.appService.moduleConfig.printHeader.adaptAndLiveURL;
    let hilightLabel = this.appService.moduleConfig.printHeader.hilightLabel;
    let hilightURL = this.appService.moduleConfig.printHeader.hilightURL;
    let hilightEmailLabel = this.appService.moduleConfig.printHeader.hilightEmailLabel;
    let hilightEmail = this.appService.moduleConfig.printHeader.hilightEmail;
    let htmlToPdfOptions = {
      "tableAutoSize": true, 
      "removeExtraBlanks": true, 
      "removeTagClasses": true
    }
    const pdfTable = this.otAssessmentFormElement.nativeElement;
    var html = htmlToPdfmake(pdfTable.innerHTML,htmlToPdfOptions);
    var documentDefinition = { 
      header: (currentPage, pageCount, pageSize) => {
        // you can apply any logic and return any valid pdfmake element
        if(currentPage > 1)
        {
          return {
            columns: [
              { text: ' ' + this.clientDetails.fullname+', ' + this.clientDetails.dob + ', ' + this.clientDetails.gendertext + ', '+ this.clientDetails.clientIDNumber + ', ' + this.clientDetails.address + '\n' + this.allergiesString , alignment : 'center', style: 'header'},
              // { text: ' ' + this.allergiesString , alignment : 'center', style: 'header'},
            ],
            margin: [0,10,0,10],
          } 
        }
        
      },
      footer: function(currentPage, pageCount, pageSize) { 
        let currTime = moment(moment()).format('HH:mm');
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();

        let date =dd + '/' + mm + '/' + yyyy;

          return {
            columns: [
              { text: '' + disabledLivingAddress + '  Telephone : ' + disabledLivingTelephone + '\n '+ adaptAndLiveLabel + adaptAndLiveURL +'  |  '+ hilightLabel + hilightURL +'  |  '+ hilightEmailLabel + hilightEmail +'\n Page '+currentPage.toString() + ' of ' + pageCount + ' Date/Time: ' + date+ ' ' + currTime , alignment : 'center', style: 'footer'},
            ],
            margin: [0, 0, 0, 0],
          } 

        // return 'Page '+currentPage.toString() + ' of ' + pageCount + ' Date/Time: ' + date+ ' ' + currTime; 
      },
      pageMargins: [15, 40, 15, 30],
      // pageOrientation: 'portrait', 
      pageSize: {width: 595, height: 842},
      Times: {
        normal: 'Times-Roman',
        bold: 'Times-Bold',
        italics: 'Times-Italic',
        bolditalics: 'Times-BoldItalic'
      },
      content: html,
      styles: {
        header: {
          fontSize: 8,
          italics: true,
          color: 'grey'
        },
        footer: {
          fontSize: 8,
          italics: true,
          color: 'grey'
        },
      },
    };
    pdfMake.createPdf(documentDefinition).open(); 
     this.destroyComponent.emit('destroy');
     
  }

}
