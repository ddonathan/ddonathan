import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BullhornInfoCardComponent } from './bullhorn-info-card.component';

describe('BullhornInfoCardComponent', () => {
  let component: BullhornInfoCardComponent;
  let fixture: ComponentFixture<BullhornInfoCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BullhornInfoCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BullhornInfoCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
