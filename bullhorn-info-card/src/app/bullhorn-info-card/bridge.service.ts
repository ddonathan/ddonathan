import { Injectable } from '@angular/core';
import { AlleyLinkColors, AppBridge } from 'novo-elements';
import { Observable, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BridgeService {
  // Query string parameter received from Bullhorn:
  currentBullhornUrl: string = '';

  // Flag provided by the extension in the register method
  requiresWindowObject = false;
  // The novo elements app bridge instance that communicates with the Novo/S-Release MainFrame
  private readonly bridge: AppBridge;

  constructor() {
    // for custom actions
    this.requiresWindowObject = true;
    this.bridge = new AppBridge();
  }

  /**
   * Executes an AppBridge command, with a single retry giving time for the app to register if needed
   *
   * @param execute a function that receives the appBridge object and performs some action
   */
  execute(execute: (bridge: AppBridge) => void): void {
    execute(this.bridge);
  }

  register(config?: {
    url: string;
    title: string;
    color: AlleyLinkColors;
  }): Observable<string> {
    if (config) {
      return from(this.bridge.register(config));
    }
    return from(this.bridge.register());
  }

  setCurrentBullhornUrl(url: string) {
    this.currentBullhornUrl = url;
  }
}