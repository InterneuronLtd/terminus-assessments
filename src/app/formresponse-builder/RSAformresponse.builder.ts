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
import { AppService } from 'src/services/app.service';
import { CoreFormResponse } from '../models/entities/core-form-response.model';
import { BaseFormResponseBuilder } from './baseformresponse.builder';

@Injectable({
    providedIn: 'root'
})
export class RSAFormResponseBuilder extends BaseFormResponseBuilder{
    
    constructor(protected appService: AppService){
        super(appService);
    }

    BuildFormResponse(submission:any, formResponse:CoreFormResponse):any{
        //Delete default placeholder if present
        delete submission["data"]["new"];
        //Delete the configBearerAuthToken for the submission
        delete submission["data"]["configBearerAuthToken"];
        //Delete the configGlobalURL for the submission
        delete submission["data"]["configGlobalURL"];
        //Delete the configUserUsername for the submission
        delete submission["data"]["configUserUsername"];
        //Delete the configUserDisplayName for the submission
        delete submission["data"]["configUserDisplayName"];
        //Delete the submit for the submission
        delete submission["data"]["submit"];
        //Delete personId confg
        delete submission["data"]["configPersonId"];    

        formResponse.formresponse = JSON.stringify(submission["data"]);
        formResponse.responsemeta = JSON.stringify(submission["metadata"]);
 
        let currentDate = new Date();
        let year = currentDate.getFullYear();
        let month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
        let date = ('0' + currentDate.getDate()).slice(-2);
        let hour = ('0' + currentDate.getHours()).slice(-2);
        let minutes = ('0' + currentDate.getMinutes()).slice(-2);
        let seconds = ('0' + currentDate.getSeconds()).slice(-2);
        
        let submissionDateJson = `${year}-${month}-${date}T${hour}:${minutes}:${seconds}`;
        
        if (formResponse.responsestatus == "New") {
            formResponse.createddatetime = submissionDateJson;
            formResponse.createdby = this.appService.loggedInUserName;
        }
        formResponse.lastupdateddatetime = submissionDateJson;
        formResponse.updatedby = this.appService.loggedInUserId;

        formResponse.responsestatus = submission.state;

        formResponse.responseversion = formResponse.responseversion + 1;

        delete formResponse.formname;

        //formResponse._createddate = submission["data"]["completedDate"] == "" ? null : submission["data"]["completedDate"].substr(0, 19);
        formResponse._createdby = this.appService.loggedInUserId;

        return formResponse;
    }
}