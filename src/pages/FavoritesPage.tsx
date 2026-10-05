import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, MapPin, RefreshCw, TrainFront } from 'lucide-react';
import { useFavoriteStore } from '../stores/favoriteStore';
import { fetchTrainByNumber, fetchStations } from '../services/api';
import type { Train, Station } from '../types/apiTypes';
import { parseFavoriteId } from '../utils/formatters';
import TrainCard from '../components/trains/TrainCard';
import StationCard from '../components/stations/StationCard';
import { useResource } from '../hooks/useResource';
import { EmptyState, ErrorBanner, Loading } from '../components/ui/States';
import { ServiceFilter } from '../components/ui/ServiceFilter';
import { serviceGroup, type ServiceGroup } from '../utils/trainServices';
const initial = { trains: [] as Train[], stations: [] as Station[], unavailable: [] as string[], warning: '' };
export default function FavoritesPage() {
  const { favoriteTrain, favoriteStations, removeFavoriteTrain } = useFavoriteStore();
  const [service, setService] = useState<ServiceGroup>('all');
  const [tab, setTab] = useState<'trains' | 'stations'>(favoriteTrain.length || !favoriteStations.length ? 'trains' : 'stations');
  const fetcher = useCallback(async (signal: AbortSignal) => {
    const [stationResult, ...results] = await Promise.allSettled([favoriteTrain.length || favoriteStations.length ? fetchStations(true) : Promise.resolve([] as Station[]), ...favoriteTrain.map(id => { const favorite = parseFavoriteId(id); return favorite ? fetchTrainByNumber(favorite.trainNumber, favorite.departureDate, signal) : Promise.resolve(null); })]);
    const stations = stationResult.status === 'fulfilled' ? stationResult.value as Station[] : [];
    const trains: Train[] = []; const unavailable: string[] = [];
    results.forEach((result, index) => { if (result.status === 'fulfilled' && result.value) trains.push(result.value as Train); else unavailable.push(favoriteTrain[index]); });
    return { trains, stations, unavailable, warning: [stationResult.status === 'rejected' ? 'Station data could not load. Retry to update your saved stations.' : '', results.some(result => result.status === 'rejected') ? 'Some saved journeys could not be refreshed. Please try again.' : ''].filter(Boolean).join(' ') };
  }, [favoriteTrain, favoriteStations]);
  const { data, loading, refreshing, refresh, error } = useResource(fetcher, initial, 60000);
  const hasFavorites = favoriteTrain.length + favoriteStations.length > 0;
  return <div className="page-enter"><div className="page-heading heading-with-action"><div><div className="eyebrow">A LITTLE MORE PERSONAL</div><h1>Your journeys. Kept close.</h1><p>Your regular stops and memorable journeys, saved on this device.</p></div><button className="button" onClick={refresh} disabled={refreshing}><RefreshCw size={16} className={refreshing ? 'spin' : ''} />Refresh</button></div>{(error || data.warning) && <ErrorBanner message={error ?? data.warning} retry={refresh} />}{!hasFavorites ? <div className="panel"><EmptyState title="Your next journey belongs here" description="Tap the bookmark on a train or station to save it. Your favorites will be waiting here next time." /></div> : <><div className="tabs page-tabs"><button className={tab === 'trains' ? 'active' : ''} aria-pressed={tab === 'trains'} onClick={() => setTab('trains')}><TrainFront size={17} />Trains <span>{favoriteTrain.length}</span></button><button className={tab === 'stations' ? 'active' : ''} aria-pressed={tab === 'stations'} onClick={() => setTab('stations')}><MapPin size={17} />Stations <span>{favoriteStations.length}</span></button></div>{loading ? <Loading label="Opening your saved journeys…" /> : tab === 'trains' ? <><ServiceFilter value={service} onChange={setService} services={data.trains} /><div className="train-grid">{data.trains.filter(train => service === 'all' || serviceGroup(train) === service).map(train => <TrainCard key={`${train.trainNumber}-${train.departureDate}`} train={train} stations={data.stations} />)}</div>{service !== 'all' && !data.trains.some(train => serviceGroup(train) === service) && <EmptyState title="No saved trains in this group" description="Choose another filter or save a matching live service." action={false} />}{data.unavailable.map(id => <article className="unavailable-favorite panel" key={id}><Bookmark size={20} /><div><strong>Train {parseFavoriteId(id)?.trainNumber ?? id}</strong><p>This saved journey is unavailable. It may be outside the timetable history.</p></div><button className="button small" onClick={() => removeFavoriteTrain(id)}>Remove saved journey</button></article>)}{!favoriteTrain.length && <EmptyState title="No trains saved yet" description="Bookmark a live service to keep its journey here." />}</> : <><div className="station-grid">{data.stations.filter(station => favoriteStations.includes(station.stationShortCode)).map(station => <StationCard station={station} key={station.stationShortCode} />)}</div>{favoriteStations.filter(code => !data.stations.some(station => station.stationShortCode === code)).map(code => <div className="panel unavailable-favorite" key={code}><MapPin size={20} /><Link to={`/station/${code}`}>Saved station {code}</Link><p>Station details are currently unavailable.</p></div>)}{!favoriteStations.length && <EmptyState title="Find your regular stop" description="Save a station for quick access to its departure board." />}</>}</>}<div className="saved-note"><Bookmark size={15} /><span>Saved locally. No account needed.</span><Link to="/stations">Explore stations <ArrowRight size={14} /></Link></div></div>;
}
