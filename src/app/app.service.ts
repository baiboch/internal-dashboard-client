import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ItemInterface } from './app.component';
import { Observable } from 'rxjs';

@Injectable()
export class AppService {
  private itemsEndpoint = 'http://127.0.0.1:8000/google-shopping/items/';
  constructor(private http: HttpClient) {}

  getItems(channelId: string): Observable<ItemInterface[]> {
    return this.http.get<ItemInterface[]>(`${this.itemsEndpoint}${channelId}`);
  }

  deleteItem(id: string, channelId: string): Observable<any> {
    return this.http.get(`http://127.0.0.1:8000/google-shopping/delete/${id}/${channelId}`);
  }

  searchItem(search: string, channelId: string): Observable<any> {
    return this.http.get(`http://127.0.0.1:8000/google-shopping/search/${channelId}/${search}`);
  }
}
