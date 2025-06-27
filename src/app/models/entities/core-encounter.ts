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
export class Encounter {
  person_id: string;
  encounter_id: string;
  admitdatetime: Date;
  dischargedatetime: Date;
  displaytext: string;
  patientclasscode: string;
  episodestatuscode: string;
}

export class CorePerson {
  person_id: string;
  firstname: string;
  middlename: string;
  familyname: string;
  fullname: string;
  preferredname: string;
  titlecode: string;
  titletext: string;
  dateofbirth: Date;
  dateofbirthts: Date;
  dateofdeath: Date;
  dateofdeathts: Date;
  gendercode: string;
  gendertext: string;
  ethnicitycode: string;
  ethnicitytext: string;
  maritalstatuscode: string;
  maritalstatustext: string;
  religioncode: string;
  religiontext: string;
  deathindicator: boolean;
  primarylanguagecode: string;
  primarylanguagetext: string;
  interpreterrequired: string;
}

export class Assessor {

  disableliving_assessor_id: string;
  firstname: string;
  surname: string;
  role: string;
  phoneno: string;
  provider: string;
  assessorid: string;
  commissionerid: string;
  createdon: any;
  createdby: string;
}