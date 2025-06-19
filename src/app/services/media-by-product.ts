import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MediaByProductService {
  private apiUrl = 'http://localhost:4000/products/by-product';

  constructor(private http: HttpClient) {}

  getProductMedia(productId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/${productId}`); // NestJS endpoint
  }
}
