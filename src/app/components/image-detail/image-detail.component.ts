import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-image-detail',
  templateUrl: './image-detail.component.html',
  styleUrls: ['./image-detail.component.css'],
})
export class ImageDetailComponent {
  @Input() imageUrl!: string;
  @Input() filename!: string;
  @Input() altText!: string;
  @Input() fileExtension!: string;
  @Input() fileSize!: string;
  @Input() width!: number;
  @Input() height!: number;
  @Input() addedDate!: string;
  @Output() close = new EventEmitter<void>();

  @Output() onToggle = new EventEmitter<string>();

  isSidebarVisible = false;

  toggleSidebar() {
    this.isSidebarVisible = !this.isSidebarVisible;
  }

  handleImageClick() {
    this.onToggle.emit(this.imageUrl);
  }

  closePopup() {
    this.close.emit();
  }
}
