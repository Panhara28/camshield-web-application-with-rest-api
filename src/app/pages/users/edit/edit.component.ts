import { Component } from '@angular/core';
import { LayoutsComponent } from '../../../components/layouts/layouts.component';
import { PageTitleComponent } from '../../../components/page-title/page-title.component';
import { MatTabsModule } from '@angular/material/tabs';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EditUserService } from '../../../services/edit-user.service';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UploadService } from '../../../services/upload.service';

@Component({
  selector: 'app-edit',
  imports: [
    LayoutsComponent,
    PageTitleComponent,
    MatTabsModule,
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.css',
})
export class EditComponent {
  editForm: FormGroup;
  slug: string = '';
  isUploading: boolean = false;
  isSaving: boolean = false;
  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private editUserService: EditUserService,
    private snackBar: MatSnackBar,
    private uploadService: UploadService
  ) {
    this.editForm = this.fb.group({
      name: [''],
      profilePicture: [''],
    });
  }

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('id') || '';
    this.editUserService.getUser(this.slug).subscribe((user) => {
      this.editForm.patchValue(user);
    });
  }

  onSaveChanges(): void {
    this.isSaving = true;
    this.editUserService.updateUser(this.slug, this.editForm.value).subscribe({
      next: (response) => {
        this.snackBar.open('User updated successfully', 'Close', {
          duration: 3000,
        });
        this.isSaving = false;
      },
      error: () => {
        this.snackBar.open('Failed to update user', 'Close', {
          duration: 3000,
        });
        this.isSaving = false;
      },
    });
  }

  onFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      this.isUploading = true;
      this.uploadService.uploadFile(file, 'users').subscribe({
        next: (res) => {
          if (res?.url) {
            this.editForm.patchValue({ profilePicture: res.url });
            this.snackBar.open('Upload successful', 'Close', {
              duration: 3000,
            });
          } else {
            this.snackBar.open('Unexpected upload response', 'Close', {
              duration: 3000,
            });
          }
          this.isUploading = false;
        },
        error: () => {
          this.snackBar.open('Upload failed', 'Close', { duration: 3000 });
          this.isUploading = false;
        },
      });
    }
  }
}
