import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MultipleUploadService {
  private fileUploadUrl = 'http://localhost:4000/upload/files';

  constructor(private http: HttpClient) {}

  uploadFiles(folder: string, files: File[]): Observable<HttpEvent<any>> {
    const formData: FormData = new FormData();
    formData.append('folder', folder);
    files.forEach((file) => formData.append('files', file));
    const req = new HttpRequest('POST', this.fileUploadUrl, formData, {
      reportProgress: true,
    });

    return this.http.request(req);
  }
}
