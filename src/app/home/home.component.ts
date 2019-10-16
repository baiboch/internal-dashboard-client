import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppService } from '../app.service';
import { ItemInterface } from '../app.component';
import Sockette from 'sockette';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  public title = 'google-shop-client';
  public items: ItemInterface[] = [];
  private websocketEnpoint = 'wss://a17eb6w5t2.execute-api.ap-southeast-1.amazonaws.com/dev'; // 'wss://r042bhkzo6.execute-api.us-east-1.amazonaws.com/dev';
  private wss: any;
  channelId: string;
  channelSubscribed: boolean;
  searchText: string;
  itemsCount: number;

  constructor(private appService: AppService, private route: ActivatedRoute) {}

  public ngOnInit(): void {
    if (this.route.snapshot.params.hasOwnProperty('clientId')) {
      this.channelId = this.route.snapshot.params.clientId;
    }
    console.log('CLIENT ID:', this.channelId);

    this.wss = new Sockette(this.websocketEnpoint, {
      timeout: 10e3,
      maxAttempts: 10,
      onopen: () => {
        console.log('Connected...');
      },
      onmessage: event => {
        const messageData: ItemInterface = JSON.parse(event.data);
        if (messageData.event === 'channel_message') {
          this.items.unshift({
            id: messageData.id,
            eventTitle: messageData.eventTitle,
            content: messageData.content,
            timestamp: messageData.timestamp
          });
        }
      },
      onerror: () => {
        console.log('Websocket connection error, reconnecting...');
        this.wss.reconnect();
      },
      onclose: () => {
        console.log('Websocket connection close...');
        this.wss.reconnect();
      },
      onreconnect: () => {}
    });
    this.subscribeChannel();
    // Reconnect 10s later
    setTimeout(this.wss.reconnect, 10e3);
  }

  public searchItems() {
    console.log(this.searchText);
    this.appService.searchItem(this.searchText, this.channelId).subscribe(data => {
      if (data.items_count > 0) {
        this.items = data.items;
      }
      this.itemsCount = data.items_count;
    });
  }

  public getItems() {
    this.appService.getItems(this.channelId).subscribe( (items: ItemInterface[]) => {
      this.items = items;
      this.channelSubscribed = true;
      this.itemsCount = null;
      this.searchText = null;
    });
  }

  private subscribeChannel() {
    setTimeout(() => {
      console.log('subscription channel');
      this.wss.json({
        action: 'subscribeChannel',
        channelId: this.channelId
      });

      if (this.channelId) {
        this.getItems();
      }
    }, 3000);
  }

  public sendMessage() {
    this.wss.json({
      action: 'sendMessage',
      channelId: '2',
      eventTitle: 'Event from Client 2',
      content: 'Event description ...'
    });
  }

  public deleteItem(id: string) {
    let item = this.items.find(item => {
      return item.id === id;
    });
    let index = this.items.indexOf(item);
    if (index !== -1) {
      this.items.splice(index, 1);
      this.appService.deleteItem(id, this.channelId).subscribe((event) => {
        console.log(event);
      });
    }
  }

  ngOnDestroy(): void {
    console.log('close connection');
    this.wss.close();
  }
}

