import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ProductDetail {
  id: number;
  slug: string;
  title: string;
  description: any;
  categoryId: number;
  type: string;
  vendor: string;
  price: number;
  compareAtPrice?: number;
  costPerItem?: number;
  createdAt: string;
  updatedAt: string;
  variants: any[];
  media: any[];
  mediaUrls: any[];
}

@Injectable({
  providedIn: 'root',
})
export class ProductDetialService {
  private readonly API_BASE = 'http://localhost:4000/products'; // adjust if needed

  constructor(private http: HttpClient) {}

  getProductDetailBySlug(slug: string): Observable<ProductDetail> {
    return this.http.get<ProductDetail>(`${this.API_BASE}/detail/${slug}`);
  }
}
