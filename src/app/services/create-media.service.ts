import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CreateMediaService {
  private uploadUrl = 'http://localhost:4000/media/create';

  constructor(private http: HttpClient) {}

  createMedia(file: File, uploadedById: number) {
    return new Promise<any>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const data = {
            filename: file.name,
            storedFilename: this.generateStoredFilename(file.name),
            type: file.type.startsWith('image/') ? 'IMAGE' : 'OTHER',
            mimetype: file.type,
            extension: this.getFileExtension(file.name),
            size: file.size,
            title: this.generateStoredFilename(file.name),
            altText: this.generateStoredFilename(file.name),
            description: file.name,
            uploadedById: uploadedById,
            width: image.width,
            height: image.height,
          };

          resolve(data);
        };
        image.onerror = reject;
        image.src = reader.result as string;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private generateStoredFilename(original: string): string {
    const ext = this.getFileExtension(original);
    return `${crypto.randomUUID()}.${ext}`;
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop() || '';
  }

  submitMetadata(data: any) {
    return this.http.post(this.uploadUrl, data);
  }
}
