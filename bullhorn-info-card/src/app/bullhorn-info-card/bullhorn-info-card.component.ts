import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NovoCardModule, NovoLoadingModule, NovoButtonModule } from 'novo-elements';
import { AppBridge } from 'novo-elements';
import { BridgeService } from './bridge.service';

@Component({
  selector: 'app-bullhorn-info-card',
  standalone: true,
  imports: [CommonModule, NovoCardModule, NovoLoadingModule, NovoButtonModule],
  template: `
    <novo-card class="bullhorn-info-card">
      <novo-card-header>Bullhorn Info Card</novo-card-header>
      <novo-card-content>
        <button theme="primary" icon="clipboard" (click)="copyToClipboard()" [disabled]="loading">Copy to Clipboard</button>
        <novo-loading *ngIf="loading"></novo-loading>
        <div *ngIf="!loading">
          <table class="info-table">
            <tbody>
              <tr *ngFor="let item of infoItems">
                <td class="label-cell">{{ item.label }}</td>
                <td class="value-cell" [innerHTML]="item.value"></td>
              </tr>
            </tbody>
          </table>
        </div>
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
      margin-top: 15px;
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
    button {
      margin-bottom: 15px;
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
        appBridge.httpGET(`settings/corporationId,corporationName,userId,bboName,deptId,allPrivateLabelIds,userTypeId,privateLabelId,userDepartments,jobResponseStatusList,multiratePlacementEnabled,novoEnabled,novoTaxInfoTab,placementApprovalStatus,placementTracksEnabled,rejectedJobResponseStatus,submissionPlacedStatus,wfrEnabled,accountLockoutDuration,bullhornStaffingHost,candidatePlacedStatusList,companyOwnershipEnabled,contactLocationsEnabled,enableClientLocation,entityTitleCandidate,entityTitleClientContact,entityTitleClientCorporation,entityTitleJobOrder,entityTitleJobSubmission,entityTitleLead,entityTitleLocation,entityTitlePlacement,fileTypeList,jobResponseStatusList,jobBoardPublishingApprovedStatus,suppressPlacementEffectiveDateFieldInteraction,taxesV2Enabled`).then((response: any) => {
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

  copyToClipboard() {
    const clipboardText = JSON.stringify(this.info, null, 2);

    const textArea = document.createElement('textarea');
    textArea.value = clipboardText;
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      console.log('Copied original object to clipboard successfully');
      // Optionally, you can add a toast notification here to inform the user
    } catch (err) {
      console.error('Could not copy text: ', err);
    } finally {
      document.body.removeChild(textArea);
    }
  }
}
