import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EditUserService {
  private baseUrl = 'http://localhost:8080/users';

  constructor(private http: HttpClient) {}

  getUser(slug: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${slug}`);
  }

  updateUser(slug: string, data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${slug}/edit`, data);
  }
}
