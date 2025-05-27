import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

interface UserParams {
  pagination?: {
    page?: number | undefined;
    totalPages?: number;
    total?: number;
    limit?: number;
  };
  filter?: {
    name?: string;
    email?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private baseUrl = 'http://localhost:8080/users/lists';

  constructor(private http: HttpClient) {}

  getUsers(params: UserParams): Observable<any> {
    const { filter, pagination } = params;

    let httpParams = new HttpParams();
    if (pagination?.page) {
      httpParams = httpParams.set('page', pagination.page.toString());
    }
    if (filter?.name) {
      httpParams = httpParams.set('name', filter.name);
    }
    if (filter?.email) {
      httpParams = httpParams.set('email', filter.email);
    }

    return this.http.get<any>(this.baseUrl, { params: httpParams });
  }
}
