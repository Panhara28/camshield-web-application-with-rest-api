import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface MediaParams {
  pagination?: {
    page?: number | undefined;
    totalPages?: number;
    total?: number;
    limit?: number;
  };
  filter?: {
    filename?: string;
    mimetype?: string;
    extension?: string;
    type?: string;
    uploadedById?: number;
    visibility?: string;
    createdAt?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private apiUrl = 'http://localhost:4000/media/lists';

  constructor(private http: HttpClient) {}

  getMedias(params: MediaParams): Observable<any> {
    const { filter, pagination } = params;
    let httpParams = new HttpParams();

    if (pagination?.page) {
      httpParams = httpParams.set('page', pagination.page.toString());
    }

    if (filter?.filename) {
      httpParams = httpParams.set('filename', filter.filename);
    }

    return this.http.get<any>(this.apiUrl, { params: httpParams });
  }
}
