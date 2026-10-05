import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { TrainLocation, Station, TimeTableRow, Train } from '../../types/apiTypes';
import { formatTime, stationName, trainLabel } from '../../utils/formatters';
import { cartoTileUrl } from '../../config/maps';
import { nextArrival, serviceGroup, serviceLabels, stationCountdown } from '../../utils/trainServices';
const empty: never[] = [];
interface Props { services?: Train[]; stationCode?: string; trainLocations?: TrainLocation[]; stations?: Station[]; timeTableRows?: TimeTableRow[]; centerOn?: 'finland' | 'train' | [number, number]; height?: string }
export default function TrainMap({ services = empty, stationCode = '', trainLocations = empty, stations = empty, timeTableRows = empty, centerOn = 'finland', height = '400px' }: Props) {
  const container = useRef<HTMLDivElement>(null); const map = useRef<L.Map | null>(null); const trains = useRef<L.MarkerClusterGroup | null>(null); const stationLayer = useRef<L.LayerGroup | null>(null); const framed = useRef('');
  const [tilesFailed, setTilesFailed] = useState(false); const navigate = useNavigate();
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { center: [63.1, 25.6], zoom: 5, scrollWheelZoom: false, zoomControl: false });
    L.control.zoom({ position: 'topright' }).addTo(instance);
    const tiles = L.tileLayer(cartoTileUrl(), { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>', subdomains: 'abcd', maxZoom: 19 }).addTo(instance);
    tiles.on('tileerror', () => setTilesFailed(true)); tiles.on('tileload', () => setTilesFailed(false));
    trains.current = L.markerClusterGroup({ maxClusterRadius: 35, showCoverageOnHover: false, iconCreateFunction: cluster => L.divIcon({ html: `<span>${cluster.getChildCount()}</span>`, className: 'train-cluster', iconSize: [34, 34] }) }).addTo(instance);
    stationLayer.current = L.layerGroup().addTo(instance); map.current = instance; framed.current = '';
    const observer = new ResizeObserver(() => instance.invalidateSize()); observer.observe(container.current);
    return () => { observer.disconnect(); tiles.off(); instance.remove(); map.current = null; trains.current = null; stationLayer.current = null; };
  }, []);
  useEffect(() => {
    if (!trains.current) return;
    trains.current.clearLayers();
    const countdowns: (() => void)[] = [];
    const markers = trainLocations.map(location => {
      const train = services.find(train => train.trainNumber === location.trainNumber && train.departureDate === location.departureDate);
      const group = train ? serviceGroup(train) : 'other';
      const markerLabel = document.createElement('span'); markerLabel.textContent = train && group === 'hsl' ? train.commuterLineID! : String(location.trainNumber);
      const marker = L.marker([location.location.latitude, location.location.longitude], { icon: L.divIcon({ html: markerLabel, className: `train-marker ${group}`, iconSize: [36, 25], iconAnchor: [18, 12] }) });
      const popup = document.createElement('div'); popup.className = 'map-popup';
      const title = document.createElement('strong'); title.textContent = train ? trainLabel(train) : `Train ${location.trainNumber}`;
      const badge = document.createElement('span'); badge.className = `service-badge ${group}`; badge.textContent = serviceLabels[group];
      const arrival = document.createElement('p'); arrival.className = 'popup-countdown';
      if (train) { const update = () => { const row = nextArrival(train, stationCode); const countdown = stationCountdown(row); arrival.textContent = row ? `${countdown.label} · ${stationName(row.stationShortCode, stations)} (${countdown.detail.toLowerCase()})` : 'No upcoming arrival available'; }; update(); countdowns.push(update); }
      const speed = document.createElement('p'); speed.textContent = `${Math.round(location.speed)} km/h · GPS ${formatTime(location.timestamp)}`;
      const link = document.createElement('a'); link.textContent = 'View journey →'; link.href = `/train/${location.trainNumber}/${location.departureDate}`;
      link.onclick = event => { event.preventDefault(); navigate(link.getAttribute('href')!); };
      popup.append(title, badge, speed, arrival, link); marker.bindPopup(popup); return marker;
    });
    trains.current.addLayers(markers);
    const timer = setInterval(() => { if (!document.hidden) countdowns.forEach(update => update()); }, 15000);
    return () => clearInterval(timer);
  }, [trainLocations, navigate, services, stationCode, stations]);
  useEffect(() => {
    if (!stationLayer.current) return;
    stationLayer.current.clearLayers();
    stations.forEach(station => {
      if (!Number.isFinite(station.latitude) || !Number.isFinite(station.longitude)) return;
      const marker = L.circleMarker([station.latitude, station.longitude], { radius: stations.length === 1 ? 8 : 3, color: '#4a756d', fillColor: '#fff', fillOpacity: 1, weight: 1.5 });
      const popup = document.createElement('div'); popup.className = 'map-popup'; const title = document.createElement('strong'); title.textContent = station.stationName;
      const link = document.createElement('a'); link.textContent = 'Open arrivals & departures →'; link.href = `/station/${station.stationShortCode}`; link.onclick = event => { event.preventDefault(); navigate(link.getAttribute('href')!); };
      popup.append(title, link); marker.bindPopup(popup); stationLayer.current!.addLayer(marker);
    });
  }, [stations, navigate]);
  const centerKey = Array.isArray(centerOn) ? centerOn.join(',') : centerOn;
  useEffect(() => {
    const instance = map.current; if (!instance) return;
    const coords: L.LatLngExpression[] = timeTableRows.filter((row, index, rows) => index === 0 || row.stationShortCode !== rows[index - 1].stationShortCode).flatMap(row => { const station = stations.find(station => station.stationShortCode === row.stationShortCode); return station ? [[station.latitude, station.longitude] as L.LatLngExpression] : []; });
    const line = coords.length > 1 ? L.polyline(coords, { color: '#257064', weight: 3, opacity: 0.6, dashArray: '5, 7' }).addTo(instance) : null;
    if (framed.current !== centerKey) {
      if (centerKey.includes(',')) { const [lat, lng] = centerKey.split(',').map(Number); instance.setView([lat, lng], 13); framed.current = centerKey; }
      else if (centerKey === 'train' && coords.length > 1) { instance.fitBounds(L.latLngBounds(coords), { padding: [30, 30], maxZoom: 10 }); framed.current = centerKey; }
      else if (centerKey === 'train' && trainLocations[0]) { const position = trainLocations[0].location; instance.setView([position.latitude, position.longitude], 9); framed.current = centerKey; }
      else if (centerKey === 'finland') { instance.setView([63.1, 25.6], 5); framed.current = centerKey; }
    }
    return () => { if (line) instance.removeLayer(line); };
  }, [centerKey, timeTableRows, stations, trainLocations]);
  return <div className="leaflet-frame"><div ref={container} style={{ height, width: '100%' }} aria-label="Interactive map of Finnish trains and stations" />{tilesFailed && <div className="map-tile-error" role="status">Map tiles are unavailable. Try again when connected.</div>}</div>;
}
