import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
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
import { ImageDetailComponent } from '../image-detail/image-detail.component';
import { MediaLibraryModalComponent } from '../media-library-modal/media-library-modal.component';

interface PaginationMeta {
  page?: number;
  totalPages?: number;
  total?: number;
  limit?: number;
}

@Component({
  selector: 'app-multiple-upload',
  standalone: true,
  imports: [
    CommonModule,
    CdkDrag,
    CdkDropList,
    ImageDetailComponent,
    MediaLibraryModalComponent,
  ],
  templateUrl: './multiple-upload.component.html',
  styleUrl: './multiple-upload.component.css',
})
export class MultipleUploadComponent {
  // ===========================
  // Angular Decorators
  // ===========================
  @ViewChild('fileInputRef') fileInputRef!: ElementRef<HTMLInputElement>;
  @Output() mediaUrlsChanged = new EventEmitter<any[]>();
  @Input() mediaUrls: any = [];
  @Input() mutateStatus: boolean = false;

  // ===========================
  // Media & Upload States
  // ===========================
  medias: any = [];
  media: any = undefined;
  uploadedFiles: {
    file: File;
    url: string;
    filename: string;
    preview?: string;
  }[] = [];
  isUploading = false;
  isUploadButtonDisabled = true;
  maxThumbnails = 8;

  // ===========================
  // Media Preview
  // ===========================
  previewUrls: string[] = [];
  previewFiles: File[] = [];
  isExpanded = false;

  // ===========================
  // Media Selection & Confirmation
  // ===========================
  selectedMediaUrls: Set<string> = new Set();
  confirmedMediaUrls: Set<string> = new Set();
  selectedConfirmedUrls: Set<string> = new Set();
  confirmedMediaList: any[] = [];
  checkedMediaUrls: Set<string> = new Set();

  // ===========================
  // UI State
  // ===========================
  selectedImageDetail: any = null;
  isImagePopupOpen = false;

  // ===========================
  // Pagination Metadata
  // ===========================
  meta: PaginationMeta = { page: 1, limit: 20, totalPages: 1, total: 0 };

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
    if (this.mutateStatus && Array.isArray(this.mediaUrls)) {
      this.confirmedMediaUrls = new Set(
        this.mediaUrls.map((media: any) => media.url)
      );
      this.confirmedMediaList = [...this.mediaUrls];
    }

    this.route.queryParams.subscribe((params) => {
      this.mediaService.getMedias(params).subscribe((res) => {
        this.medias = res.data;
        this.meta = res.meta;

        // 🛠 Refresh confirmed list using current confirmedMediaUrls
        this.confirmedMediaList = this.medias.filter((m: any) =>
          this.confirmedMediaUrls.has(m.url)
        );
      });
    });
  }

  drop(event: CdkDragDrop<any[]>) {
    if (this.mutateStatus) {
      moveItemInArray(this.mediaUrls, event.previousIndex, event.currentIndex);
    } else {
      moveItemInArray(
        this.confirmedMediaList,
        event.previousIndex,
        event.currentIndex
      );
    }
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
          // Add temporary media for UI display
          for (let i = 0; i < event.body.length; i++) {
            const fileData = event.body[i];
            const url = fileData.url;
            this.confirmedMediaUrls.add(url);
            this.selectedMediaUrls.add(url);
          }
          this.mediaUrlsChanged.emit(event.body); // emit to parent

          this.loadMediaList(); // ✅ reload actual media objects from backend
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

  onModalFileSelected(files: FileList) {
    const uploadFiles = Array.from(files);

    this.multipleUploadService.uploadFiles('multiple', uploadFiles).subscribe({
      next: (event: any) => {
        if (event?.body !== undefined) {
          for (let i = 0; i < event.body.length; i++) {
            const url = event.body[i].url;
            this.confirmedMediaUrls.add(url);
            this.selectedMediaUrls.add(url);
          }
          this.loadMediaList(); // refresh media list from server
        }
      },
      error: (err) => console.error('Modal upload error:', err),
    });
  }

  onModalConfirmSelection(selectedUrls: string[]): void {
    const selectedMediaObjects = this.medias.filter((m: any) =>
      selectedUrls.includes(m.url)
    );

    const allMedia = [...this.mediaUrls, ...selectedMediaObjects];
    const uniqueMap = new Map<string, any>();
    allMedia.forEach((m) => uniqueMap.set(m.url, m));

    this.confirmedMediaList = Array.from(uniqueMap.values());
    this.confirmedMediaUrls = new Set(
      this.confirmedMediaList.map((m) => m.url)
    );

    // ✅ ADD THIS TO UPDATE THE BOUND VIEW
    if (this.mutateStatus) {
      this.mediaUrls = [...this.confirmedMediaList];
    }

    this.mediaUrlsChanged.emit(this.confirmedMediaList);
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
    const mediaList = this.mutateStatus
      ? Array.isArray(this.mediaUrls)
        ? this.mediaUrls
        : []
      : this.confirmedMediaList;

    const remaining = mediaList.length - 1; // skip first
    return remaining > this.maxThumbnails ? remaining - this.maxThumbnails : 0;
  }

  clearSelectedMedia(): void {
    if (this.mutateStatus) {
      // Remove from mediaUrls
      const updated = this.mediaUrls.filter(
        (media: any) => !this.checkedMediaUrls.has(media.url)
      );
      this.mediaUrls = [...updated];

      // 🔥 If nothing left, also reset everything else
      if (this.mediaUrls.length === 0) {
        this.confirmedMediaList = [];
        this.confirmedMediaUrls.clear();
      } else {
        this.confirmedMediaList = [...this.mediaUrls];
        this.confirmedMediaUrls = new Set(
          this.mediaUrls.map((m: any) => m.url)
        );
      }

      this.mediaUrlsChanged.emit([...this.mediaUrls]);
    } else {
      // For create mode
      this.medias = this.medias.filter(
        (media: any) => !this.checkedMediaUrls.has(media.url)
      );

      for (const url of this.checkedMediaUrls) {
        this.confirmedMediaUrls.delete(url);
      }

      this.confirmedMediaList = this.medias.filter((m: any) =>
        this.confirmedMediaUrls.has(m.url)
      );

      this.mediaUrlsChanged.emit([...this.confirmedMediaList]);
    }

    this.checkedMediaUrls.clear();
  }

  getFirstConfirmedMedia(): any | null {
    if (this.mutateStatus) {
      return Array.isArray(this.mediaUrls) && this.mediaUrls.length > 0
        ? this.mediaUrls[0]
        : null;
    } else {
      return this.confirmedMediaList.length > 0
        ? this.confirmedMediaList[0]
        : null;
    }
  }
  onMediaClicked(media: any): void {
    this.selectedImageDetail = media;
  }

  private loadMediaList() {
    const params = this.route.snapshot.queryParams;
    this.mediaService.getMedias(params).subscribe({
      next: (res) => {
        this.medias = res.data;
        this.meta = res.meta;

        // Refresh confirmedMediaList from confirmedMediaUrls
        this.confirmedMediaList = this.medias.filter((m: any) =>
          this.confirmedMediaUrls.has(m.url)
        );
      },
      error: (err) => console.error('Failed to fetch medias:', err),
    });
  }

  getVisibleMediaList(): any[] {
    const mediaList = this.mutateStatus
      ? Array.isArray(this.mediaUrls)
        ? this.mediaUrls
        : []
      : this.confirmedMediaList;

    if (mediaList.length <= 1) return [];

    // skip first image
    const rest = mediaList.slice(1);

    return this.isExpanded ? rest : rest.slice(0, this.maxThumbnails);
  }
}
