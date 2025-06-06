import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MediaLibraryModalComponent } from './media-library-modal.component';

describe('MediaLibraryModalComponent', () => {
  let component: MediaLibraryModalComponent;
  let fixture: ComponentFixture<MediaLibraryModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaLibraryModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MediaLibraryModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
