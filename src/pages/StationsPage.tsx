import { useCallback, useState } from 'react';
import { Search } from 'lucide-react';
import StationCard from '../components/stations/StationCard';
import { Loading, EmptyState, ErrorBanner } from '../components/ui/States';
import { fetchStations } from '../services/api';
import { useResource } from '../hooks/useResource';
import type { Station } from '../types/apiTypes';
export default function StationsPage() {
  const [query, setQuery] = useState(''); const [includeOperational, setIncludeOperational] = useState(false); const fetcher = useCallback(() => fetchStations(true), []);
  const { data, loading, error, refresh } = useResource(fetcher, [] as Station[]);
  const stations = data.filter(station => (includeOperational || station.passengerTraffic) && `${station.stationName} ${station.stationShortCode}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="page-enter"><div className="page-heading"><div className="eyebrow">FIND YOUR NEXT STOP</div><h1>A station for every journey.</h1><p>Explore passenger stations and rail operating points. Open a board for live arrivals, departures and minutes until the next train.</p></div><div className="tabs page-tabs" aria-label="Station type"><button className={!includeOperational ? 'active' : ''} aria-pressed={!includeOperational} onClick={() => setIncludeOperational(false)}>Passenger stations</button><button className={includeOperational ? 'active' : ''} aria-pressed={includeOperational} onClick={() => setIncludeOperational(true)}>All rail points</button></div><div className="directory-toolbar"><label className="directory-search"><Search size={20} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a station by name or code" aria-label="Filter stations" /></label><span>{stations.length} stations</span></div>{error && <ErrorBanner message={error} retry={refresh} />}{loading ? <Loading label="Finding Finland’s stations…" /> : stations.length ? <div className="station-grid">{stations.map(station => <StationCard key={station.stationShortCode} station={station} />)}</div> : <EmptyState title={error ? 'Stations unavailable' : 'No matching stations'} description={error ? 'Please retry when the data service is available.' : 'Try another name or a station code such as HKI.'} action={false} />}</div>;
}
