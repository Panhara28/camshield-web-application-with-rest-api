// src/app/components/media-library-modal/media-library-modal.component.ts
import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-media-library-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-library-modal.component.html',
  styleUrl: './media-library-modal.component.css',
})
export class MediaLibraryModalComponent {
  @Input() medias: any[] = [];
  @Output() confirmSelection = new EventEmitter<string[]>();
  @Output() uploadSelectedFiles = new EventEmitter<FileList>();

  @ViewChild('modalFileInput') modalFileInput!: ElementRef<HTMLInputElement>;

  selectedMediaUrls: Set<string> = new Set();

  toggleMediaSelection(url: string) {
    if (this.selectedMediaUrls.has(url)) {
      this.selectedMediaUrls.delete(url);
    } else {
      this.selectedMediaUrls.add(url);
    }
  }

  isSelectedMedia(url: string): boolean {
    return this.selectedMediaUrls.has(url);
  }

  onModalConfirmSelection() {
    this.confirmSelection.emit(Array.from(this.selectedMediaUrls));
  }

  onModalFileSelected(event: any) {
    this.uploadSelectedFiles.emit(event.target.files);
  }
}
