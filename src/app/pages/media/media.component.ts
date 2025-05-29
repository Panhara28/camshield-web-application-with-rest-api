import { Component } from '@angular/core';
import { LayoutsComponent } from '../../components/layouts/layouts.component';
import { PageTitleComponent } from '../../components/page-title/page-title.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MultipleUploadService } from '../../services/multiple-upload.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-media',
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

  constructor(
    private uploadService: MultipleUploadService,
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

  private handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    Array.from(fileList).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previewUrls.push(e.target.result);
          this.previewFiles.push(file);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  removeImage(index: number) {
    this.previewUrls.splice(index, 1);
    this.previewFiles.splice(index, 1);
  }

  onUpload() {
    this.user.getCurrentUser().subscribe((user) => {
      for (let file of this.previewFiles) {
        this.uploadService
          .uploadImage(file, Number(user?.id))
          .then((metadata) => {
            // Assume you upload the file to a server or cloud here and set metadata.url
            metadata.url = `https://your-storage.com/uploads/${metadata.storedFilename}`;
            this.uploadService.submitMetadata(metadata).subscribe({
              next: () => console.log('Upload successful'),
              error: (err) => console.error('Upload failed', err),
            });
          });
      }
    });
  }
}
