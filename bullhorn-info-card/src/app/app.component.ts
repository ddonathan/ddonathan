import { Component } from '@angular/core';
import { BullhornInfoCardComponent } from './bullhorn-info-card/bullhorn-info-card.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [BullhornInfoCardComponent],
  template: `
    <app-bullhorn-info-card></app-bullhorn-info-card>
  `,
})
export class AppComponent {}
