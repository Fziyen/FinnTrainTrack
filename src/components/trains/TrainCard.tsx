import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, TrainFront } from 'lucide-react';
import type { Train, Station } from '../../types/apiTypes';
import { endpoints, formatTime, stationName, trainLabel, trainStatus } from '../../utils/formatters';
import { useFavoriteStore } from '../../stores/favoriteStore';
import { Status } from '../ui/States';
import { ServiceBadge } from '../ui/ServiceFilter';
import { nextArrival, serviceDescription, serviceGroup } from '../../utils/trainServices';
import Countdown from '../ui/Countdown';
import { useNow } from '../../hooks/useNow';
export default function TrainCard({ train, stations = [] }: { train: Train; stations?: Station[]; compact?: boolean }) {
  const store = useFavoriteStore(); const now = useNow(); const id = `${train.trainNumber}-${train.departureDate}`; const saved = store.isFavoriteTrain(id);
  const { origin, destination } = endpoints(train); const status = trainStatus(train);
  return <article className="train-card"><div className="train-card-heading"><Link to={`/train/${train.trainNumber}/${train.departureDate}`}><span className={`train-type ${serviceGroup(train)}`}><TrainFront size={18} /></span><span><strong>{trainLabel(train)}</strong><small>{serviceDescription(train)}</small></span></Link><button className={`icon-button bookmark ${saved ? 'saved' : ''}`} aria-label={`${saved ? 'Unsave' : 'Save'} ${trainLabel(train)}`} aria-pressed={saved} onClick={() => saved ? store.removeFavoriteTrain(id) : store.addFavoriteTrain(id)}><Bookmark size={19} fill={saved ? 'currentColor' : 'none'} /></button></div><Link className="train-card-route" to={`/train/${train.trainNumber}/${train.departureDate}`}><span><strong>{stationName(origin?.stationShortCode, stations)}</strong><small>{formatTime(origin?.scheduledTime)}</small></span><ArrowRight size={19} /><span><strong>{stationName(destination?.stationShortCode, stations)}</strong><small>{formatTime(destination?.scheduledTime)}</small></span></Link><div className="card-arrival"><ServiceBadge service={train} /><span><small>Next: {stationName(nextArrival(train, '', now)?.stationShortCode, stations)}</small><Countdown row={nextArrival(train, '', now)} now={now} cancelled={train.cancelled} /></span></div><div className="train-card-bottom"><Status {...status} /><Link to={`/train/${train.trainNumber}/${train.departureDate}`}>View journey <ArrowRight size={14} /></Link></div></article>;
}
