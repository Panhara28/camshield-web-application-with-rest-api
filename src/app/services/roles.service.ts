import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface RoleParams {
  pagination?: {
    page?: number | undefined;
    totalPages?: number;
    total?: number;
    limit?: number;
  };
  filter?: {
    name?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class RolesService {
  private baseUrl = 'http://localhost:8080/roles/lists';

  constructor(private http: HttpClient) {}

  getRoles(params: RoleParams): Observable<any> {
    const { filter, pagination } = params;
    let httpParams = new HttpParams();

    if (pagination?.page) {
      httpParams = httpParams.set('page', pagination.page.toString());
    }
    if (filter?.name) {
      httpParams = httpParams.set('name', filter.name);
    }

    return this.http.get<any>(this.baseUrl, { params: httpParams });
  }
}
