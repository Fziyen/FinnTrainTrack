const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

// Compile the existing TypeScript modules for Node's test runner.
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: filename,
    });
    module._compile(result.outputText, filename);
  };
}
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(global, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { MemoryRouter, Routes, Route } = require('react-router-dom');
const formatters = require('../src/utils/formatters.ts');
const api = require('../src/services/api.ts');
const services = require('../src/utils/trainServices.ts');
const { cartoTileUrl } = require('../src/config/maps.ts');
const { useFavoriteStore } = require('../src/stores/favoriteStore.ts');
const station = { stationShortCode: 'HKI', stationName: 'Helsinki', stationUICCode: 1, passengerTraffic: true, countryCode: 'FI', latitude: 60.17, longitude: 24.94, type: 'STATION' };
const secondStation = { ...station, stationShortCode: 'TPE', stationName: 'Tampere' };
const train = { trainNumber: 23, departureDate: '2026-10-05', trainType: 'IC', trainCategory: 'Long-distance', operatorShortCode: 'vr', runningCurrently: true, cancelled: false, timeTableRows: [
  { stationShortCode: 'HKI', type: 'DEPARTURE', scheduledTime: '2026-10-05T07:00:00Z', actualTime: '2026-10-05T07:05:00Z', differenceInMinutes: 5, commercialStop: true },
  { stationShortCode: 'TPE', type: 'ARRIVAL', scheduledTime: '2026-10-05T09:00:00Z', liveEstimateTime: '2026-10-05T09:00:00Z', differenceInMinutes: 0, commercialStop: true },
] };
let root;
beforeEach(() => { useFavoriteStore.setState({ favoriteTrain: [], favoriteStations: [] }); });
afterEach(async () => { if (root) { await act(async () => root.unmount()); root = null; } mock.restoreAll(); });
async function render(element, entry = '/') {
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: [entry], future: { v7_startTransition: true, v7_relativeSplatPath: true } }, element)));
}
async function settle(duration = 15) { await act(async () => { await new Promise(resolve => setTimeout(resolve, duration)); }); }
async function click(element) { assert.ok(element, 'The interactive element must exist'); await act(async () => element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); }
async function input(element, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}
const element = component => React.createElement(component);

test('CARTO raster tiles use the key parameter and encode configuration values safely', () => {
  assert.equal(cartoTileUrl('test&key'), 'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=test%26key');
  assert.equal(cartoTileUrl('   '), 'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png');
});

test('dates retain the Finnish departure day, including around UTC midnight', () => {
  assert.deepEqual(formatters.parseFavoriteId('23-2026-10-05'), { trainNumber: '23', departureDate: '2026-10-05' });
  assert.equal(formatters.parseFavoriteId('23-2026'), null);
  assert.equal(formatters.todayInFinland(new Date('2026-10-04T22:30:00Z')), '2026-10-05');
  assert.equal(formatters.formatTime('2026-10-04T22:30:00Z'), '01:30');
  assert.equal(formatters.formatTime('invalid'), '—');
});

test('GeoJSON GPS coordinates are normalized and only the newest point per journey is kept', () => {
  const raw = { trainNumber: 23, departureDate: '2026-10-05', speed: 120, timestamp: '2026-10-05T07:00:00Z', location: { type: 'Point', coordinates: [24.94, 60.17] } };
  const locations = api.normalizeLocations([raw, { ...raw, timestamp: '2026-10-05T07:01:00Z' }, { ...raw, trainNumber: 24, location: { type: 'Point', coordinates: [Infinity, 60] } }]);
  assert.equal(locations.length, 1);
  assert.deepEqual(locations[0].location, { longitude: 24.94, latitude: 60.17 });
  assert.equal(locations[0].timestamp, '2026-10-05T07:01:00Z');
  assert.equal(locations[0].speed, 120);
});

test('current service status uses the next timing update rather than its worst historical delay', () => {
  const now = Date.now;
  Date.now = () => new Date('2026-10-05T08:00:00Z').getTime();
  try {
    assert.equal(formatters.trainDelay(train), 0);
    assert.deepEqual(formatters.trainStatus(train), { label: 'On time', tone: 'green' });
    assert.equal(formatters.trainStatus({ ...train, cancelled: true }).label, 'Cancelled');
    assert.equal(formatters.trainStatus({ ...train, timeTableRows: [{ ...train.timeTableRows[1], differenceInMinutes: undefined, liveEstimateTime: undefined }] }).label, 'Scheduled');
  } finally { Date.now = now; }
});

