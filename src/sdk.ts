import type { SDK } from 'ysdk';

let ysdk: SDK | undefined;

export function setSdk(sdk: SDK) {
    ysdk = sdk;
}

export function getSdk(): SDK {
    // Без этой проверки вызов до YaGames.init() возвращал undefined, и падало
    // строчкой ниже безымянным "Cannot read properties of undefined".
    if (ysdk === undefined) {
        throw new Error('Yandex SDK не инициализирован: getSdk() вызван до того, как разрешился YaGames.init()');
    }

    return ysdk;
}
