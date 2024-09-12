import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';
import { NovoElementsModule, AppBridge } from 'novo-elements';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { appBridgeFactory } from './app/app-bridge.factory';

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(NovoElementsModule, HttpClientModule),
    {
      provide: AppBridge,
      useFactory: appBridgeFactory,
      deps: [HttpClient]
    }
  ]
}).catch(err => console.error(err));
