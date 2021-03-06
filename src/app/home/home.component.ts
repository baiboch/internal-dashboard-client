import { Component, OnDestroy, OnInit, ElementRef, Input, OnChanges, ViewChild, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppService } from '../app.service';
import { ItemInterface } from '../app.component';
import { Observable } from 'rxjs';
import * as d3 from 'd3';
import Sockette from 'sockette';

interface DataModel {
  letter: string;
  frequency: number;
}

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

  @ViewChild('chart', {static: false}) chartContainer: ElementRef;

  @Input() data: DataModel[] = [
    {
      letter: 'click button',
      frequency: 0
    },
    {
      letter: 'view page',
      frequency: 0
    },
  ];

  margin = {top: 20, right: 20, bottom: 30, left: 40};

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
        if (this.channelId == 'dashboard') {
          if (messageData.event === 'channel_message') {
            this.items.unshift({
              id: messageData.id,
              eventTitle: messageData.eventTitle,
              content: messageData.content,
              timestamp: messageData.timestamp
            });

            let clickBtnEventsArr = this.items.filter(item => {
              return item.eventTitle === 'click button';
            });
            let clickContent: number = clickBtnEventsArr.reduce((a, b) => a + (parseInt(b['content']) || 0), 0);
            this.data[0].frequency = clickContent;

            let viewPageEventsArr = this.items.filter(item => {
              return item.eventTitle === 'view page';
            });
            let viewPageContent: number = viewPageEventsArr.reduce((a, b) => a + (parseInt(b['content']) || 0), 0);
            this.data[1].frequency = viewPageContent;

            this.createChart();
          }
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
    if (this.channelId == 'dashboard') {
      this.appService.getItems(this.channelId).subscribe( (items: ItemInterface[]) => {
        this.items = items;

        let clickBtnEventsArr = this.items.filter(item => {
          return item.eventTitle === 'click button';
        });
        let clickContent: number = clickBtnEventsArr.reduce((a, b) => a + (parseInt(b['content']) || 0), 0);
        this.data[0].frequency = clickContent;

        let viewPageEventsArr = this.items.filter(item => {
          return item.eventTitle === 'view page';
        });
        let viewPageContent: number = viewPageEventsArr.reduce((a, b) => a + (parseInt(b['content']) || 0), 0);
        this.data[1].frequency = viewPageContent;


        this.createChart();

        this.channelSubscribed = true;
        this.itemsCount = null;
        this.searchText = null;
      });
    }
  }

  private subscribeChannel() {
    setTimeout(() => {
      console.log('subscription channel');
      this.wss.json({
        action: 'subscribeChannel',
        channelId: 'dashboard'
      });

      if (this.channelId) {
        this.getItems();
      }
    }, 5000);
  }

  public sendMessage() {
    this.wss.json({
      action: 'sendMessage',
      channelId: 'dashboard',
      eventTitle: 'click button',
      content: '1'
    });
  }

  public sendMessagePageView() {
    this.wss.json({
      action: 'sendMessage',
      channelId: 'dashboard',
      eventTitle: 'view page',
      content: '1'
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

  private createChart(): void {
    d3.select('svg').remove();

    const element = this.chartContainer.nativeElement;
    const data = this.data;

    const svg = d3.select(element).append('svg')
      .attr('width', element.offsetWidth)
      .attr('height', element.offsetHeight);

    const contentWidth = element.offsetWidth - this.margin.left - this.margin.right;
    const contentHeight = element.offsetHeight - this.margin.top - this.margin.bottom;

    const x = d3
      .scaleBand()
      .rangeRound([0, contentWidth])
      .padding(0.1)
      .domain(data.map(d => d.letter));

    const y = d3
      .scaleLinear()
      .rangeRound([contentHeight, 0])
      .domain([0, d3.max(data, d => d.frequency)]);

    const g = svg.append('g')
      .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    g.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', 'translate(0,' + contentHeight + ')')
      .call(d3.axisBottom(x));

    g.append('g')
      .attr('class', 'axis axis--y')
      .call(d3.axisLeft(y).ticks(1))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 6)
      .attr('dy', '0.71em')
      .attr('text-anchor', 'end')
      .text('Frequency');

    g.selectAll('.bar')
      .data(data)
      .enter().append('rect')
      .attr('class', d => d.letter == 'click button' ? 'bar' : 'page_view')
      .attr('x', d => x(d.letter))
      .attr('y', d => y(d.frequency))
      .attr('width', x.bandwidth())
      .attr('height', d => contentHeight - y(d.frequency));
  }

  ngOnDestroy(): void {
    console.log('close connection');
    this.wss.close();
  }
}

