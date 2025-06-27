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
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { ApirequestService } from 'src/services/api-request.service';
import { AppService } from 'src/services/app.service';

@Component({
  selector: 'app-generate-ot-assessment-html',
  templateUrl: './generate-ot-assessment-html.component.html',
  styleUrls: ['./generate-ot-assessment-html.component.css']
})
export class GenerateOTAssessmentHtmlComponent implements OnInit {

  formComponentData = [];
  formResponseData = [];
  otAssessmentForm = [];
  otAssessmentResponseData = [];
  otAssessmentComponentData = [];
  mainSectionNames = [
    { 'sectionKey': 'assessorInformation', 'sectionName': 'Assessor Information' },
    { 'sectionKey': 'personalInformation', 'sectionName': 'Personal Information' },
    { 'sectionKey': 'careTeam', 'sectionName': 'Care Team' },
    { 'sectionKey': 'clinicalInformation', 'sectionName': 'Clinical Information' },
    { 'sectionKey': 'assessmentOfNeed', 'sectionName': 'Assessment Of Need' },
    { 'sectionKey': 'mobility', 'sectionName': 'Mobility' },
    { 'sectionKey': 'propertyDetails', 'sectionName': 'Property Details' },
    { 'sectionKey': 'summaryMain', 'sectionName': 'Summary' },
    { 'sectionKey': 'recommendations', 'sectionName': 'Recommendations' }];
  personalInformation: any;
  careTeam: any;
  clinicalInformation: any;
  assessmentOfNeed: any;
  mobility: any;
  propertyDetails: any;
  summary: any;
  reccomendations: any;
  sectionName: any;
  subSectionName: any;
  disabledLivingLogo: Blob;
  hilightLogo: Blob;
  assessorInformation: any;
  personalInformationSubSection: any;
  personalInformationSection: any;
  personalInformationCount: any;
  careTeamSubSection: any;
  careTeamSection: any;
  careTeamCount: any;
  clinicalInformationSubSection1: any;
  clinicalInformationSubSection2: any;
  clinicalInformationSection: any;
  clinicalInformationCount: any;
  // assessmentOfNeedSubSection: any;
  // assessmentOfNeedSection: any;
  // assessmentOfNeedCount: any;
  propertyDetailsCount: any;
  propertyDetailsSubSection1: any;
  propertyDetailsSubSection2: any;
  propertyDetailsSubSection3: any;
  propertyDetailsSubSection4: any;
  propertyDetailsSubSection5: any;
  propertyDetailsSubSection6: any;
  propertyDetailsSubSection7: any;
  propertyDetailsSubSection8: any;
  propertyDetailsSection: any;
  SubSections = [];
  public subscriptions: Subscription = new Subscription();
  p_levels = []

  @Input() set formResponse(value) {

    this.formComponentData = JSON.parse(value.formcomponents).find(x => x.key == "tabs").components

    this.formResponseData = JSON.parse(value.formresponse);
  }

  @Output() destroyTemplate: EventEmitter<any> = new EventEmitter();

  constructor(public appService: AppService,
    public apiRequestService: ApirequestService) { }

