import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private uploadUrl = 'http://localhost:4000/upload/file';

  constructor(private http: HttpClient) {}

  uploadFile(file: File, folder: string = 'tests'): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder); // <- include folder field
    return this.http.post(this.uploadUrl, formData);
  }
}
