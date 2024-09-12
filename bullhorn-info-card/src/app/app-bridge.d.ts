import { AppBridge as NovoAppBridge } from 'novo-elements';

declare module 'novo-elements' {
  interface AppBridge extends NovoAppBridge {
    httpGET(options: { relativeURL: string }): Promise<any>;
    // Add other methods if needed
  }
}