test('favorites stay unique and remain removable', () => {
  const store = useFavoriteStore.getState();
  store.addFavoriteTrain('23-2026-10-05'); store.addFavoriteTrain('23-2026-10-05');
  store.addFavoriteStation('HKI'); store.addFavoriteStation('HKI');
  assert.deepEqual(useFavoriteStore.getState().favoriteTrain, ['23-2026-10-05']);
  assert.deepEqual(useFavoriteStore.getState().favoriteStations, ['HKI']);
  store.removeFavoriteTrain('23-2026-10-05'); store.removeFavoriteStation('HKI');
  assert.equal(useFavoriteStore.getState().favoriteTrain.length, 0);
  assert.equal(useFavoriteStore.getState().favoriteStations.length, 0);
});

test('the live API includes running passenger and freight services without preflight headers', async () => {
  const fetch = mock.method(global, 'fetch', async () => ({ ok: true, json: async () => [train, { ...train, runningCurrently: false }, { ...train, trainCategory: 'Cargo' }, { ...train, cancelled: true }] }));
  assert.equal((await api.fetchRunningTrains()).length, 2);
  assert.deepEqual(fetch.mock.calls[0].arguments[1].headers, { Accept: 'application/json' });
});

test('station timetable links preserve dates and request upcoming trains while excluding passenger pass-throughs', async () => {
  const fetch = mock.method(global, 'fetch', async () => ({ ok: true, json: async () => [{ ...train, timeTableRows: [...train.timeTableRows, { ...train.timeTableRows[0], commercialStop: false }] }] }));
  const rows = await api.fetchStationTimetable('HKI');
  assert.equal(rows.length, 1); assert.equal(rows[0].departureDate, '2026-10-05'); assert.equal(rows[0].destination, 'TPE');
  const query = new URL(fetch.mock.calls[0].arguments[0]).searchParams;
  assert.equal(query.get('minutes_before_arrival'), '180'); assert.equal(query.get('minutes_after_arrival'), '5');
  assert.equal(query.get('minutes_before_departure'), '180'); assert.equal(query.get('minutes_after_departure'), '5');
  assert.equal(query.get('include_nonstopping'), 'true');
  assert.equal(rows[0].operatorShortCode, 'vr');
});

test('numeric Enter search opens the nearest journey instead of silently submitting', async () => {
  const SearchBox = require('../src/components/ui/SearchBox.tsx').default;
  await render(React.createElement(Routes, null,
    React.createElement(Route, { path: '/', element: element(SearchBox) }),
    React.createElement(Route, { path: '/train/23/latest', element: React.createElement('p', null, 'Correct train journey') }),
  ));
  await input(document.querySelector('input'), 'IC 23');
  assert.equal(document.querySelector('input').getAttribute('aria-expanded'), 'true');
  await act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
  assert.match(document.body.textContent, /Correct train journey/);
});

test('station search supports keyboard selection and navigates to the chosen result', async () => {
  mock.method(api, 'searchStations', async () => [station, secondStation]);
  const SearchBox = require('../src/components/ui/SearchBox.tsx').default;
  await render(React.createElement(Routes, null,
    React.createElement(Route, { path: '/', element: element(SearchBox) }),
    React.createElement(Route, { path: '/station/TPE', element: React.createElement('p', null, 'Tampere board') }),
  ));
  await input(document.querySelector('input'), 'station'); await settle(220);
  for (let i = 0; i < 2; i++) await act(async () => document.querySelector('input').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));
  assert.equal(document.querySelectorAll('[role="option"]')[1].getAttribute('aria-selected'), 'true');
  await act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
  assert.match(document.body.textContent, /Tampere board/);
});

test('a failed station search displays an error and a stale search cannot replace newer results', async () => {
  let completeOld;
  mock.method(api, 'searchStations', query => query === 'old' ? new Promise(resolve => { completeOld = resolve; }) : query === 'bad' ? Promise.reject(new Error('offline')) : Promise.resolve([secondStation]));
  const SearchBox = require('../src/components/ui/SearchBox.tsx').default;
  await render(element(SearchBox)); await input(document.querySelector('input'), 'old'); await settle(220);
  await input(document.querySelector('input'), 'new'); await settle(220);
  await act(async () => completeOld([station]));
  assert.match(document.querySelector('[role="listbox"]').textContent, /Tampere/);
  assert.doesNotMatch(document.querySelector('[role="listbox"]').textContent, /Helsinki/);
  await input(document.querySelector('input'), 'bad'); await settle(220);
  assert.match(document.body.textContent, /Station search is unavailable/);
});

