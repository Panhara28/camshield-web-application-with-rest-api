import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CreateProductService {
  private apiUrl = 'http://localhost:4000/products/create';

  constructor(private http: HttpClient) {}

  createProduct(payload: any): Observable<any> {
    return this.http.post(this.apiUrl, payload);
  }
}
