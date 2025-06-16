import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { Modal } from 'bootstrap';

@Component({
  selector: 'app-single-media-library',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './single-media-library.component.html',
  styleUrl: './single-media-library.component.css',
})
export class SingleMediaLibraryComponent implements OnChanges {
  @Input() medias: any[] = [];
  @Output() confirmSelection = new EventEmitter<string[]>();
  @Output() uploadSelectedFiles = new EventEmitter<FileList>();
  @Input() selectedImageUrl: string | null = null;
  @Input() productId!: number;
  @ViewChild('modalRef', { static: false }) modalRef!: ElementRef;
  @ViewChild('modalFileInput') modalFileInput!: ElementRef<HTMLInputElement>;

  selectedMediaUrl: string | null = null;
  selectedMediaUrls: Set<string> = new Set();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedImageUrl'] && this.selectedImageUrl) {
      this.selectedMediaUrl = this.selectedImageUrl;
    }

    if (changes['medias']) {
      this.refreshMediaList();
    }

    if (
      this.selectedMediaUrl &&
      !this.medias.find((m) => m.url === this.selectedMediaUrl)
    ) {
      this.selectedMediaUrl = null;
    }
  }

  // 🔄 Force change detection-friendly re-assignment
  refreshMediaList(): void {
    this.medias = [...this.medias];
  }

  open() {
    const modal = new Modal(this.modalRef.nativeElement);
    modal.show();
  }

  toggleMediaSelection(url: string) {
    this.selectedMediaUrl = url;
  }

  isSelectedMedia(url: string): boolean {
    return this.selectedMediaUrl === url;
  }

  onModalConfirmSelection() {
    if (this.selectedMediaUrl) {
      this.confirmSelection.emit([this.selectedMediaUrl]);
    }
  }
}