test('saved journey loading passes the complete date and allows removing a missing journey', async () => {
  useFavoriteStore.getState().addFavoriteTrain('23-2026-10-05');
  mock.method(api, 'fetchStations', async () => [station, secondStation]);
  const fetchTrain = mock.method(api, 'fetchTrainByNumber', async () => null);
  const Favorites = require('../src/pages/FavoritesPage.tsx').default;
  await render(element(Favorites)); await settle();
  assert.deepEqual(fetchTrain.mock.calls[0].arguments.slice(0, 2), ['23', '2026-10-05']);
  const button = [...document.querySelectorAll('button')].find(button => button.textContent === 'Remove saved journey');
  await click(button); await settle();
  assert.equal(useFavoriteStore.getState().favoriteTrain.length, 0);
  assert.match(document.body.textContent, /Your next journey belongs here/);
});

test('background refresh keeps the current data visible until its replacement arrives', async () => {
  const { useResource } = require('../src/hooks/useResource.ts');
  let sequence = 0; let finish;
  const fetcher = async () => sequence++ === 0 ? 'First update' : new Promise(resolve => { finish = resolve; });
  function Probe() { const resource = useResource(fetcher, 'Loading'); return React.createElement('div', null, resource.data, React.createElement('button', { onClick: resource.refresh }, 'Refresh')); }
  await render(element(Probe)); await settle();
  assert.match(document.body.textContent, /First update/);
  await click(document.querySelector('button'));
  assert.match(document.body.textContent, /First update/);
  await act(async () => finish('Next update')); assert.match(document.body.textContent, /Next update/);
});

test('older background responses cannot overwrite a newer refresh', async () => {
  const { useResource } = require('../src/hooks/useResource.ts');
  const pending = []; let calls = 0;
  const fetcher = async () => calls++ === 0 ? 'Original' : new Promise(resolve => pending.push(resolve));
  function Probe() { const resource = useResource(fetcher, 'Loading'); return React.createElement('div', null, resource.data, React.createElement('button', { onClick: resource.refresh }, 'Refresh')); }
  await render(element(Probe)); await settle();
  await click(document.querySelector('button')); await click(document.querySelector('button'));
  await act(async () => pending[1]('Newest'));
  await act(async () => pending[0]('Outdated'));
  assert.match(document.body.textContent, /Newest/); assert.doesNotMatch(document.body.textContent, /Outdated/);
});

test('the real Leaflet map mounts markers, preserves speed units, and removes itself cleanly', async () => {
  Object.defineProperty(global, 'L', { configurable: true, get: () => window.L });
  global.ResizeObserver = class { observe() {} disconnect() {} };
  dom.window.SVGSVGElement.prototype.createSVGRect = () => ({});
  Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 800 });
  Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 380 });
  const TrainMap = require('../src/components/map/TrainMap.tsx').default;
  await render(React.createElement(TrainMap, { stations: [station], trainLocations: [{ trainNumber: 23, departureDate: '2026-10-05', speed: 120, timestamp: '2026-10-05T07:00:00Z', location: { latitude: 60.17, longitude: 24.94 } }], centerOn: [60.17, 24.94] }));
  assert.ok(document.querySelector('.leaflet-container'));
  assert.equal(document.querySelector('.train-marker').textContent, '23');
  await click(document.querySelector('.train-marker'));
  assert.match(document.querySelector('.leaflet-popup-content').textContent, /120 km\/h/);
  assert.equal(document.querySelector('.map-popup a').getAttribute('href'), '/train/23/2026-10-05');
  await act(async () => root.unmount()); root = null;
  assert.equal(document.querySelector('.leaflet-container'), null);
});