  getshowcomponentSubSection(SubSection: string) {
    let isSubsectionadded = this.SubSections.find(x => x.subsectionname == SubSection)
    if (isSubsectionadded) {
      console.log("false")
      return false;
    }
    else {
      this.SubSections.push({ subsectionname: SubSection })
      console.log("true")
      return true;
    }
  }
  ngOnInit() {
    this.p_levels = [];
    this.disabledLivingLogo = this.appService.moduleConfig.printHeader.logo;
    this.hilightLogo = this.appService.moduleConfig.printHeader.hilightLogo;
    // console.log('formComponentData',this.formComponentData);
    // console.log('formResponseData',this.formResponseData);
    this.getResponseKey(this.formResponseData);
    this.getComponentKey(this.formComponentData);
    this.otAssessmentComponentData = this.otAssessmentComponentData.filter(x => x.componentValue);
    this.otAssessmentComponentData = this.otAssessmentComponentData.filter(x => x.componentLabel != "Video")
    this.otAssessmentComponentData = this.otAssessmentComponentData.filter(x => x.componentLabel != "refreshGridsEvent" && x.componentLabel != "setCommissionerValue")

    this.otAssessmentComponentData.forEach(function (Ticket) {
      if (Ticket.componentValue && Ticket.componentLabel == 'DOB' || Ticket.componentLabel == "When was your  last fall?") {
        Ticket.componentValue = moment(Ticket.componentValue).format("DD/MM/YYYY");

      }
      if (Ticket.componentValue && (Ticket.componentLabel == "Assessment date / time" || Ticket.componentLabel == "New date / time" || Ticket.componentLabel == "Date of last LOLER check ")) {
        Ticket.componentValue = moment(Ticket.componentValue).format("DD/MM/YYYY hh:mm a");
      }
    });
    console.log('otAssessmentResponseData', this.otAssessmentResponseData);
    console.log('otAssessmentComponentData', this.otAssessmentComponentData);

    this.assessorInformation = this.otAssessmentComponentData.filter(x => x.componentSection == 'Assessor Information');
    for (let c of this.assessorInformation) {
      if (c.componentSubSection.trim() == "") {
        continue;
      }
      else {
        let isSubsectionadded = this.SubSections.find(x => x.subsectionname == c.componentSubSection)
        if (isSubsectionadded) {
          c.componentSubSection = "";
        } else {
          this.SubSections.push({ subsectionname: c.componentSubSection })
        }
      }
    }
    this.SubSections = [];
    this.personalInformation = this.otAssessmentComponentData.filter(x => x.componentSection == 'Personal Information');
    // const personalInformationUnique = [...new Set(this.personalInformation.map(item => item.componentSubSection))];
    // this.personalInformationCount = personalInformationUnique;
    // this.personalInformationSubSection = this.personalInformation.filter(x => x.componentSubSection == 'House hold members ');
    // this.personalInformationSection = this.personalInformation.filter(x => x.componentSubSection == '');
    for (let c of this.personalInformation) {
      if (c.componentSubSection.trim() == "") {
        continue;
      }
      else {
        let isSubsectionadded = this.SubSections.find(x => x.subsectionname == c.componentSubSection)
        if (isSubsectionadded) {
          c.componentSubSection = "";
        } else {
          this.SubSections.push({ subsectionname: c.componentSubSection })
        }
      }
    }
    this.SubSections = [];
    this.careTeam = this.otAssessmentComponentData.filter(x => x.componentSection == 'Care Team');
    // const careTeamUnique = [...new Set(this.careTeam.map(item => item.componentSubSection))];
    // this.careTeamCount = careTeamUnique;
    // this.careTeamSubSection = this.careTeam.filter(x => x.componentSubSection == 'House hold members ');//this line is wrong it shoud be care team in search
    // this.careTeamSection = this.careTeam.filter(x => x.componentSubSection == '');
    for (let c of this.careTeam) {
      if (c.componentSubSection.trim() == "") {
        continue;
      }
      else {
        let isSubsectionadded = this.SubSections.find(x => x.subsectionname == c.componentSubSection)
        if (isSubsectionadded) {
          c.componentSubSection = "";
        } else {

          this.SubSections.push({ subsectionname: c.componentSubSection })
        }
      }

    }
    // let subsection = this.careTeam.find(x => x.componentSubSection == 'House hold members ');
    // if(subsection){
    // subsection.componentSubSection = "Care Team"
    // }
    this.SubSections = [];
    this.clinicalInformation = this.otAssessmentComponentData.filter(x => x.componentSection == 'Clinical Information');
    // const clinicalInformationUnique = [...new Set(this.clinicalInformation.map(item => item.componentSubSection))];
    // this.clinicalInformationCount = clinicalInformationUnique;
    // this.clinicalInformationSubSection1 = this.clinicalInformation.filter(x => x.componentSubSection == 'Current prescribed  medication');
    // this.clinicalInformationSubSection2 = this.clinicalInformation.filter(x => x.componentSubSection == 'Current over the counter medication');
    // this.clinicalInformationSection = this.clinicalInformation.filter(x => x.componentSubSection == '');
    for (let c of this.clinicalInformation) {
      if (c.componentSubSection.trim() == "") {
        continue;
      }
      else {
        let isSubsectionadded = this.SubSections.find(x => x.subsectionname == c.componentSubSection)
        if (isSubsectionadded) {
          c.componentSubSection = "";
        } else {
          this.SubSections.push({ subsectionname: c.componentSubSection })
        }
      }
    }
    this.SubSections = [];
    this.assessmentOfNeed = this.otAssessmentComponentData.filter(x => x.componentSection == 'Assessment Of Need');
    //  const assessmentOfNeedUnique = [...new Set(this.assessmentOfNeed.map(item => item.componentSubSection))];
    // this.assessmentOfNeedCount = assessmentOfNeedUnique;
    // this.assessmentOfNeedSubSection = this.assessmentOfNeed.filter(x => x.componentSubSection == 'Care Team');
    // this.assessmentOfNeedSection = this.assessmentOfNeed.filter(x => x.componentSubSection == '');

    this.mobility = this.otAssessmentComponentData.filter(x => x.componentSection == 'Mobility');

    this.propertyDetails = this.otAssessmentComponentData.filter(x => x.componentSection == 'Property Details');
    // const propertyDetailsUnique = [...new Set(this.propertyDetails.map(item => item.componentSubSection))];
    // this.propertyDetailsCount = propertyDetailsUnique;
    // this.propertyDetailsSubSection1 = this.propertyDetails.filter(x => x.componentSubSection == 'Entrance');
    // this.propertyDetailsSubSection2 = this.propertyDetails.filter(x => x.componentSubSection == 'Reception Room');
    // this.propertyDetailsSubSection3 = this.propertyDetails.filter(x => x.componentSubSection == 'Dining Room');
    // this.propertyDetailsSubSection4 = this.propertyDetails.filter(x => x.componentSubSection == 'Kitchen');
    // this.propertyDetailsSubSection5 = this.propertyDetails.filter(x => x.componentSubSection == 'Stairs');
    // this.propertyDetailsSubSection6 = this.propertyDetails.filter(x => x.componentSubSection == 'Bedroom');
    // this.propertyDetailsSubSection7 = this.propertyDetails.filter(x => x.componentSubSection == 'Bathroom');
    // this.propertyDetailsSubSection8 = this.propertyDetails.filter(x => x.componentSubSection == 'Toilets');
    // this.propertyDetailsSubSection4 = this.propertyDetails.filter(x => x.componentSubSection == 'Toilets');
    this.propertyDetailsSection = this.propertyDetails.filter(x => x.componentSubSection == '');
    for (let c of this.propertyDetails) {
      if (c.componentSubSection.trim() == "") {
        continue;
      }
      else {
        let isSubsectionadded = this.SubSections.find(x => x.subsectionname == c.componentSubSection)
        if (isSubsectionadded) {
          c.componentSubSection = "";
        } else {
          this.SubSections.push({ subsectionname: c.componentSubSection })
        }
      }

    }
    // let subsection2 = this.propertyDetails.find(x => x.componentSubSection == 'Current over the counter medication');
    // if(subsection2){
    //   subsection2.componentSubSection = ""
    // } 
    this.SubSections = [];
    this.summary = this.otAssessmentComponentData.filter(x => x.componentSection == 'Summary');
    if (this.summary && this.summary.length > 0) {
      this.summary[0].componentValue = this.summary[0].componentValue.replaceAll('\n', '<br/>')
    }
    this.reccomendations = this.otAssessmentComponentData.filter(x => x.componentSection == 'Recommendations');


  }

