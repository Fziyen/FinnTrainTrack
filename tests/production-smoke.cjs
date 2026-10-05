const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const base = path.resolve(__dirname, '../dist');
const future = new Date(Date.now() + 600000).toISOString();
const arrival = new Date(Date.now() + 3600000).toISOString();
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki' }).format(new Date());
const stations = [
  { stationShortCode: 'HKI', stationName: 'Helsinki', countryCode: 'FI', latitude: 60.17, longitude: 24.94, passengerTraffic: true },
  { stationShortCode: 'TPE', stationName: 'Tampere', countryCode: 'FI', latitude: 61.49, longitude: 23.77, passengerTraffic: true },
];
const train = { trainNumber: 23, departureDate: date, trainType: 'IC', trainCategory: 'Long-distance', operatorShortCode: 'vr', runningCurrently: true, cancelled: false, timeTableRows: [
  { stationShortCode: 'HKI', type: 'DEPARTURE', scheduledTime: future, differenceInMinutes: 0, commercialStop: true },
  { stationShortCode: 'TPE', type: 'ARRIVAL', scheduledTime: arrival, differenceInMinutes: 0, commercialStop: true },
] };
const trains = [train,
  { ...train, trainNumber: 51, trainCategory: 'Commuter', commuterLineID: 'P', timeTableRows: [{ ...train.timeTableRows[1], stationShortCode: 'HKI', scheduledTime: future }] },
  { ...train, trainNumber: 9001, trainCategory: 'Cargo', trainType: 'T', timeTableRows: [{ ...train.timeTableRows[1], trainStopping: false, commercialStop: false }] },
];
const gps = trains.map((service, index) => ({ trainNumber: service.trainNumber, departureDate: date, speed: 120, timestamp: new Date().toISOString(), location: { type: 'Point', coordinates: [24.94, 60.17 + index * 3] } }));
class LocalAssets extends ResourceLoader {
  fetch(url) {
    const file = path.resolve(base, '.' + new URL(url).pathname);
    return file.startsWith(base + path.sep) && fs.existsSync(file) ? Promise.resolve(fs.readFileSync(file)) : null;
  }
}
const failures = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', error => failures.push(error.message));
virtualConsole.on('error', (...args) => failures.push(args.join(' ')));
const dom = new JSDOM(fs.readFileSync(path.join(base, 'index.html'), 'utf8'), {
  url: 'http://localhost/', runScripts: 'dangerously', resources: new LocalAssets(), pretendToBeVisual: true, virtualConsole,
  beforeParse(window) {
    window.scrollTo = () => {};
    window.ResizeObserver = class { observe() {} disconnect() {} };
    window.SVGSVGElement.prototype.createSVGRect = () => ({});
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', { get: () => 800 });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', { get: () => 380 });
    window.fetch = async url => {
      const endpoint = new URL(url).pathname;
      const data = endpoint.includes('metadata/stations') ? stations : endpoint.includes('train-locations') ? gps : endpoint.startsWith('/api/v1/trains/') ? [train] : trains;
      return { ok: true, status: 200, json: async () => data };
    };
  },
});
const document = dom.window.document;
async function waitFor(predicate, label) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  throw new Error(`Production view did not render: ${label}. ${failures.join('\n')}`);
}
function click(element) { assert.ok(element); element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); }
(async () => {
  try {
    await waitFor(() => document.querySelector('.train-table tbody tr') && document.querySelector('.train-marker'), 'overview and map');
    assert.match(document.querySelector('h1').textContent, /Every journey/);
    assert.equal(document.querySelector('.train-marker.vr').textContent, '23');
    assert.equal(document.querySelectorAll('.train-table tbody tr').length, 3);
    click([...document.querySelectorAll('.network-controls .service-filter')].find(button => button.textContent.includes('HSL commuter')));
    await waitFor(() => document.querySelectorAll('.train-table tbody tr').length === 1 && document.querySelector('.train-marker.hsl'), 'HSL service filter');
    assert.equal(document.querySelectorAll('.train-marker').length, 1);
    assert.equal(document.querySelector('.train-marker.hsl').textContent, 'P');
    assert.match(document.querySelector('.train-table tbody').textContent, /HSL commuter/);
    assert.match(document.querySelector('.countdown').textContent, /min/);
    click([...document.querySelectorAll('.network-controls .service-filter')].find(button => button.textContent.includes('Freight & work')));
    await waitFor(() => document.querySelector('.train-marker.industrial'), 'freight filter');
    assert.match(document.querySelector('.train-table tbody').textContent, /Pass-through/);
    click([...document.querySelectorAll('.network-controls .service-filter')].find(button => button.textContent.includes('All trains')));
    await waitFor(() => document.querySelectorAll('.train-table tbody tr').length === 3, 'all services filter');
    assert.equal(document.querySelectorAll('.stat-card').length, 4);
    assert.match(document.querySelector('style').textContent, /leaflet/);
    click(document.querySelector('button[aria-label="Save IC 23"]'));
    await waitFor(() => document.querySelector('button[aria-label="Unsave IC 23"]'), 'saved bookmark');
    const saved = JSON.parse(dom.window.localStorage.getItem('favorites-storage'));
    assert.deepEqual(saved.state.favoriteTrain, [`23-${date}`]);
    click(document.querySelector('a[href="/station/HKI"]'));
    await waitFor(() => document.querySelector('.timetable-tabs'), 'station arrival board');
    assert.equal(document.querySelector('h1').textContent, 'Helsinki.');
    assert.match(document.querySelector('.countdown').textContent, /min/);
    click([...document.querySelectorAll('button')].find(button => button.textContent === 'Departures'));
    await waitFor(() => document.querySelector('.data-table .train-cell'), 'station departure link');
    assert.equal(document.querySelector('.data-table .train-cell').getAttribute('href'), `/train/23/${date}`);
    click(document.querySelector('.data-table .train-cell'));
    await waitFor(() => document.querySelector('.journey-summary'), 'train detail');
    assert.equal(document.querySelector('h1').textContent, 'IC 23.');
    assert.match(document.querySelector('.route-table').textContent, /Arrives in/);
    click([...document.querySelectorAll('button')].find(button => button.textContent === 'Map'));
    await waitFor(() => document.querySelector('.leaflet-container'), 'train route map');
    click(document.querySelector('a[href="/about"]'));
    await waitFor(() => document.querySelector('.about-hero'), 'about page');
    assert.deepEqual(failures, [], 'No production runtime errors');
    console.log('Production bundle passed: VR/HSL/freight filters, colored map markers, arrival countdowns, saved storage, station board, train details, route map, and lazy navigation.');
  } finally { dom.window.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
