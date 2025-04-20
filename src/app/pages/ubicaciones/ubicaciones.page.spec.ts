import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UbicacionesPage } from './ubicaciones.page';

describe('UbicacionesPage', () => {
  let component: UbicacionesPage;
  let fixture: ComponentFixture<UbicacionesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UbicacionesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
