import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SingleMediaLibraryComponent } from './single-media-library.component';

describe('SingleMediaLibraryComponent', () => {
  let component: SingleMediaLibraryComponent;
  let fixture: ComponentFixture<SingleMediaLibraryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SingleMediaLibraryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SingleMediaLibraryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
