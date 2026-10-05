import { Link } from 'react-router-dom';
import { ArrowUpRight, Bookmark, MapPin } from 'lucide-react';
import type { Station } from '../../types/apiTypes';
import { useFavoriteStore } from '../../stores/favoriteStore';
export default function StationCard({ station }: { station: Station; trainCount?: number }) {
  const store = useFavoriteStore(); const saved = store.isFavoriteStation(station.stationShortCode);
  return <article className="station-card"><span className="station-icon"><MapPin size={21} /></span><Link to={`/station/${station.stationShortCode}`}><strong>{station.stationName}</strong><small>{station.stationShortCode} · {station.passengerTraffic ? 'Arrivals & departures' : 'Rail operating point'}</small></Link><button className={`icon-button bookmark ${saved ? 'saved' : ''}`} aria-label={`${saved ? 'Unsave' : 'Save'} ${station.stationName}`} aria-pressed={saved} onClick={() => saved ? store.removeFavoriteStation(station.stationShortCode) : store.addFavoriteStation(station.stationShortCode)}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /></button><Link to={`/station/${station.stationShortCode}`} className="station-arrow" aria-label={`Open ${station.stationName}`}><ArrowUpRight size={17} /></Link></article>;
}
