import { Component } from '@angular/core';
import { LayoutsComponent } from '../../components/layouts/layouts.component';
import { PageTitleComponent } from '../../components/page-title/page-title.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { CreateMediaService } from '../../services/create-media.service';
import { AuthService } from '../../services/auth.service';
import { MultipleUploadService } from '../../services/multiple-upload.service';

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [
    LayoutsComponent,
    PageTitleComponent,
    MatTabsModule,
    MatIconModule,
    CommonModule,
    MatCardModule,
  ],
  templateUrl: './media.component.html',
  styleUrl: './media.component.css',
})
export class MediaComponent {
  previewUrls: string[] = [];
  previewFiles: File[] = [];
  isUploading = false;
  isUploadButtonDisabled = true;
  uploadedFiles: {
    file: File;
    url: string;
    filename: string;
    preview?: string;
  }[] = [];

  constructor(
    private createMediaService: CreateMediaService,
    private multipleUploadService: MultipleUploadService,
    private readonly user: AuthService
  ) {}

  onFileDropped(event: DragEvent) {
    event.preventDefault();
    this.handleFiles(event.dataTransfer?.files ?? null);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onFileSelected(event: any) {
    this.handleFiles(event.target.files ?? null);
  }

  private async handleFiles(fileList: FileList | null) {
    if (!fileList) return;

    const files = Array.from(fileList);
    this.previewFiles.push(...files);

    // Generate previews
    for (let file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previewUrls.push(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }

    // Upload files to S3
    this.multipleUploadService.uploadFiles('multiple', files).subscribe({
      next: async (event: any) => {
        if (event?.body?.files) {
          for (let i = 0; i < event.body.files.length; i++) {
            const file = files[i];
            const fileData = event.body.files[i];
            const preview = this.previewUrls[i];
            this.uploadedFiles.push({
              file,
              url: fileData.url,
              filename: fileData.filename,
              preview,
            });
          }
        }
        this.isUploading = true;
      },
      error: (err) => console.error('S3 upload error:', err),
    });
  }

  removeImage(index: number) {
    this.previewUrls.splice(index, 1);
    this.previewFiles.splice(index, 1);
    this.uploadedFiles.splice(index, 1);

    if (this.uploadedFiles.length === 0) {
      this.isUploadButtonDisabled = true;
    }
  }

  onUpload() {
    this.isUploading = true;
    this.isUploadButtonDisabled = true;
    this.user.getCurrentUser().subscribe({
      next: async (user) => {
        const uploadedById = Number(user?.id);

        for (let uploaded of this.uploadedFiles) {
          const metadata = await this.createMediaService.createMedia(
            uploaded.file,
            uploadedById
          );
          metadata.url = uploaded.url;
          metadata.storedFilename = uploaded.filename;
          await this.createMediaService.submitMetadata(metadata).toPromise();
        }

        console.log('Metadata records submitted.');
        this.previewUrls = [];
        this.uploadedFiles = [];
        this.previewFiles = [];
        this.isUploading = false;
      },
      error: (err) => console.error('User fetch error:', err),
    });
  }
}
