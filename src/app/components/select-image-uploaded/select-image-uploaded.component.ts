// import { CommonModule } from '@angular/common';
// import { Component, EventEmitter, Input, Output } from '@angular/core';

// @Component({
//   selector: 'app-select-image-upload',
//   standalone: true,
//   templateUrl: './select-image-uploaded.component.html',
//   styleUrl: './select-image-uploaded.component.css',
//   imports: [CommonModule],
// })
// export class SelectImageUploadComponent {
//   @Input() medias: any[] = [];
//   @Input() selectedMediaUrls: Set<string> = new Set();

//   @Output() fileSelected = new EventEmitter<FileList>();
//   @Output() confirmSelection = new EventEmitter<void>();
//   @Output() toggleSelect = new EventEmitter<string>();

//   isSelectedMedia(url: string): boolean {
//     return this.selectedMediaUrls.has(url);
//   }

//   onFileSelected(event: any) {
//     const files = event.target.files;
//     if (files) this.fileSelected.emit(files);
//   }

//   toggleMediaSelection(url: string) {
//     this.toggleSelect.emit(url);
//   }

//   onDoneClick() {
//     this.confirmSelection.emit();
//   }
// }
