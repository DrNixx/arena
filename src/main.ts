/// <reference path="dts/index.d.ts" />
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';

import appInit from './app';
import { init as settingsInit } from './settings';
import { init as i18nInit } from './i18n';
import { init as themeInit } from './theme';
import routes from './routes';
import { processWindowLocation } from './router';

import deepLinks from './deepLinks';
import globalConfig from './config';
import { setSdk } from './sdk';

settingsInit()
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
        setTimeout(() => {
            SplashScreen.hide();
        }, 500)
    })
    .then(() => YaGames.init())
    .then((ysdk) => {
        console.log('Yandex SDK initialized');
        ysdk.features.LoadingAPI?.ready();
        setSdk(ysdk);
    })
    .catch((e) => console.error(e));
