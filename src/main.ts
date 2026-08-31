/// <reference path="dts/index.d.ts" />
import { App } from '@capacitor/app';

import appInit from './app';
import { init as settingsInit } from './settings';
import { init as i18nInit } from './i18n';
import { init as themeInit } from './theme';
import routes from './routes';
import { processWindowLocation } from './router';

import deepLinks from './deepLinks';
import globalConfig from './config';
import { setSdk } from './sdk';
import { setUnauthorizedHandler } from './http';
import redraw from './utils/redraw';
import { initNetwork } from './utils';
import session from './session';

YaGames.init()
    .then((ysdk) => {
        console.log('Yandex SDK initialized');
        setSdk(ysdk);
        // Регистрируем до первого запроса, чтобы 401 умел чиниться сам с самого старта.
        setUnauthorizedHandler(session.recoverFromUnauthorized);
    })
    .then(() => initNetwork())
    .then(() => settingsInit())
    .then(() => App.getInfo().catch(() => ({ version: globalConfig.packageVersion })))
    .then((ai) => appInit(ai))
    .then(() => {
        routes.init();
        deepLinks.init();
    })
    .then(themeInit)
    .then(i18nInit)
    .then(() => processWindowLocation())
    .then(() => {
        session.establish().then(() => redraw());
    })
    .catch((e) => console.error(e));
