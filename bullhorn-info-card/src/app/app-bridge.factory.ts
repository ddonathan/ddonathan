import { HttpClient } from '@angular/common/http';
import { AppBridge, DevAppBridge } from 'novo-elements';
import { environment } from '../../environment';

declare const postRobot: any;

export function appBridgeFactory(http: HttpClient): AppBridge | DevAppBridge {
    if (typeof postRobot === 'undefined') {
        console.error('postRobot is not defined. Make sure it\'s properly loaded.');
        // Create a more complete mock AppBridge
        return {
            id: 'MockAppBridge',
            traceName: 'MockAppBridge',
            windowName: 'MockAppBridge',
            _registeredFrames: [],
            _handlers: {},
            _tracing: false,
            _eventListeners: {},
            postRobot: null,
            register: () => {},
            tracing: false,
            httpGET: () => Promise.reject('AppBridge not properly initialized'),
            httpPOST: () => Promise.reject('AppBridge not properly initialized'),
            httpPUT: () => Promise.reject('AppBridge not properly initialized'),
            httpDELETE: () => Promise.reject('AppBridge not properly initialized'),
            open: () => Promise.reject('AppBridge not properly initialized'),
            close: () => Promise.reject('AppBridge not properly initialized'),
            refresh: () => Promise.reject('AppBridge not properly initialized'),
            ping: () => Promise.reject('AppBridge not properly initialized'),
            execute: () => Promise.reject('AppBridge not properly initialized'),
            download: () => Promise.reject('AppBridge not properly initialized'),
            print: () => Promise.reject('AppBridge not properly initialized'),
            getUserProfile: () => Promise.reject('AppBridge not properly initialized'),
            getLocation: () => Promise.reject('AppBridge not properly initialized'),
            getLocale: () => Promise.reject('AppBridge not properly initialized'),
            getTimezone: () => Promise.reject('AppBridge not properly initialized'),
            getCurrency: () => Promise.reject('AppBridge not properly initialized'),
            getSessionId: () => Promise.reject('AppBridge not properly initialized'),
            createEvent: () => Promise.reject('AppBridge not properly initialized'),
            fireEvent: () => Promise.reject('AppBridge not properly initialized'),
            hideSpinner: () => Promise.reject('AppBridge not properly initialized'),
            showSpinner: () => Promise.reject('AppBridge not properly initialized'),
            setTitle: () => Promise.reject('AppBridge not properly initialized'),
            setHeight: () => Promise.reject('AppBridge not properly initialized'),
            setWidth: () => Promise.reject('AppBridge not properly initialized'),
            openCustomTab: () => Promise.reject('AppBridge not properly initialized'),
            closeCustomTab: () => Promise.reject('AppBridge not properly initialized'),
            addEventListener: () => {},
            removeEventListener: () => {},
            destroy: () => {},
            _trace: () => {},
            _executeHandler: () => Promise.reject('AppBridge not properly initialized'),
            _handleMessage: () => {},
            _sendMessage: () => Promise.reject('AppBridge not properly initialized'),
        } as unknown as AppBridge;
    }

    const bridge = environment.production
        ? new AppBridge('BullhornInfoCard')
        : new DevAppBridge('BullhornInfoCard', http);
    
    bridge.register();
    bridge.tracing = true;
    return bridge;
}