  public getResponseKey(formResponseKey) {
    for (const key in formResponseKey) {
      if (key.includes("addPhoto_") || key.includes("addMeasure_")) {
        if (formResponseKey[key][0]) {
          this.otAssessmentResponseData.push({ 'responseKey': key, 'responseValue': formResponseKey[key][0].url })
        }

      }
      else {

        if (formResponseKey.hasOwnProperty(key)) {
          if (typeof formResponseKey[key] != "object") {

            if (key == 'gender') {
              let gender = this.appService.gender.find(x => x.gender_id == formResponseKey[key]);
              formResponseKey[key] = gender ? gender.text : '';
            }
            if (key == 'ethenicGroup') {
              let ethenicGroup = this.appService.ethenic.find(x => x.ethenicgroup_id == formResponseKey[key]);
              formResponseKey[key] = ethenicGroup ? ethenicGroup.text : '';
            }
            if (key == 'maritalStatus') {
              let maritalStatus = this.appService.maritalstatus.find(x => x.maritalstatus_id == formResponseKey[key]);
              formResponseKey[key] = maritalStatus ? maritalStatus.text : '';
            }
            if (key == 'religion') {
              let religion = this.appService.religion.find(x => x.religion_id == formResponseKey[key]);
              formResponseKey[key] = religion ? religion.text : '';
            }
            if (key == 'accommodationType') {
              let accommodationType = this.appService.accommodationtype.find(x => x.accommodationtype_id == formResponseKey[key]);
              formResponseKey[key] = accommodationType ? accommodationType.text : '';
            }
            if (key == 'tenureOfProperty') {
              let tenureOfProperty = this.appService.tenureofproperty.find(x => x.tenureofproperty_id == formResponseKey[key]);
              formResponseKey[key] = tenureOfProperty ? tenureOfProperty.text : '';
            }
            if (key == 'role1') {
              let role = this.appService.roles.find(x => x.role_id == formResponseKey[key]);
              formResponseKey[key] = role ? role.text : '';
            }
            if (key == 'assessmentSource') {
              let assessmentSource = this.appService.assessmentsource.find(x => x.assessmentsource_id == formResponseKey[key]);
              formResponseKey[key] = assessmentSource ? assessmentSource.sourcename : '';
            }
            if ((key == 'isdCode' || key == 'otherISDCode') && formResponseKey[key]) {
              let telephoneValue = formResponseKey[key];
              let splitTelNumber = telephoneValue.split('/');
              let splitISDCode = splitTelNumber[1].split('_');
              let finalTelephoneNumber = '+' + splitISDCode[1];
              formResponseKey[key] = finalTelephoneNumber;
            }
            this.otAssessmentResponseData.push({ 'responseKey': key, 'responseValue': formResponseKey[key] })
          }
          else {
            if (key == 'gpAddress' || key == 'locationOfAssessor' || key == 'emergencyAddress' || key == 'addressIfDifferentFromHomeAddress') {
              if (formResponseKey[key].address) {
                let address = formResponseKey[key].display_name;
                // console.log('formResponseKey[key]',formResponseKey[key]);
                // console.log('address',address);
                this.otAssessmentResponseData.push({ 'responseKey': key, 'responseValue': address })
              }
              else {
                this.otAssessmentResponseData.push({ 'responseKey': key, 'responseValue': '' })
              }
            }
            else if (key == 'survey') {
              this.otAssessmentResponseData.push({ 'responseKey': 'survey', 'responseValue': formResponseKey[key].value })
            }
            else if (key == 'areyouatriskoffallingbecausethey' || key == 'hasThereBeenAnyImpactsFollowingTheFalls' || key == "financialInformationDoYouCaimAnyOfTheFollowing") {
              let multiSelectData = '';
              if (formResponseKey[key].length > 0) {
                // formResponseKey[key].forEach(element => {
                //   multiSelectData += element + ','
                // });
                this.otAssessmentResponseData.push({ 'responseKey': key, 'responseValue': formResponseKey[key].join(", ") })
              }
              else {
                this.otAssessmentResponseData.push({ 'responseKey': key, 'responseValue': '' })
              }

            }
            else {
              if (formResponseKey[key] != null) {
                if (formResponseKey[key].length > 0) {
                  this.getResponseKey(this.formResponseData[key])
                }
                else {
                  for (let prop in formResponseKey[key]) {
                    if (prop == 'addressOfFormalCarersEmployers') {
                      if (formResponseKey[key][prop].address) {
                        let address = formResponseKey[key][prop].display_name;
                        this.otAssessmentResponseData.push({ 'responseKey': prop, 'responseValue': address })
                      }
                      else {
                        this.otAssessmentResponseData.push({ 'responseKey': prop, 'responseValue': '' })
                      }

                    }
                    else if (prop.includes("numberLocationTypeOfDoorsInRoomIncludeTypeOfLockIfAppropriate") || prop == "whatSortOfVentilationIsInTheProperty") {
                      let multiSelectData = '';
                      if (formResponseKey[key][prop].length > 0) {
                        // formResponseKey[key][prop].forEach(element => {
                        //   multiSelectData += element + ','
                        // });
                        this.otAssessmentResponseData.push({ 'responseKey': prop, 'responseValue': formResponseKey[key][prop].join(", ") })
                      }
                    }
                    else {
                      if (Array.isArray(formResponseKey[key][prop])) {
                        // for(const photokey in formResponseKey[key][prop]) {
                        //   if (photokey.includes("addPhoto_") || key.includes("addMeasure_")) {
                        //     if (formResponseKey[photokey][0]) {
                        //       this.otAssessmentResponseData.push({ 'responseKey': photokey, 'responseValue': formResponseKey[photokey][0].url })
                        //     }

                        //   }
                        // }
                        const gridImage = formResponseKey[key][prop];
                        gridImage.forEach(set => {
                          Object.keys(set).forEach(question => {
                            console.log('element', question);
                            console.log('set', set);
                            // if (Array.isArray(set[question])) {
                            if (question.includes("addPhoto_") || question.includes("addMeasure_")) {
                              if (set[question][0]) {
                                this.otAssessmentResponseData.push({ 'responseKey': question, 'responseValue': set[question][0].url })
                              }

                            }
                            else {
                              if (question.includes("url")) {
                                this.otAssessmentResponseData.push({ 'responseKey': prop, 'responseValue': formResponseKey[key][prop][0].url })
                              }

                            }
                            // }
                            // else {
                            //   this.otAssessmentResponseData.push({ 'responseKey': prop, 'responseValue': formResponseKey[key][prop][0].url })
                            // }
                          });
                        });

                      }
                      else {
                        this.otAssessmentResponseData.push({ 'responseKey': prop, 'responseValue': formResponseKey[key][prop] })
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
  }

  public getComponentKey(component, value = undefined, subSectionName = undefined) {
    if (component.type == "panel") {
      this.subSectionName = component.title
    }
    if (component != null && component != undefined && component.hasOwnProperty("type") && component.type == "editgrid") {
      if (this.subSectionName == "") {
        this.subSectionName = component.label;
      }
      this.ProcessEditGrid(component, this.subSectionName);
      this.subSectionName = "";
    }
    else {
      for (var key in component) {
        if (component[key] != null && component[key] != undefined) {
          let section = this.mainSectionNames.find(x => x.sectionKey == component[key].key);
          if (section) {
            this.sectionName = section.sectionName;
          }
        }

        if (component.hasOwnProperty(key)) {
          if (typeof component[key] != "object") {
            let findComponent: any;
            if (value != undefined) {
              findComponent = { "responseValue": value };
            }
            else {

              findComponent = this.otAssessmentResponseData.find(x => x.responseKey == component.key);
            }
            if (findComponent) {
              let responseValue = findComponent.responseValue;

              if (findComponent.responseValue && typeof findComponent.responseValue != "number" && component.type == "select" && component.data && component.data.values && component.data.values.length) {
                let responseLabels = findComponent.responseValue.split(", ").map(r => (component.data.values.find(v => v.value == r) ? component.data.values.find(v => v.value == r) : { "label": r }).label.trim())
                if (responseLabels)
                  responseValue = responseLabels.join(", ");
              }

              this.otAssessmentComponentData.push({ 'componentKey': component.key, 'componentValue': (responseValue != undefined && typeof responseValue != 'number') ? this.capitalizeFirstLetter(responseValue, component.type) : (responseValue != undefined) ? responseValue : '', 'componentLabel': component.label, 'componentSection': this.sectionName, 'componentType': component.type, 'componentSubSection': ((subSectionName != undefined) ? subSectionName : '') })
              return;
            }

          } else {
            this.getComponentKey(component[key],undefined,this.subSectionName);
          }
        }
      }
    }
  }

  ProcessEditGrid(obj, subSectionName = undefined) {
    //foreach obj.components 
    //get the max no of responses for any key 
    if (obj.components && Array.isArray(obj.components) && obj.components.length) {
      if (typeof obj.key != "object") {
        let count = 0
        let valueobj = this.formResponseData;
        for (let index = 0, temp_parsed = []; index < this.p_levels.length; index++) {
          const componentkey = this.p_levels[index];
          if (!temp_parsed.find(x => x == componentkey)) {
            let count = this.p_levels.filter(x => x == componentkey).length - 1;
            if (valueobj[componentkey] && valueobj[componentkey].length) {
              valueobj = valueobj[componentkey][count];
            }
            temp_parsed.push(componentkey);
          }
        }

        valueobj = valueobj[obj.key];
        if (valueobj && Array.isArray(valueobj)) {
          count = valueobj.length;
        }
        //const count = Math.max(...obj.components.map(x => this.otAssessmentResponseData.filter(y => y.responseKey == x.key).length));

        for (let i = 0; i < count; i++) {
          this.p_levels.push(obj.key);
          obj.components.forEach(component => {

            const key = component.key;
            let value;

            if (component.hasOwnProperty(key) || component.hasOwnProperty("key")) {
              if (typeof component[key] != "object") {

                if (component && component.type && component.type != 'file') {

                  //value = this.otAssessmentResponseData.filter(x => x.responseKey == key)[i];
                  // value = (value != undefined && value.responseValue) ? value.responseValue : '';
                  if (valueobj[i][key] && Array.isArray(valueobj[i][key])) {
                    value = valueobj[i][key].join(", ");
                  }
                  else {
                    value = valueobj[i][key] ? valueobj[i][key] : "";
                  }
                }
                else if (component && component.type && component.type == 'file') {
                  // let response = ""
                  // let responcedata = this.otAssessmentResponseData.filter(x => x.responseKey == key)[i]
                  // if (responcedata && responcedata.responseValue != 'undefined') {
                  //   response = this.otAssessmentResponseData.filter(x => x.responseKey == key)[i].responseValue
                  // }
                  // else {
                  //   response = "";
                  // }

                  // if (Array.isArray(response) && response.length > 0) {
                  //   value = this.otAssessmentResponseData.filter(x => x.responseKey == key)[i].responseValue[0].url;
                  // }
                  // else {
                  //   value = response;
                  // }
                  if (valueobj[i][key] && Array.isArray(valueobj[i][key]) && valueobj[i][key].length) {
                    value = valueobj[i][key][0].url;
                  }
                  else { value = "" }
                }
              }
              else {
                // p_levels.push(obj.key);
                // this.ProcessEditGrid(component, subSectionName,p_levels);
              }
            }

            this.getComponentKey(component, value, subSectionName);
          });
          if (i == count - 1) {
            this.p_levels = this.p_levels.filter(x => x != obj.key);
          }
        }

      }
      else {
        // this.ProcessEditGrid(obj);
      }

    }
  }

  public capitalizeFirstLetter(str: string, componenttype = null): string {
    if (componenttype && componenttype == 'file') {
      return str;
    }
    if (typeof str == "string") {
      return str.slice(0, 1).toUpperCase() + str.slice(1);
    }

  }

  pdfDownloaded() {
    this.destroyTemplate.emit('true');
  }

}
