import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private apiUrl = 'http://localhost:8080/categories/list';

  constructor(private http: HttpClient) {}

  getCategoryTree() {
    return this.http.get<any[]>(this.apiUrl); // NestJS endpoint
  }
}
