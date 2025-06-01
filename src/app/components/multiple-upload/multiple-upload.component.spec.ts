import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultipleUploadComponent } from './multiple-upload.component';

describe('MultipleUploadComponent', () => {
  let component: MultipleUploadComponent;
  let fixture: ComponentFixture<MultipleUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultipleUploadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultipleUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
