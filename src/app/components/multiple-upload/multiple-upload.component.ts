import { Component, ElementRef, ViewChild } from '@angular/core';
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
  selectedMediaUrls: Set<string> = new Set();
  @ViewChild('mediaModal') mediaModalRef!: ElementRef;
  @ViewChild('fileInputRef') fileInputRef!: ElementRef<HTMLInputElement>;

  confirmedMediaUrls: string[] = [];
  selectedConfirmedUrls: Set<string> = new Set();

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

  ngAfterViewInit() {
    const modalEl = this.mediaModalRef.nativeElement;
    modalEl.addEventListener('hidden.bs.modal', () => {
      // this.selectedMediaUrls.clear(); // Just clear selection, not uploaded media
    });
  }

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
    const files = event.target.files as FileList;
    if (!files) return;

    const uploadFiles: File[] = Array.from(files); // ✅ Fix typing here

    this.previewFiles.push(...uploadFiles);

    for (let file of uploadFiles) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previewUrls.push(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }

    this.multipleUploadService.uploadFiles('multiple', uploadFiles).subscribe({
      next: (event: any) => {
        if (event?.body !== undefined) {
          for (let i = 0; i < event.body.length; i++) {
            const file = uploadFiles[i];
            const fileData = event.body[i];
            const preview = this.previewUrls[i];
            const uploaded = {
              file,
              url: fileData.url,
              filename: fileData.filename,
              preview,
            };

            this.uploadedFiles.push(uploaded);

            const newMedia = {
              url: fileData.url,
              filename: fileData.filename,
              mimeType: fileData.mimeType || 'image/png',
            };
            this.medias.unshift(newMedia);
            this.selectedMediaUrls.add(newMedia.url);
          }
          this.isUploading = true;
        }
      },
      error: (err) => console.error('Upload error:', err),
    });
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

  isSelectedMedia(url: string): boolean {
    return this.selectedMediaUrls.has(url);
  }

  toggleMediaSelection(url: string) {
    if (this.selectedMediaUrls.has(url)) {
      this.selectedMediaUrls.delete(url);
    } else {
      this.selectedMediaUrls.add(url);
    }
  }

  onModalFileSelected(event: any) {
    const files: FileList | null = event.target.files;
    if (!files) return;

    const uploadFiles = Array.from(files);

    this.multipleUploadService.uploadFiles('multiple', uploadFiles).subscribe({
      next: (event: any) => {
        if (event?.body !== undefined) {
          for (let i = 0; i < event.body.length; i++) {
            const file = uploadFiles[i];
            const fileData = event.body[i];
            const reader = new FileReader();

            reader.onload = (e: any) => {
              const preview = e.target.result;

              const uploaded = {
                file,
                url: fileData.url,
                filename: fileData.filename,
                preview,
              };

              this.uploadedFiles.push(uploaded);

              const newMedia = {
                url: fileData.url,
                filename: fileData.filename,
                mimeType: fileData.mimeType || 'image/png',
              };
              this.medias.unshift(newMedia);
              // ✅ Do NOT add to tempSelectedMediaUrls (remove selection binding)
            };

            reader.readAsDataURL(file);
          }
        }
      },
      error: (err) => console.error('Modal upload error:', err),
    });
  }

  onModalConfirmSelection() {
    this.confirmedMediaUrls = Array.from(this.selectedMediaUrls);
  }

  get allMediaUrls(): string[] {
    const uploaded = this.uploadedFiles.map((f) => f.url);
    return [...uploaded, ...this.confirmedMediaUrls];
  }

  triggerMainUpload() {
    this.fileInputRef.nativeElement.click();
  }

  get selectedCount(): number {
    return this.selectedConfirmedUrls.size;
  }

  toggleSelected(url: string) {
    if (this.selectedConfirmedUrls.has(url)) {
      this.selectedConfirmedUrls.delete(url);
    } else {
      this.selectedConfirmedUrls.add(url);
    }
  }

  isChecked(url: string): boolean {
    return this.selectedConfirmedUrls.has(url);
  }

  removeSelected() {
    this.confirmedMediaUrls = this.confirmedMediaUrls.filter(
      (url) => !this.selectedConfirmedUrls.has(url)
    );
    this.selectedConfirmedUrls.clear();
  }
}
