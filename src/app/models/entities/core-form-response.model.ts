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
import { EntityBase } from "./entity-base.model";

export class CoreFormResponse extends EntityBase {
	public formbuilderresponse_id: string;
	public person_id: string;
	public encounter_id: string;
	public formbuilderform_id: string;
	public contexttype: string;
	public contextvalue: string;
	public responseindex: number;
	public formversion: number;
	public formcomponents: string;
	public formresponse: string;
	public responseversion: number;
	public responsemeta: string;
	public generatedscore: string;
	public generatedguidance: string;
	public responsestatus: string;
	public responsestatusreason: string;
	public createddatetime: string;
	public lastupdateddatetime: string;
	public createdby: string;
	public updatedby: string;
	public startdatetime: string;
	public enddatetime: string;
	public assessmentservice: string;
	public assessorid: string;
	public assessmentsourceid: string;
	public otherassessmentsource: string;
	//Extended property
	public formname: string;
	public _assessorname: string;
}

export class CoreFormresponsemediaversion {
	public formresponsemediaversion_id: string
	public formresponseid: string
	public versiondatetime: string
	public mediakey: string
	public awskey: string
	public awsversionid: string
}