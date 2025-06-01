import { Component } from '@angular/core';
import { PageTitleComponent } from '../page-title/page-title.component';
import { CommonModule } from '@angular/common';
import { CreateMediaService } from '../../services/create-media.service';
import { MultipleUploadService } from '../../services/multiple-upload.service';
import { AuthService } from '../../services/auth.service';
import { MediaService } from '../../services/medias.service';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

interface PaginationMeta {
  page?: number;
  totalPages?: number;
  total?: number;
  limit?: number;
}

@Component({
  selector: 'app-multiple-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './multiple-upload.component.html',
  styleUrl: './multiple-upload.component.css',
})
export class MultipleUploadComponent {
  previewUrls: string[] = [];
  previewFiles: File[] = [];
  isUploading = false;
  isUploadButtonDisabled = true;
  medias: any = [];
  media: any = undefined;
  meta: PaginationMeta = { page: 1, limit: 0, totalPages: 1, total: 0 };

  uploadedFiles: {
    file: File;
    url: string;
    filename: string;
    preview?: string;
  }[] = [];

  constructor(
    private createMediaService: CreateMediaService,
    private multipleUploadService: MultipleUploadService,
    private readonly user: AuthService,
    private mediaService: MediaService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.mediaService.getMedias(params).subscribe((res) => {
        this.medias = res.data;
        this.meta = res.meta;
      });
    });
  }

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
        if (event?.body !== undefined) {
          for (let i = 0; i < event?.body?.length; i++) {
            const file = files[i];
            const fileData = event.body[i];
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
      this.isUploading = false;
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
        this.snackBar.open('Images metadata successfully submitted.', 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['custom-snackbar-success'],
        });
        this.isUploading = false;
        this.previewUrls = [];
        this.uploadedFiles = [];
        this.previewFiles = [];
        this.isUploading = false;
      },
      error: (err) => console.error('User fetch error:', err),
    });
  }
}
