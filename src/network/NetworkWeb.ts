import { WebPlugin } from '@capacitor/core';
import type { ConnectionStatus, ConnectionType, NetworkPlugin } from '@capacitor/network';
import * as xhr from '../xhr'

declare global {
    interface Navigator {
        connection: any;
        mozConnection: any;
        webkitConnection: any;
    }
}

function translatedConnection(): ConnectionType {
    const connection = window.navigator.connection ||
        window.navigator.mozConnection ||
        window.navigator.webkitConnection;
    let result: ConnectionType = 'unknown';
    const type = connection ? connection.type || connection.effectiveType : null;
    if (type && typeof type === 'string') {
        switch (type) {
            // possible type values
            case 'bluetooth':
            case 'cellular':
                result = 'cellular';
                break;
            case 'none':
                result = 'none';
                break;
            case 'ethernet':
            case 'wifi':
            case 'wimax':
                result = 'wifi';
                break;
            case 'other':
            case 'unknown':
                result = 'unknown';
                break;
            // possible effectiveType values
            case 'slow-2g':
            case '2g':
            case '3g':
                result = 'cellular';
                break;
            case '4g':
                result = 'wifi';
                break;
            default:
                break;
        }
    }

    return result;
}
export class NetworkWeb extends WebPlugin implements NetworkPlugin {
    private handleOnline;
    private handleOffline;

    constructor() {
        super();
        this.handleOnline = () => {
            this.getStatus().then((status) => {
                this.notifyListeners('networkStatusChange', status);
            })
        };
        
        this.handleOffline = () => {
            const status = {
                connected: false,
                connectionType: 'none',
            };

            this.notifyListeners('networkStatusChange', status);
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.handleOnline);
            window.addEventListener('offline', this.handleOffline);
        }
    }
    async getStatus(): Promise<ConnectionStatus> {
        if (!window.navigator) {
            throw this.unavailable('Browser does not support the Network Information API');
        }

        const connected = window.navigator.onLine;
        const connectionType = translatedConnection();
        
        const status = {
            connected,
            connectionType: connected ? connectionType : <ConnectionType>'none',
        };

        if (connected) {
            return xhr.status()
                .then(() => {
                    return status;
                })
                .catch((_e) => {
                    // console.log(e);
                    status.connected = false;
                    status.connectionType = 'none';
                    return status;
                });
        }

        return status;
    }
}
const Network = new NetworkWeb();
export { Network };