import { registerPlugin } from '@capacitor/core';
import type { NetworkPlugin } from '@capacitor/network';

const Network = registerPlugin<NetworkPlugin>('Network', {
    web: () => import('./NetworkWeb').then(m => new m.NetworkWeb()),
});
export type { ConnectionStatus, ConnectionType } from '@capacitor/network';
export { Network };