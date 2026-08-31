# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это за проект

Форк [lichobile](https://github.com/lichess-org/lichobile) 8.x (мобильное приложение lichess на Capacitor),
переделанный в **браузерное приложение для Yandex.Games**. Ветка разработки — `yandex`, базовая ветка форка —
`chess-online` (не `master`).

Бэкенд — собственный форк lila на `https://live.chess-online.com` с OIDC-авторизацией на стороннем сервере.
Клиент **не имеет** формы логина/пароля (`src/ui/signupModal.ts` удалён на ветке `yandex`): единственный источник
идентичности — Yandex Games SDK, подпись игрока прокидывается на бэк.

Capacitor остаётся как API-слой (`@capacitor/app`, `toast`, `dialog`, `clipboard`, ...) и работает через
web-фоллбеки в браузере; нативных сборок в этом воркфлоу нет. `src/network/` — собственная web-реализация
`@capacitor/network`, `src/push.stub.ts` — заглушка вместо push.

## Команды

```bash
npm install
npm run build                 # inject-conf -> tsc -> stylus -> rollup -> www/
npm run watch                 # инкрементальная пересборка
npm run serve                 # http-server на :8080, открывать http://localhost:8080/www
npm start                     # watch + serve одновременно
npm run clean                 # чистит build/ и артефакты в www/
npm test                      # jest, 6 сьютов / 48 тестов, проходят
npm run lint                  # eslint, проходит чисто
npx tsc --noEmit              # быстрая проверка типов (проходит чисто)
```

Один сьют: `npx jest src/__tests__/http.ts`, один тест: `npx jest -t 'GET query params are url encoded'`.

Сборка параметризуется переменными окружения (см. `scripts/inject-conf.js`):

```bash
APP_CONFIG=yandex APP_MODE=release npm run build
```

* `APP_CONFIG` (по умолчанию `dev`) выбирает `appconfig.<key>.json` → подставляется в `src/index.mustache`
  → генерирует `www/index.html`. В git лежит только `appconfig.dev.json`, остальные (`prod`, `draft`, `yandex`)
  в `.gitignore` — локальные.
* `APP_MODE` = `dev` | `release`; `release` включает strip + terser в `rollup.config.js`.

### Линтер

Конфиг — flat (`eslint.config.js`, CommonJS); `.eslintrc.json` и `.eslintignore` удалены, ESLint 9 их не читает.

Набор правил намеренно минимальный и ровно тот же, что был до миграции: `quotes` (одинарные, `avoidEscape`),
`eqeqeq: smart`, `semi` off. Пресеты (`eslint:recommended`, `@typescript-eslint/recommended`) **не подключены** —
это следующий осознанный шаг, он даст заметный поток замечаний.

Два следствия, о которых стоит знать:

* Скрипт `eslint src/` без `--ext` под старым конфигом проверял **только `.js`** — три вендорных файла
  из 357. Во flat config расширения перечислены явно (`files: src/**/*.{js,ts,tsx}`), так что охват вырос
  с трёх файлов до всего `src/`.
* `reportUnusedDisableDirectives` выключен. Существующие `eslint-disable` гасят правила из неподключённых
  пресетов (сплошной disable на вендорных `src/dts/*.d.ts`, `prefer-const` в `socket/index.ts`), поэтому
  числятся неиспользованными, а `--fix` их удаляет. Когда пресеты появятся, директивы понадобятся обратно.

### Настройка тестов (о чём легко споткнуться)

* `tsconfig.test.json` переопределяет `module` на `commonjs`. С унаследованным из `tsconfig.json`
  `esnext` ts-jest оставляет динамические `import()` нативными, они проходят мимо трансформа jest
  и падают на первом же ESM-пакете (цепочка `network/index.ts` → `NetworkWeb` → `xhr` → `session`).
* `lodash-es` — ESM-only, а node_modules jest не трансформирует. В `moduleNameMapper` он подменён
  на CJS-сборку `lodash`, которая держится в той же версии (`4.17.21`) и стоит только в devDependencies.
  `date-fns` подмены не требует: у неё есть `require`-экспорт.
* Тесты `src/__tests__/http.ts` обязаны быть асинхронными: `http.request` читает `sessionId` через
  `await storage.get()`, поэтому `fetch` вызывается не синхронно (см. хелпер `callAndFlush`).

### Windows

`npm start` и `npm run watch` написаны в POSIX-синтаксисе (`concurrently 'npm:watch'`) — запускай их
через Git Bash, а не через PowerShell/cmd. `npm test`, `npm run build` и `npm run lint` работают везде.

## Архитектура

### Конвейер сборки

`src/*.ts(x)` → `tsc --outDir build/` → `rollup` (два бандла: `build/main.js` → `www/main.js` с code-splitting
и `build/socketWorker/index.js` → `www/socketWorker.js` как IIFE). Stylus `src/styl/index.styl` →
`www/css/compiled/app.css`. Содержимое `www/*.js`, `www/index.html`, `www/css/compiled` — артефакты, в `.gitignore`.

Алиас `~/*` → `src/*` (tsconfig `paths` + `@rollup/plugin-alias`, в jest — через `moduleNameMapper`).

### Рантайм

* **Mithril только как hyperscript** (`h`). Никакого `m.route`, `m.request`, `m.redraw`. Перерисовка — свой
  механизм `src/utils/redraw` + `signals.redraw` (дебаунс внутри animation frame). JSX-вью существуют по
  историческим причинам; новые писать на `h`.
* **Роутер** — `rlite` поверх querystring: путь живёт в `?=/game/xxxx` (`router.run(qs.slice(2))` в
  `src/router.ts`). Это важно для Yandex.Games, где приложение отдаётся из iframe.
* **WebSocket** живёт в Web Worker (`src/socketWorker/`), приложение общается с ним сообщениями через
  `src/socket/index.ts` (`tellWorker`/`askWorker`). `StrongSocket` сам делает ping/pong, ack, reconnect
  и версионирование сообщений.
* **Конфиг** — `window.lichess`, инжектится в `www/index.html` из mustache-шаблона, читается `src/config.ts`.
  `apiVersion: 5` → заголовок `Accept: application/vnd.lichess.v5+json`.
* **CSP задан в `src/index.mustache`**: `connect-src` содержит `{{{apiEndPoint}}}`/`{{{socketEndPoint}}}`,
  `script-src` разрешает `https://*.yandex.net`. При смене хоста бэкенда правь шаблон, иначе всё молча отвалится.
* **Stockfish** копируется из `stockfish/` в `www/` на шаге `postbuild`.

## Авторизация и сессии (главное отличие форка)

### Цепочка инициализации

`src/main.ts` жёстко завязана на Yandex SDK, и порядок в ней значим:

```
YaGames.init() -> setSdk(ysdk) + setUnauthorizedHandler -> initNetwork -> settingsInit
                -> appInit -> routes/deepLinks -> theme -> i18n -> processWindowLocation
                -> session.establish()
```

`src/sdk.ts` — синглтон (`setSdk`/`getSdk`); `getSdk()` бросает внятную ошибку, если его позвали
до того, как разрешился `YaGames.init()`. Скрипт SDK подключается синхронно в `<head>`
по `{{{sdkUrl}}}`: `dev`/`yandex` тянут `https://sdk.games.s3.yandex.net/sdk.js`, `prod`/`draft` ожидают
самохостящийся `/sdk.js` рядом с `index.html` (в репозитории его нет — файл кладётся при деплое,
`www/*.js` в `.gitignore`).

`src/storage.ts` — тоже поверх SDK (`ysdk.getStorage()`, `SafeStorage` ≈ localStorage). Поэтому **всё
хранилище асинхронное** (`settings`, `session`, `sessionId`) и недоступно до инициализации SDK. Старый
`asyncStorage.ts` из lichobile удалён, остался один `storage`.

### Вход

`src/session.ts`:

* `initPlayer()` — кэширует `ysdk.getPlayer()` (обычный `Player`, есть `isAuthorized()`).
* `loginInternal()` — берёт `ysdk.getPlayer({ signed: true })`, что возвращает **только** `{ signature }`
  (см. `@types/ysdk`), и делает `POST /auth/signature` с телом
  `{"provider": "yandex-game", "signature": "<base64 hmac>.<base64 профиля>"}`.
  Подпись намеренно **не передаётся в query-строке**: у неё долгий TTL, привязать к ней nonce нельзя
  (`getPlayer` не принимает `requestPayload`, в отличие от `payments.purchase` с его `developerPayload`),
  то есть это фактически бессрочный предъявительский credential, и в URL он оседал бы в access-логах и `Referer`.
  Отдельный маршрут нужен потому, что `POST /login` в lila уже занят формой логин/пароль
  (`controllers.Auth.authenticate`).
* `establish()` — **единственная** точка установления сессии на старте. Параллельные вызовы
  дедуплицируются общим промисом, поэтому её зовут оба места (`main.ts` в конце цепочки и `app.ts`
  из `onOnline()`) без всякой гонки. Порядок внутри:
  1. сверить `player.getUniqueID()` с сохранённым `yandexPlayerId`; не совпало — сбросить сессию
     через `onLogout()`, иначе после смены аккаунта Yandex уцелевший `sessionId` покажет чужой профиль;
  2. если сохранённый id есть — дешёвый путь `rememberLogin()` (`GET /account/info`), лимит
     `getPlayer` не тратится. Ошибка со `status === 0` означает «нет сети» — отдаём офлайн-копию;
  3. иначе, если игрок авторизован в Yandex, — `loginInternal()`.
  Анонимный игрок Yandex остаётся анонимом: это штатный режим, играть можно без входа.
* `recoverFromUnauthorized()` — молчаливый перелогин, зарегистрирован в `http.ts` из `main.ts`.
  Тоже дедуплицирован: пачка параллельных 401 иначе сожгла бы лимит `getPlayer`.
* `login()` (интерактивный, `throttle` 1 с) — если игрок не авторизован, открывает `ysdk.auth.openAuthDialog()`,
  переинициализирует игрока (`initPlayer(true)`) и вызывает `loginInternal()`. Возвращает `boolean`,
  а не бросает исключение при отказе от диалога.
* UI-обёртка — `src/ui/login.ts` (`loginManager.login`), дёргается из `menuView.tsx`, `challengeView.tsx`,
  `ui/training/menu.ts`. После успеха: `signals.afterLogin`, `socket.reconnectCurrent()`,
  `challengesApi.refresh()`, `session.refresh()`.

### Как сессия ездит на бэк

Два разных канала для одного и того же `sessionId` — менять нужно синхронно:

1. **HTTP** (`src/http.ts`): на каждый запрос читается `sessionId` из storage и добавляется как
   **нестандартный заголовок с именем `sessionId`** (`SESSION_ID_KEY`), плюс всегда `credentials: 'include'`
   (то есть куки бэкенда тоже работают). CORS на бэкенде должен разрешать этот заголовок.
   Заголовок можно точечно снять, передав значение-сентинел `'__delete'` в `opts.headers` — так делают
   запросы к внешним сервисам lichess (`ui/analyse/explorer/explorerXhr.ts`, `ui/shared/round/roundXhr.ts`).
2. **WebSocket** (`src/socket/index.ts`, `setupConnection`): тот же `sessionId` кладётся в **query-параметры**
   URL сокета и выставляет `opts.options.isAuth`. Заголовки в WS недоступны, поэтому канал другой.
   `reconnectCurrent()` пересоздаёт соединение, чтобы подхватить свежий `sessionId`; он подписан на
   `signals.afterLogout`.

`sessionId` приходит **только** в ответе на `/auth/signature` (поле `Session.sessionId`, помечено
«sent on login/signup only») и складывается в storage; сам объект сессии дублируется под ключом `session`
для оффлайна (`restoreStoredSession()`), а идентификатор игрока Yandex — под `yandexPlayerId`.
Все три ключа чистит `onLogout()`.

### Восстановление при 401

`http.ts` держит хук `setUnauthorizedHandler()` — инъекция, а не импорт `session.ts`, чтобы не заводить
цикл (обратный импорт уже есть). `main.ts` регистрирует туда `session.recoverFromUnauthorized` сразу
после `setSdk`. При 401 запрос повторяется ровно один раз, и только если хук доложил об успехе.

Два ограничения, оба намеренные:

* **Повторяются только GET.** Повтор POST продублировал бы ход, вызов или создание игры. После
  неудачного POST сессия всё равно восстановится и следующий запрос пройдёт — пользователь теряет
  одно действие, а не получает два.
* **`noAuthRecovery: true`** стоит на самих запросах логина (`rememberLogin`, `loginInternal`).
  Без этого восстановление ушло бы в рекурсию и заклинило на собственном дедуплицирующем промисе.

### Обновление и выход

* `refresh()` / `backgroundRefresh()` / `rememberLogin()` — все три идут в `GET /account/info`.
  Ветка `401` в `refresh()` (сброс сессии, `signals.afterLogout`, тост) осталась последним рубежом —
  до неё дело доходит, только когда автоматическое восстановление не помогло.
* `logout()` — `POST /logout`, затем `onLogout()` (чистит `session`, `sessionId`, `yandexPlayerId`) и
  `signals.afterLogout` → реконнект сокета.
* `app.ts` перезапрашивает `session.refresh()` при возврате приложения в foreground (`appStateChange`).

### Контракт `POST /auth/signature` (на бэкенде ещё не реализован)

В чекауте бэкенда `line` (ветка `chess-online2`) обработчика нет: `GET /login` там — это `oidcLogin`,
который редиректит на OIDC-провайдера и игнорирует любые параметры подписи. Клиент уже шлёт новый формат,
серверную часть нужно написать. Что она обязана делать:

1. Разобрать `signature` как `<base64 hmac>.<base64 JSON>` (split по первой точке).
2. Посчитать `HMAC-SHA256` от **строки JSON до парсинга** секретом приложения Yandex Games
   и сравнить с первой частью в base64. Сравнивать константным по времени сравнением.
3. Проверить `issuedAt` из payload на свежесть. Это единственная доступная защита от replay:
   nonce привязать нельзя, а сама подпись не истекает.
4. Сопоставить профиль из payload со своей OIDC-идентичностью и вернуть JSON `Session`
   с полем `sessionId` (клиент читает его в `loginInternal` и кладёт в storage).

Ответ, не проходящий `isSession()` (нет поля `id`), трактуется клиентом как ipban.

### Известные шероховатости (учитывать при правках)

* `handleXhrError` в `src/utils/index.ts` содержит захардкоженные строки («Chess-Online Arena is unreachable»)
  вне i18n.
* `Session` всё ещё несёт legacy-поля lichess: `confirmEmail()`, `SignupData`/`EmailConfirm`, `setKidMode()` —
  логина по паролю нет, но типы и вызовы остались.
* `appconfig.yandex.json` указывает на настоящие `lichess.org`/`socket.lichess.org`, а не на бэкенд проекта —
  проверяй, какой конфиг собираешь.
* У `getPlayer` лимит **20 вызовов за 5 минут**. `loginInternal()` запрашивает подпись при каждом входе,
  а гонка на старте плюс реконнекты сокета могут этот лимит подъедать.

## Соглашения

Из `CONTRIBUTING.md` и `.kilocode/rules/arena-yandex.md`:

* Только TypeScript, `strict`, `noUnusedLocals`/`noUnusedParameters` включены.
* Вью — hyperscript `h`, не JSX.
* Перерисовка — `~/utils/redraw`.
* Комментарии писать по-русски; эталонная локаль — `ru` (`translation/`, `www/i18n/`).
* Стили — Stylus, всё подключается через `src/styl/index.styl`.
* Форматирование в `src/session.ts`, `src/http.ts`, `src/storage.ts` отличается от остального кода
  (4 пробела, точки с запятой) — это следы рефакторинга ветки `yandex`, а не общий стиль. Кавычки там
  уже приведены к одинарным автофиксом линтера.
