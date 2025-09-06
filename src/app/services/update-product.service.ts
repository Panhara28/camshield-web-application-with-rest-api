import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductVariant {
  size: string;
  color: string;
  price: number;
  stock: number;
  imageVariant: string;
  sku: string;
}

export interface Media {
  id: number;
  url: string;
}

export interface UpdateProductPayload {
  title: string;
  description: string;
  type: string;
  vendor: string;
  status?: string;
  price: number;
  compareAtPrice: number;
  costPerItem: number;
  categoryId: number;
  variants: ProductVariant[];
  mediaUrls: Media[];
}

@Injectable({
  providedIn: 'root',
})
export class UpdateProductSerivce {
  private baseUrl = 'http://localhost:8080/products/update'; // Replace with your actual API base path

  constructor(private http: HttpClient) {}

  updateProduct(slug: number, payload: UpdateProductPayload): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${slug}`, payload);
  }
}