test('overview category filters and bookmark controls work with live service data', async () => {
  mock.method(api, 'fetchRunningTrains', async () => [train, { ...train, trainNumber: 51, trainCategory: 'Commuter', commuterLineID: 'R' }]);
  mock.method(api, 'fetchStations', async () => [station, secondStation]);
  mock.method(api, 'fetchLatestTrainLocations', async () => []);
  const Home = require('../src/pages/HomePage.tsx').default;
  await render(element(Home)); await settle();
  assert.equal(document.querySelectorAll('.train-table tbody tr').length, 2);
  const commuterTab = [...document.querySelectorAll('button')].find(button => button.textContent === 'Commuter');
  await click(commuterTab);
  assert.equal(document.querySelectorAll('.train-table tbody tr').length, 1);
  assert.match(document.querySelector('.train-table tbody').textContent, /R 51/);
  await click(document.querySelector('button[aria-label="Save R 51"]'));
  assert.deepEqual(useFavoriteStore.getState().favoriteTrain, ['51-2026-10-05']);
  assert.equal(document.querySelector('button[aria-label="Unsave R 51"]').getAttribute('aria-pressed'), 'true');
  await input(document.querySelector('input[aria-label="Filter live trains"]'), 'NoSuchStation');
  assert.match(document.querySelector('.live-services').textContent, /No matching live services/);
});

test('train detail errors offer a retry instead of reporting a missing journey', async () => {
  mock.method(api, 'fetchTrainByNumber', async () => { throw new Error('Timetable connection unavailable'); });
  const Details = require('../src/pages/TrainDetailsPage.tsx').default;
  await render(React.createElement(Routes, null, React.createElement(Route, { path: '/train/:trainNumber/:departureDate', element: element(Details) })), '/train/23/2026-10-05');
  await settle();
  assert.match(document.querySelector('[role="alert"]').textContent, /Timetable connection unavailable/);
  assert.match(document.body.textContent, /Train data unavailable/);
  assert.doesNotMatch(document.body.textContent, /No journey found/);
});

test('station boards default to arrival countdowns and switch to departures', async () => {
  const scheduled = new Date(Date.now() + 600000).toISOString();
  const row = { ...train.timeTableRows[0], scheduledTime: scheduled, actualTime: undefined, differenceInMinutes: 0, trainNumber: 23, departureDate: '2026-10-05', trainType: 'IC', destination: 'TPE' };
  mock.method(api, 'fetchStations', async () => [station, secondStation]);
  mock.method(api, 'fetchStationTimetable', async () => [row, { ...row, type: 'ARRIVAL' }]);
  const Details = require('../src/pages/StationDetailsPage.tsx').default;
  await render(React.createElement(Routes, null, React.createElement(Route, { path: '/station/:stationCode', element: element(Details) })), '/station/HKI');
  await settle();
  assert.equal(document.querySelector('.data-table a').getAttribute('href'), '/train/23/2026-10-05');
  const arrivals = [...document.querySelectorAll('button')].find(button => button.textContent === 'Arrivals');
  assert.equal(arrivals.getAttribute('aria-pressed'), 'true');
  assert.match(document.querySelector('.countdown').textContent, /10 min/);
  const departures = [...document.querySelectorAll('button')].find(button => button.textContent === 'Departures'); await click(departures);
  assert.equal(departures.getAttribute('aria-pressed'), 'true');
  assert.equal(document.querySelectorAll('.data-table tbody tr').length, 1);
  await click([...document.querySelectorAll('button')].find(button => button.textContent === 'Save station'));
  assert.deepEqual(useFavoriteStore.getState().favoriteStations, ['HKI']);
});

test('HSL lines are distinct from VR passenger trains even though both use operator vr', () => {
  for (const line of ['A', 'E', 'I', 'K', 'L', 'P', 'U', 'Y', ' p ']) {
    assert.equal(services.serviceGroup({ ...train, trainCategory: 'Commuter', commuterLineID: line }), 'hsl');
  }
  for (const line of ['D', 'G', 'H', 'M', 'O', 'R', 'T', 'Z']) {
    assert.equal(services.serviceGroup({ ...train, trainCategory: 'Commuter', commuterLineID: line }), 'vr');
  }
  assert.equal(services.serviceGroup(train), 'vr');
  for (const category of ['Cargo', 'Locomotive', 'Shunting', 'On-track machines', 'Test drive']) {
    assert.equal(services.serviceGroup({ ...train, trainCategory: category }), 'industrial');
  }
  assert.equal(services.serviceGroup({ ...train, operatorShortCode: 'another' }), 'other');
});

