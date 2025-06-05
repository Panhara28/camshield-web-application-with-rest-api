import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateMediaService } from '../../services/create-media.service';
import { MultipleUploadService } from '../../services/multiple-upload.service';
import { AuthService } from '../../services/auth.service';
import { MediaService } from '../../services/medias.service';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';

interface PaginationMeta {
  page?: number;
  totalPages?: number;
  total?: number;
  limit?: number;
}

@Component({
  selector: 'app-multiple-upload',
  standalone: true,
  imports: [CommonModule, CdkDrag, CdkDropList],
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
  meta: PaginationMeta = { page: 1, limit: 20, totalPages: 1, total: 0 };
  selectedMediaUrls: Set<string> = new Set();
  @ViewChild('fileInputRef') fileInputRef!: ElementRef<HTMLInputElement>;
  maxThumbnails = 8;
  isExpanded = false;
  confirmedMediaUrls: Set<string> = new Set();
  selectedConfirmedUrls: Set<string> = new Set();
  confirmedMediaList: any[] = [];
  checkedMediaUrls: Set<string> = new Set();

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

  onMediaCheckboxChange(url: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.checkedMediaUrls.add(url);
    } else {
      this.checkedMediaUrls.delete(url);
    }
  }

  isMediaChecked(url: string): boolean {
    return this.checkedMediaUrls.has(url);
  }

  onMediaCheckboxToggle(url: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      this.checkedMediaUrls.add(url);
    } else {
      this.checkedMediaUrls.delete(url);
    }
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.mediaService.getMedias(params).subscribe((res) => {
        this.medias = res.data;
        this.meta = res.meta;
      });
    });
  }

  drop(event: CdkDragDrop<any[]>) {
    moveItemInArray(
      this.confirmedMediaList,
      event.previousIndex,
      event.currentIndex
    );
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
            this.confirmedMediaUrls.add(newMedia.url); // ✅ make visible outside
            this.selectedMediaUrls.add(newMedia.url); // ✅ also show selected in modal
            this.confirmedMediaList = this.medias.filter((m: any) =>
              this.confirmedMediaUrls.has(m.url)
            );
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
              this.selectedMediaUrls.add(newMedia.url); // modal selection
              this.confirmedMediaUrls.add(newMedia.url); // show outside too
              this.confirmedMediaList = this.medias.filter((m: any) =>
                this.confirmedMediaUrls.has(m.url)
              );
            };

            reader.readAsDataURL(file);
          }
        }
      },
      error: (err) => console.error('Modal upload error:', err),
    });
  }

  onModalConfirmSelection() {
    this.confirmedMediaUrls = new Set(this.selectedMediaUrls);
    this.confirmedMediaList = this.medias.filter((m: any) =>
      this.confirmedMediaUrls.has(m.url)
    );
  }

  get allMediaUrls(): string[] {
    return this.medias
      .filter((media: any) => this.confirmedMediaUrls.has(media.url))
      .map((media: any) => media.url);
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

  getFirstConfirmedUrl(): string {
    for (const media of this.medias) {
      if (this.confirmedMediaUrls.has(media.url)) {
        return media.url;
      }
    }
    return '';
  }

  getRemainingConfirmedMedias(): any[] {
    const result: any[] = [];
    let skippedFirst = false;
    for (const media of this.medias) {
      if (this.confirmedMediaUrls.has(media.url)) {
        if (!skippedFirst) {
          skippedFirst = true;
          continue; // skip the first
        }
        result.push(media);
      }
    }
    return result;
  }
  getConfirmedMediaList(): any[] {
    if (this.confirmedMediaList.length <= 1) return [];

    const remaining = this.confirmedMediaList.slice(0); // exclude the first image
    return this.isExpanded ? remaining : remaining.slice(0, this.maxThumbnails);
  }

  getExtraCount(): number {
    const total = this.confirmedMediaList.length;
    if (total <= 1) return 0;

    const remaining = total - 0; // exclude the first image
    return remaining > this.maxThumbnails ? remaining - this.maxThumbnails : 0;
  }

  clearSelectedMedia(): void {
    // Remove from main medias array
    this.medias = this.medias.filter(
      (media: any) => !this.checkedMediaUrls.has(media.url)
    );

    // Remove from confirmedMediaUrls set
    for (const url of this.checkedMediaUrls) {
      this.confirmedMediaUrls.delete(url);
    }

    // Update confirmedMediaList accordingly
    this.confirmedMediaList = this.medias.filter((m: any) =>
      this.confirmedMediaUrls.has(m.url)
    );

    // Clear selected checkboxes
    this.checkedMediaUrls.clear();
  }

  getFirstConfirmedMedia(): any | null {
    return this.confirmedMediaList.length > 0
      ? this.confirmedMediaList[0]
      : null;
  }
}
