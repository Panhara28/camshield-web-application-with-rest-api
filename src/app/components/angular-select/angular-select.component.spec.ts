import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AngularSelectComponent } from './angular-select.component';

describe('AngularSelectComponent', () => {
  let component: AngularSelectComponent;
  let fixture: ComponentFixture<AngularSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AngularSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AngularSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
