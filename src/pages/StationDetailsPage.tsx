import { useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, MapPin, RefreshCw, ArrowUpRight } from 'lucide-react';
import { fetchStations, fetchStationTimetable } from '../services/api';
import type { Station, TimeTableRow } from '../types/apiTypes';
import StationTimetable from '../components/stations/StationTimetable';
import MapPanel from '../components/ui/MapPanel';
import { EmptyState, ErrorBanner, Loading } from '../components/ui/States';
import { useResource } from '../hooks/useResource';
import { useFavoriteStore } from '../stores/favoriteStore';
import { formatTime } from '../utils/formatters';
const initial = { station: null as Station | null, stations: [] as Station[], rows: [] as TimeTableRow[], warning: '' };
export default function StationDetailsPage() {
  const { stationCode = '' } = useParams(); const store = useFavoriteStore();
  const fetcher = useCallback(async (signal: AbortSignal) => {
    const [stations, rows] = await Promise.allSettled([fetchStations(true), fetchStationTimetable(stationCode, signal)]);
    if (stations.status === 'rejected') throw stations.reason;
    return { station: stations.value.find(station => station.stationShortCode === stationCode) ?? null, stations: stations.value, rows: rows.status === 'fulfilled' ? rows.value : [], warning: rows.status === 'rejected' ? 'The departure board is unavailable. Please try again.' : '' };
  }, [stationCode]);
  const { data, loading, refreshing, error, refresh, updatedAt } = useResource(fetcher, initial, 60000);
  const center = useMemo<[number, number]>(() => [data.station?.latitude ?? 60.17, data.station?.longitude ?? 24.94], [data.station?.latitude, data.station?.longitude]);
  if (loading) return <Loading label="Arriving at your station…" />;
  if (error && !updatedAt) return <><ErrorBanner message={error} retry={refresh} /><EmptyState title="Station data unavailable" description="We couldn’t reach the station service. Please try again." /></>;
  if (!data.station) return <EmptyState title="Station not found" description={`We couldn’t find a station with the code ${stationCode}. Search the station directory to find your stop.`} />;
  const station = data.station; const saved = store.isFavoriteStation(stationCode);
  return <div className="page-enter"><Link to="/stations" className="back-link"><ArrowLeft size={16} />All stations</Link><div className="page-heading heading-with-action"><div><div className="eyebrow">YOUR NEXT STOP <span className="code-pill">{stationCode}</span></div><h1>{station.stationName}<span className="heading-dot">.</span></h1><p>Live arrivals, departures and minutes until each service reaches this station.</p></div><button className={`button ${saved ? 'saved' : 'primary'}`} aria-pressed={saved} onClick={() => saved ? store.removeFavoriteStation(stationCode) : store.addFavoriteStation(stationCode)}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Station saved' : 'Save station'}</button></div>{error && <ErrorBanner message={error} retry={refresh} />}{data.warning && <ErrorBanner message={data.warning} retry={refresh} />}<div className="details-grid"><section className="panel"><div className="panel-heading"><div><div className="eyebrow">THE NEXT THREE HOURS</div><h2>Your departure board</h2></div><button className="icon-button" aria-label="Refresh departure board" disabled={refreshing} onClick={refresh}><RefreshCw size={18} className={refreshing ? 'spin' : ''} /></button></div><StationTimetable stationCode={stationCode} timetableRows={data.rows} loading={false} stations={data.stations} /><div className="panel-caption">{updatedAt ? `Updated ${formatTime(updatedAt)} · Refreshes every minute` : 'Awaiting live information'} · Finland time</div></section><aside><section className="panel station-location"><div className="panel-heading"><div><div className="eyebrow">ON THE MAP</div><h2>Find your bearings</h2></div><MapPin size={19} /></div><MapPanel stations={[station]} centerOn={center} height="290px" /><div className="station-facts"><div><span>Station code</span><strong>{stationCode}</strong></div><div><span>Coordinates</span><strong>{station.latitude.toFixed(3)}° N<br />{station.longitude.toFixed(3)}° E</strong></div></div><a href={`https://www.openstreetmap.org/?mlat=${station.latitude}&mlon=${station.longitude}#map=16/${station.latitude}/${station.longitude}`} className="all-stations" target="_blank" rel="noreferrer">Open in OpenStreetMap <ArrowUpRight size={16} /></a></section><div className="travel-note"><h3>A small travel note</h3><p>{!station.passengerTraffic && 'This is an operational railway location, not a passenger boarding station. '}Track assignments and times can change. Check the station display before boarding.</p></div></aside></div></div>;
}
