import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ElementRef,
  SimpleChanges,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-media-library-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-library-modal.component.html',
  styleUrl: './media-library-modal.component.css',
})
export class MediaLibraryModalComponent implements OnChanges {
  @Input() medias: any[] = [];
  @Input() mediaUrls: any[] = [];
  @Input() mutateStatus: boolean = false;
  @Output() confirmSelection = new EventEmitter<string[]>();
  @Output() uploadSelectedFiles = new EventEmitter<FileList>();
  @ViewChild('modalFileInput') modalFileInput!: ElementRef<HTMLInputElement>;

  selectedMediaUrls: Set<string> = new Set();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mediaUrls'] && this.mediaUrls) {
      this.selectedMediaUrls = new Set(this.mediaUrls.map((m: any) => m.url));
    }
  }

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

  onModalConfirmSelection(): void {
    const selectedUrls = Array.from(this.selectedMediaUrls);
    this.confirmSelection.emit(selectedUrls);
  }

  onModalFileSelected(event: any) {
    this.uploadSelectedFiles.emit(event.target.files);
  }
}
