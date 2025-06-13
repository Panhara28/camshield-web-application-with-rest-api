import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-single-media-library',
  imports: [CommonModule],
  templateUrl: './single-media-library.component.html',
  styleUrl: './single-media-library.component.css',
})
export class SingleMediaLibraryComponent {
  @Input() medias: any[] = [];
  @Output() confirmSelection = new EventEmitter<string[]>();
  @Output() uploadSelectedFiles = new EventEmitter<FileList>();
  @Input() selectedImageUrl: string | null = null;

  @ViewChild('modalFileInput') modalFileInput!: ElementRef<HTMLInputElement>;
  selectedMediaUrl: string | null = null;
  selectedMediaUrls: Set<string> = new Set();

  ngOnChanges() {
    if (this.selectedImageUrl) {
      this.selectedMediaUrl = this.selectedImageUrl;
    }
  }

  toggleMediaSelection(url: string) {
    this.selectedMediaUrl = url;
  }

  isSelectedMedia(url: string): boolean {
    return this.selectedMediaUrl === url;
  }

  onModalConfirmSelection() {
    if (this.selectedMediaUrl) {
      this.confirmSelection.emit([this.selectedMediaUrl]); // still emit array for consistency
    }
  }
}
