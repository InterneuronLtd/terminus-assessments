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
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApirequestService } from 'src/services/api-request.service';
import { action } from '../models/synapse-dynamic-api/Filter.model';
import { AppService } from 'src/services/app.service';

@Component({
  selector: 'app-photo-measure',
  templateUrl: './photo-measure.component.html',
  styleUrls: ['./photo-measure.component.css']
})
export class PhotoMeasureComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input() image;
  @Output('outputimage') outputimage: EventEmitter<any> = new EventEmitter();
  @Input() set actions(e: EventEmitter<any>) {
    this.subscriptions.add(e.subscribe((e) => {
      console.log(e);
      this.GetPhotoMeasureOutput();
    }))
  }
  public subscriptions: Subscription = new Subscription();
//  photoMeasureUrl = "http://127.0.0.1:5500/src/assets/photomeasure/photomeasure.html";
  //photoMeasureUrl = "https://hilight-test.interneuron.cloud/assets/photomeasure/photomeasure.html"
  photoMeasureUrl = "./assets/photomeasure/photomeasure.html";

  iframeId = "photoMeasureIframe";

  @ViewChild('photoMeasureIframeDiv') photoMeasureIframeDiv: ElementRef;

  constructor(public apiRequestService: ApirequestService, public appService: AppService) {

  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  PostMessageToMeasureWindow(message) {
    var iframeElement = document.getElementById(this.iframeId);
    if (iframeElement) {
      (<HTMLIFrameElement>iframeElement).contentWindow.postMessage(message, "*"); // "http://127.0.0.1:8080" change * to parent url in confing
    }
    else console.log("cant send message, meeting is not running");
  }

  ngAfterViewInit(): void {
    this.RegisterMessageListener();
    if (this.image) {
      setTimeout(() => {
        const message = new TerminusMessage(this.image, "setimage");
        this.PostMessageToMeasureWindow(message);
      }, 1000);
    }
  }

  GetPhotoMeasureOutput() {
    const message = new TerminusMessage("", "getimage");
    this.PostMessageToMeasureWindow(message);
  }
  private RegisterMessageListener() {
    window.addEventListener('message', this.MessageListnerHandler.bind(this), false)
  }
  private MessageListnerHandler(event) {
    if (event && event.data.source && event.data.source == "terminus-photomeasure") {
      if (event.data.type == "photomeasureoutput") {
        this.outputimage.emit(event.data.data);
      }
      if (event.data.type == "loadcomplete") {
        console.log('photomeasure iframe has loaded');
        const message = new TerminusMessage(this.image, "setimage");
        this.PostMessageToMeasureWindow(message);
      }
    }
  }

  ngOnInit() {

  }




}
class TerminusMessage {
  source = "terminus-photomeasure"
  constructor(public data: string, public type: string) {

  }
}