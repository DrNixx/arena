import type { SDK } from 'ysdk';

let ysdk: SDK;

export function setSdk(sdk: SDK) {
    ysdk = sdk;
}

export function getSdk(): SDK {
    return ysdk;
}