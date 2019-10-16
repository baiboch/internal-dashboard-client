import { Component } from '@angular/core';

export interface ItemInterface {
  id?: string;
  event?: string;
  channelId?: string;
  eventTitle: string;
  content: string;
  timestamp: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {}
