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
import { ToastrService, ToastContainerDirective } from 'ngx-toastr';
import { ApirequestService } from './api-request.service';
import { AppService } from './app.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    constructor(private toastrService: ToastrService,private appService: AppService,
        private apiRequestService: ApirequestService,
        private httpClient: HttpClient) {

    }

    raiseWarning(message: string) {
        this.toastrService.warning(message, "", {closeButton: true, timeOut: 60000});
    }

    setOverlayContainer(container: ToastContainerDirective) {
        this.toastrService.overlayContainer = container;
    }

    notifyClient(assessmentId: string, 
        assessmentDateTime: string, 
        clientName: string, 
        clientEmail: string, 
        clientMobileNumber: string,
        assessmentType: string,
        assessorName: string) {
        let metingUri = this.appService.moduleConfig.siteSettings.meetingUrl;

        if (clientEmail) {
            let emailTemplate = this.appService.moduleConfig.siteSettings.emailTemplate;
            emailTemplate = emailTemplate.replace("CLIENT_NAME", clientName);
            emailTemplate = emailTemplate.replace("MEETING_LINK", metingUri + "/?m=" + assessmentId);
            emailTemplate = emailTemplate.replace("ASSESSMENT_DATETIME", assessmentDateTime);
            emailTemplate = emailTemplate.replace("ASSESSMENT_TYPE", assessmentType);
            emailTemplate = emailTemplate.replace("ASSESSOR_NAME", assessorName);

            let emailPayload = {
                "message": emailTemplate,
                "email": clientEmail,
                "subject": this.appService.moduleConfig.siteSettings.emailSubject
            }           
            
            //this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.emailNotificationEndpoint, emailPayload);
            this.httpClient.post(this.appService.moduleConfig.apiEndpoints.emailNotificationEndpoint, emailPayload).subscribe((response)=>{
                console.log(response);
            });
        }

        if (clientMobileNumber) {
            let mobileNumber = this.cleanupMobileNumber(clientMobileNumber);
            console.log(mobileNumber);

            let smsTemplate = this.appService.moduleConfig.siteSettings.smsTemplate;
            smsTemplate = smsTemplate.replace("CLIENT_NAME", clientName);
            smsTemplate = smsTemplate.replace("MEETING_LINK", metingUri + "/?m=" + assessmentId);
            smsTemplate = smsTemplate.replace("ASSESSMENT_DATETIME", assessmentDateTime);
            smsTemplate = smsTemplate.replace("ASSESSMENT_TYPE", assessmentType);
            smsTemplate = smsTemplate.replace("ASSESSOR_NAME", assessorName);
            
            let smsPayload = {
                "message": smsTemplate,
                "number": mobileNumber,
                "subject": this.appService.moduleConfig.siteSettings.smsSubject
            }           
            
            //this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.smsNotificationEndpoint, smsPayload);
            this.httpClient.post(this.appService.moduleConfig.apiEndpoints.smsNotificationEndpoint, smsPayload).subscribe((response)=>{
                console.log(response);
            });
        }        
    }
    rescheduleNotifyClient(assessmentId: string, 
        PrevAssessmentDateTime: string, 
        assessmentDateTime: string, 
        clientName: string, 
        clientEmail: string, 
        clientMobileNumber: string,
        assessmentType: string,
        originalAssessorName: string,
        assessorName: string) {
        let metingUri = this.appService.moduleConfig.siteSettings.meetingUrl;

        if (clientEmail) {
            let emailTemplate = this.appService.moduleConfig.siteSettings.rescheduleemailTemplate;
            emailTemplate = emailTemplate.replace("CLIENT_NAME", clientName);           
            emailTemplate = emailTemplate.replace("MEETING_LINK", metingUri + "/?m=" + assessmentId);
            emailTemplate = emailTemplate.replace("ASSESSMENT_DATETIME", PrevAssessmentDateTime);
            emailTemplate = emailTemplate.replace("Rescheduled_DATETIME", assessmentDateTime);
            emailTemplate = emailTemplate.replace("ASSESSMENT_TYPE", assessmentType);
            emailTemplate = emailTemplate.replace("ORIGINAL_ASSESSOR_NAME", originalAssessorName);
            emailTemplate = emailTemplate.replace("ASSESSOR_NAME", assessorName);

            let emailPayload = {
                "message": emailTemplate,
                "email": clientEmail,
                "subject": this.appService.moduleConfig.siteSettings.emailSubject
            }           
            
            //this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.emailNotificationEndpoint, emailPayload);
            this.httpClient.post(this.appService.moduleConfig.apiEndpoints.emailNotificationEndpoint, emailPayload).subscribe((response)=>{
                console.log(response);
            });
        }

        if (clientMobileNumber) {
            let mobileNumber = this.cleanupMobileNumber(clientMobileNumber);
            console.log(mobileNumber);

            let smsTemplate = this.appService.moduleConfig.siteSettings.reschedulesmsTemplate;
            smsTemplate = smsTemplate.replace("CLIENT_NAME", clientName);
            smsTemplate = smsTemplate.replace("MEETING_LINK", metingUri + "/?m=" + assessmentId);
            smsTemplate = smsTemplate.replace("ASSESSMENT_DATETIME", PrevAssessmentDateTime);
            smsTemplate = smsTemplate.replace("Rescheduled_DATETIME", assessmentDateTime);
            smsTemplate = smsTemplate.replace("ASSESSMENT_TYPE", assessmentType);
            smsTemplate = smsTemplate.replace("ORIGINAL_ASSESSOR_NAME", originalAssessorName);
            smsTemplate = smsTemplate.replace("ASSESSOR_NAME", assessorName);
            
            let smsPayload = {
                "message": smsTemplate,
                "number": mobileNumber,
                "subject": this.appService.moduleConfig.siteSettings.smsSubject
            }           
            
            //this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.smsNotificationEndpoint, smsPayload);
            this.httpClient.post(this.appService.moduleConfig.apiEndpoints.smsNotificationEndpoint, smsPayload).subscribe((response)=>{
                console.log(response);
            });
        }        
    }
    cancelNotifyClient(assessmentId: string, 
        assessmentDateTime: string, 
        clientName: string, 
        clientEmail: string, 
        clientMobileNumber: string,
        assessmentType: string,
        assessorName: string) {
        let metingUri = this.appService.moduleConfig.siteSettings.meetingUrl;

        if (clientEmail) {
            let emailTemplate = this.appService.moduleConfig.siteSettings.cancelemailTemplate;
            emailTemplate = emailTemplate.replace("CLIENT_NAME", clientName);
           // emailTemplate = emailTemplate.replace("MEETING_LINK", metingUri + "/?m=" + assessmentId);
            emailTemplate = emailTemplate.replace("ASSESSMENT_DATETIME", assessmentDateTime);
            emailTemplate = emailTemplate.replace("ASSESSMENT_TYPE", assessmentType);
            emailTemplate = emailTemplate.replace("ASSESSOR_NAME", assessorName);

            let emailPayload = {
                "message": emailTemplate,
                "email": clientEmail,
                "subject": this.appService.moduleConfig.siteSettings.emailSubject
            }           
            
            //this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.emailNotificationEndpoint, emailPayload);
            this.httpClient.post(this.appService.moduleConfig.apiEndpoints.emailNotificationEndpoint, emailPayload).subscribe((response)=>{
                console.log(response);
            });
        }

        if (clientMobileNumber) {
            let mobileNumber = this.cleanupMobileNumber(clientMobileNumber);
            console.log(mobileNumber);
            
            let smsTemplate = this.appService.moduleConfig.siteSettings.cancelsmsTemplate;
            smsTemplate = smsTemplate.replace("CLIENT_NAME", clientName);
           // smsTemplate = smsTemplate.replace("MEETING_LINK", metingUri + "/?m=" + assessmentId);
            smsTemplate = smsTemplate.replace("ASSESSMENT_DATETIME", assessmentDateTime);
            smsTemplate = smsTemplate.replace("ASSESSMENT_TYPE", assessmentType);
            smsTemplate = smsTemplate.replace("ASSESSOR_NAME", assessorName);
            
            let smsPayload = {
                "message": smsTemplate,
                "number": mobileNumber,
                "subject": this.appService.moduleConfig.siteSettings.smsSubject
            }           
            
            //this.apiRequestService.postRequest(this.appService.moduleConfig.apiEndpoints.smsNotificationEndpoint, smsPayload);
            this.httpClient.post(this.appService.moduleConfig.apiEndpoints.smsNotificationEndpoint, smsPayload).subscribe((response)=>{
                console.log(response);
            });
        }        
    }

    private cleanupMobileNumber(mobileNumber: string): string {
        if(mobileNumber.indexOf("|") > -1){
            let isd: string = "";

            let arrContactDetails = mobileNumber.split("|");
            
            let isdCode = arrContactDetails[0];

            let contactNo = arrContactDetails[1];
            
            if(isdCode.indexOf("_") > -1){
                let arrISDCode = isdCode.split("_");

                isd = arrISDCode[1];
            }
            
            mobileNumber = isd + contactNo;
        }
        else{
            mobileNumber = mobileNumber;
        }

        if (mobileNumber.startsWith("+"))
            return mobileNumber.substring(1);

        if (mobileNumber.startsWith("0044"))
            return mobileNumber.substring(2);

        if (mobileNumber.startsWith("0"))
            return "44" + mobileNumber.substring(1);

        return mobileNumber;
    }
}