test('arrival countdowns prefer estimates, account for reported delays, and distinguish recorded or stale events', () => {
  const now = Date.parse('2026-10-05T23:58:00Z');
  const row = { stationShortCode: 'TPE', type: 'ARRIVAL', scheduledTime: '2026-10-06T00:00:00Z' };
  assert.deepEqual(services.stationCountdown(row, now), { label: '2 min', detail: 'Scheduled arrival', kind: 'scheduled' });
  assert.equal(services.stationCountdown({ ...row, differenceInMinutes: 5 }, now).label, '7 min');
  assert.equal(services.expectedTime({ ...row, differenceInMinutes: 5 }), '2026-10-06T00:05:00.000Z');
  const estimate = { ...row, differenceInMinutes: 20, liveEstimateTime: '2026-10-06T00:02:30Z' };
  assert.equal(services.stationCountdown(estimate, now).label, '5 min');
  assert.equal(services.stationCountdown(estimate, now).kind, 'estimated');
  assert.equal(services.stationCountdown(row, Date.parse('2026-10-05T23:59:30Z')).label, 'Due');
  assert.equal(services.stationCountdown(row, Date.parse('2026-10-06T00:02:00Z')).label, 'Awaiting update');
  assert.equal(services.stationCountdown({ ...row, actualTime: row.scheduledTime }, now).label, 'Arrived');
  assert.equal(services.stationCountdown({ ...row, type: 'DEPARTURE', actualTime: row.scheduledTime }, now).label, 'Departed');
  assert.equal(services.stationCountdown({ ...row, trainStopping: false, actualTime: row.scheduledTime }, now).label, 'Passed');
  assert.equal(services.stationCountdown({ ...row, cancelled: true }, now).label, 'Cancelled');
  assert.equal(services.stationCountdown(row, now, true).label, 'Cancelled');
  assert.equal(services.stationCountdown({ ...row, scheduledTime: 'invalid' }, now).kind, 'unknown');
  assert.equal(services.stationCountdown(undefined, now).kind, 'unknown');
});

test('next arrival skips completed route points and passenger pass-throughs but retains freight points', () => {
  const now = Date.parse('2026-10-05T08:00:00Z');
  const rows = [
    { ...train.timeTableRows[1], stationShortCode: 'OLD', scheduledTime: '2026-10-05T06:00:00Z' },
    { ...train.timeTableRows[0], stationShortCode: 'PASSED', commercialStop: false },
    { ...train.timeTableRows[1], stationShortCode: 'YARD', trainStopping: false, commercialStop: false },
    { ...train.timeTableRows[1], stationShortCode: 'TPE' },
  ];
  const passenger = { ...train, timeTableRows: rows };
  assert.equal(services.nextArrival(passenger, '', now).stationShortCode, 'TPE');
  assert.equal(services.nextArrival(passenger, 'OLD', now), undefined);
  assert.equal(services.nextArrival(passenger, 'YARD', now), undefined);
  const freight = { ...passenger, trainCategory: 'Cargo' };
  assert.equal(services.nextArrival(freight, '', now).stationShortCode, 'YARD');
  assert.equal(services.nextArrival(freight, 'TPE', now).stationShortCode, 'TPE');
  assert.equal(services.nextArrival({ ...freight, cancelled: true }, '', now), undefined);
  assert.equal(services.nextArrival({ ...passenger, timeTableRows: [rows[3], { ...rows[3], stationShortCode: 'HKI', cancelled: true }] }, 'HKI', now), undefined);
});

test('operational station names remain cached and searchable while passenger selection stays available', async () => {
  const yard = { ...station, stationShortCode: 'KVLA', stationName: 'Kouvola yard', passengerTraffic: false };
  const fetch = mock.method(global, 'fetch', async () => ({ ok: true, json: async () => [station, yard, { ...station, countryCode: 'SE' }] }));
  const [all, passengers] = await Promise.all([api.fetchStations(true), api.fetchStations()]);
  assert.equal(all.length, 2); assert.deepEqual(passengers, [station]);
  assert.equal(fetch.mock.callCount(), 1);
  assert.deepEqual(await api.searchStations('KVLA'), [yard]);
});

