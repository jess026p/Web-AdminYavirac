import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { UserHeaderComponent } from './user-header.component';

describe('UserHeaderComponent', () => {
  let component: UserHeaderComponent;
  let fixture: ComponentFixture<UserHeaderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [UserHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
