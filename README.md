# FinnTrack

A responsive React and TypeScript application for following Finland’s rail network, built with webpack.

The overview includes live VR passenger, HSL commuter, and freight & work trains, with matching colors and service filters on the list and map. Select a station to see incoming trains and arrival countdowns. Station boards, train pages, map popups and saved trains also show minutes until arrival. The directory includes passenger stations and an optional view of all rail operating points. Bookmarked journeys and stations stay in local storage.

## Development

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The development server reloads when source files change and supports direct links to application routes.

### Map configuration

Copy `.env.example` to `.env.local` and set `CARTO_BASEMAP_API_KEY` to your CARTO Basemaps key. Webpack reads it at startup; restart the development server or rebuild after changing it. A shell environment variable with the same name takes precedence over `.env.local`.

The local configuration is ignored by Git. This browser basemap key is included in map tile requests and the compiled application, so it is visible to visitors. CARTO's [key dashboard](https://www.carto.com/basemaps/apikey/) supports restrictions for the domains where your map runs. Without a configured key, CARTO may watermark the tiles.

## Production

```sh
npm run build
npm run preview
```

The build type-checks the application and writes the production files to `dist/`. Preview serves that build at http://localhost:4173 with fallback routing for the React application. Production hosting must also serve `index.html` for application routes.

Run `npm run lint` to check the source code and `npm test` for regression tests covering search, saved dates, GPS normalization, live-service filtering, and background refreshes. The test runner requires Node.js 18 or newer.

Run `npm run test:production` to build and check the compiled application, including lazy routes, map markers, departure-board links, and saved journeys. These checks use a simulated DOM; they do not replace browser layout review.

## Live data

Timetables and GPS positions come from [Fintraffic’s Digitraffic railway API](https://www.digitraffic.fi/en/railway-traffic/), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). All times use Europe/Helsinki. Live pages refresh every 30–60 seconds while visible; station metadata is cached for a day. GPS coverage is partial, and route lines connect stations schematically rather than following track geometry.

Network failures show retry controls and retain the latest successful view during background updates. Missing timing estimates are marked as scheduled rather than reported as on time. Use official operator information and station displays for boarding decisions.


## Service groups and arrival countdowns

HSL commuter lines A, E, I, K, L, P, U and Y are classified by line because their operator is also VR. Other passenger services operated by VR belong to the VR group, including VR's own commuter lines. Freight & work includes Cargo, Locomotive, Shunting, On-track machines and Test drive; these are not passenger services. Unknown services remain visible as Other services. This is a service classification, not a ticket-validity guide. Classification sources: [HSL service plan 2026–27](https://www.hsl.fi/en/hsl/planning/transport-service-plan-2026-2027), [VR commuter network](https://www.vr.fi/en/railway-stations-and-routes/commuter-traffic).

Countdowns prefer Digitraffic's live estimate, then the scheduled time adjusted by a reported delay, then the unadjusted scheduled time. They update every 15 seconds while visible, round up to whole minutes, and show Due within one minute. Recorded events show Arrived, Departed or Passed; cancellations show Cancelled. If an expected time passes without a recorded event, the view shows Awaiting update. Countdown estimates come from timetable data, not GPS speed or distance. Selecting a station in the overview filters to remaining arrivals on each route; passenger pass-throughs are excluded, while operational train pass-throughs are labelled.

Station API time windows request three hours ahead and five minutes of recent events. Operational station metadata is retained so freight yards and other rail points have working names, search results and boards.