test('station timetables keep industrial pass-throughs and their service classification', async () => {
  const row = { ...train.timeTableRows[1], stationShortCode: 'KVLA', commercialStop: false, trainStopping: false };
  mock.method(global, 'fetch', async () => ({ ok: true, json: async () => [{ ...train, trainCategory: 'Cargo', timeTableRows: [row] }] }));
  const rows = await api.fetchStationTimetable('KVLA');
  assert.equal(rows.length, 1);
  assert.equal(services.serviceGroup(rows[0]), 'industrial');
  assert.equal(services.stationCountdown(rows[0], Date.parse('2026-10-05T08:50:00Z')).detail, 'Estimated pass-through');
});

test('overview service and station filters select VR, HSL and freight arrivals', async () => {
  const arrival = { ...train.timeTableRows[1], scheduledTime: new Date(Date.now() + 600000).toISOString(), liveEstimateTime: undefined };
  const trains = [
    { ...train, timeTableRows: [arrival] },
    { ...train, trainNumber: 51, trainCategory: 'Commuter', commuterLineID: 'P', timeTableRows: [{ ...arrival, stationShortCode: 'HKI' }] },
    { ...train, trainNumber: 9001, trainCategory: 'Cargo', trainType: 'T', timeTableRows: [{ ...arrival, trainStopping: false, commercialStop: false }] },
  ];
  mock.method(api, 'fetchRunningTrains', async () => trains);
  mock.method(api, 'fetchStations', async () => [station, secondStation]);
  mock.method(api, 'fetchLatestTrainLocations', async () => []);
  const Home = require('../src/pages/HomePage.tsx').default;
  await render(element(Home)); await settle();
  const filter = label => [...document.querySelectorAll('.network-controls .service-filter')].find(button => button.textContent.includes(label));
  assert.equal(document.querySelectorAll('.train-table tbody tr').length, 3);
  await click(filter('HSL commuter'));
  assert.match(document.querySelector('.train-table tbody').textContent, /P 51/);
  assert.equal(document.querySelectorAll('.train-table tbody tr').length, 1);
  await click(filter('VR passenger'));
  assert.match(document.querySelector('.train-table tbody').textContent, /IC 23/);
  await click(filter('Freight & work'));
  assert.match(document.querySelector('.train-table tbody').textContent, /9001/);
  assert.match(document.querySelector('.countdown').textContent, /10 minEstimated pass-through/);
  await click(filter('All trains'));
  await act(async () => { const select = document.querySelector('select[aria-label="Countdown station"]'); select.value = 'TPE'; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
  assert.equal(document.querySelectorAll('.train-table tbody tr').length, 2);
  assert.doesNotMatch(document.querySelector('.train-table tbody').textContent, /P 51/);
});

test('station service filters count journeys once and show freight pass-through countdowns', async () => {
  const StationTimetable = require('../src/components/stations/StationTimetable.tsx').default;
  const scheduled = new Date(Date.now() + 600000).toISOString();
  const row = { ...train.timeTableRows[1], scheduledTime: scheduled, liveEstimateTime: undefined, stationShortCode: 'HKI', trainNumber: 23, departureDate: train.departureDate, trainCategory: 'Long-distance', operatorShortCode: 'vr', trainType: 'IC' };
  const rows = [row, { ...row, type: 'DEPARTURE' }, { ...row, trainNumber: 51, commuterLineID: 'I', trainCategory: 'Commuter' }, { ...row, trainNumber: 9001, trainCategory: 'Cargo', trainStopping: false }];
  await render(React.createElement(StationTimetable, { stationCode: 'HKI', timetableRows: rows, loading: false, stations: [station] }));
  const all = document.querySelector('.service-filter'); assert.match(all.textContent, /All trains3/);
  await click([...document.querySelectorAll('.service-filter')].find(button => button.textContent.includes('Freight & work')));
  assert.equal(document.querySelectorAll('tbody tr').length, 1);
  assert.match(document.querySelector('tbody').textContent, /Estimated pass-through/);
  assert.match(document.querySelector('tbody').textContent, /Pass-through/);
});

test('countdowns advance without waiting for a timetable network refresh', async () => {
  const { useNow } = require('../src/hooks/useNow.ts');
  const Countdown = require('../src/components/ui/Countdown.tsx').default;
  let now = Date.parse('2026-10-05T08:00:00Z'); let tick;
  mock.method(Date, 'now', () => now);
  mock.method(global, 'setInterval', callback => { tick = callback; return 123; });
  mock.method(global, 'clearInterval', () => {});
  const hidden = Object.getOwnPropertyDescriptor(document, 'hidden');
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  function Probe() { return React.createElement(Countdown, { row: { ...train.timeTableRows[1], scheduledTime: '2026-10-05T08:02:00Z', liveEstimateTime: undefined }, now: useNow() }); }
  try {
    await render(element(Probe)); assert.match(document.body.textContent, /2 min/);
    now += 60000; await act(async () => tick()); assert.match(document.body.textContent, /1 min/);
    now += 45000; await act(async () => tick()); assert.match(document.body.textContent, /Due/);
  } finally { if (hidden) Object.defineProperty(document, 'hidden', hidden); else delete document.hidden; }
});

test('map markers and popups distinguish all three service groups and show minutes until arrival', async () => {
  const TrainMap = require('../src/components/map/TrainMap.tsx').default;
  const arrival = { ...train.timeTableRows[1], scheduledTime: new Date(Date.now() + 600000).toISOString(), liveEstimateTime: undefined };
  const trains = [
    { ...train, timeTableRows: [arrival] },
    { ...train, trainNumber: 51, trainCategory: 'Commuter', commuterLineID: 'I', timeTableRows: [arrival] },
    { ...train, trainNumber: 9001, trainCategory: 'Cargo', trainType: 'T', timeTableRows: [{ ...arrival, trainStopping: false }] },
  ];
  const locations = trains.map((train, index) => ({ trainNumber: train.trainNumber, departureDate: train.departureDate, speed: 120, timestamp: new Date().toISOString(), location: { latitude: 60 + index * 3, longitude: 25 } }));
  await render(React.createElement(TrainMap, { services: trains, trainLocations: locations, stations: [secondStation] }));
  assert.ok(document.querySelector('.train-marker.vr'));
  assert.ok(document.querySelector('.train-marker.industrial'));
  assert.equal(document.querySelector('.train-marker.hsl').textContent, 'I');
  await click(document.querySelector('.train-marker.hsl'));
  assert.match(document.querySelector('.map-popup').textContent, /HSL commuter/);
  assert.match(document.querySelector('.popup-countdown').textContent, /10 min · Tampere/);
  assert.equal(document.querySelector('.map-popup a').getAttribute('href'), '/train/51/2026-10-05');
});

test('station directory keeps passenger stations as default and can include rail yards', async () => {
  const yard = { ...station, stationShortCode: 'KVLA', stationName: 'Kouvola yard', passengerTraffic: false };
  mock.method(api, 'fetchStations', async () => [station, yard]);
  const Stations = require('../src/pages/StationsPage.tsx').default;
  await render(element(Stations)); await settle();
  assert.equal(document.querySelectorAll('.station-card').length, 1);
  await click([...document.querySelectorAll('button')].find(button => button.textContent === 'All rail points'));
  assert.equal(document.querySelectorAll('.station-card').length, 2);
  assert.match(document.querySelector('a[href="/station/KVLA"]').textContent, /Rail operating point/);
});

test('saved trains can be filtered by service group and retain arrival countdowns', async () => {
  useFavoriteStore.setState({ favoriteTrain: ['23-2026-10-05', '51-2026-10-05'] });
  const arrival = { ...train.timeTableRows[1], scheduledTime: new Date(Date.now() + 600000).toISOString(), liveEstimateTime: undefined };
  mock.method(api, 'fetchStations', async () => [station, secondStation]);
  mock.method(api, 'fetchTrainByNumber', async number => ({ ...train, trainNumber: Number(number), timeTableRows: [arrival], trainCategory: number === '51' ? 'Commuter' : 'Long-distance', commuterLineID: number === '51' ? 'P' : undefined }));
  const Favorites = require('../src/pages/FavoritesPage.tsx').default;
  await render(element(Favorites)); await settle();
  assert.equal(document.querySelectorAll('.train-card').length, 2);
  await click([...document.querySelectorAll('.service-filter')].find(button => button.textContent.includes('HSL commuter')));
  assert.equal(document.querySelectorAll('.train-card').length, 1);
  assert.match(document.querySelector('.train-card').textContent, /P 51/);
  assert.match(document.querySelector('.countdown').textContent, /10 min/);
});
