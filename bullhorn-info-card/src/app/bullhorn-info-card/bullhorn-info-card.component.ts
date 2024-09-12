import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NovoCardModule, NovoLoadingModule } from 'novo-elements';
import { AppBridge } from 'novo-elements';
import { BridgeService } from './bridge.service';

@Component({
  selector: 'app-bullhorn-info-card',
  standalone: true,
  imports: [CommonModule, NovoCardModule, NovoLoadingModule],
  template: `
    <novo-card class="bullhorn-info-card">
      <novo-card-header>Bullhorn Info Card</novo-card-header>
      <novo-card-content>
        <novo-loading *ngIf="loading"></novo-loading>
        <table *ngIf="!loading" class="info-table">
          <tbody>
            <tr *ngFor="let item of infoItems">
              <td class="label-cell">{{ item.label }}</td>
              <td class="value-cell" [innerHTML]="item.value"></td>
            </tr>
          </tbody>
        </table>
      </novo-card-content>
    </novo-card>
  `,
  styles: [`
    .bullhorn-info-card {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
    }
    .info-table tr {
      border-bottom: 1px solid #e0e0e0;
    }
    .info-table td {
      padding: 8px;
      vertical-align: top;
    }
    .label-cell {
      font-weight: bold;
      color: #999;
      width: 40%;
    }
    .value-cell {
      word-break: break-word;
      white-space: pre-wrap;
      font-family: monospace;
    }
  `]
})
export class BullhornInfoCardComponent implements OnInit {
  info: any;
  loading = true;
  infoItems: { label: string; value: string }[] = [];

  constructor(private bridge: BridgeService) { }

  ngOnInit() {
    this.fetchBullhornInfo();
  }

  async fetchBullhornInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bridge.execute((appBridge: AppBridge) => {
        appBridge.httpGET(`settings/corporationId,corporationName,userId,bboName,deptId,allPrivateLabelIds,userTypeId,privateLabelId,userDepartments`).then((response: any) => {
          this.info = response.data;
          this.processSettings();
          this.loading = false;
          resolve(response.data);
        }).catch((error: Error) => {
          this.loading = false;
          reject(error);
        });
      });
    });
  }
  
  processSettings() {
    this.infoItems = Object.entries(this.info).map(([key, value]) => ({
      label: this.formatLabel(key),
      value: this.formatValue(value)
    }));
  }

  private formatLabel(key: string): string {
    return key
      .split(/(?=[A-Z])/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (Array.isArray(value)) {
      return this.formatArray(value);
    }
    if (typeof value === 'object') {
      return this.formatObject(value);
    }
    return String(value);
  }

  private formatArray(arr: any[]): string {
    return arr.map(item => this.formatValue(item)).join('<br>');
  }

  private formatObject(obj: any): string {
    const entries = Object.entries(obj);
    return entries.map(([key, value]) => `${key}: ${this.formatValue(value)}`).join('<br>');
  }
}
