import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, TrainFront } from 'lucide-react';
import type { Train, Station } from '../../types/apiTypes';
import { endpoints, formatTime, stationName, trainLabel, trainStatus } from '../../utils/formatters';
import { useFavoriteStore } from '../../stores/favoriteStore';
import { Loading, EmptyState, Status } from '../ui/States';
import { ServiceBadge } from '../ui/ServiceFilter';
import Countdown from '../ui/Countdown';
import { nextArrival, expectedTime, serviceGroup } from '../../utils/trainServices';
import { useNow } from '../../hooks/useNow';
export default function TrainList({ trains, stations = [], loading, stationCode = '', emptyMessage = 'No matching trains' }: { trains: Train[]; stations?: Station[]; loading: boolean; stationCode?: string; emptyMessage?: string }) {
  const [page, setPage] = useState(1); const store = useFavoriteStore(); const now = useNow();
  const pageCount = Math.max(1, Math.ceil(trains.length / 8)); const currentPage = Math.min(page, pageCount);
  if (loading) return <Loading />;
  if (!trains.length) return <EmptyState title={emptyMessage} description="Try a different filter, or check back for the next services." action={false} />;
  return <><div className="table-scroll"><table className="data-table train-table"><thead><tr><th>Train</th><th>Journey</th><th>{stationCode ? `Arrival at ${stationName(stationCode, stations)}` : 'Next station'}</th><th>Arrives in</th><th>Expected</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{trains.slice((currentPage - 1) * 8, currentPage * 8).map(train => {
    const { origin, destination } = endpoints(train); const next = nextArrival(train, stationCode, now); const id = `${train.trainNumber}-${train.departureDate}`; const saved = store.isFavoriteTrain(id); const path = `/train/${train.trainNumber}/${train.departureDate}`;
    return <tr key={id}><td><Link className="train-cell" to={path}><span className={`train-type ${serviceGroup(train)}`}><TrainFront size={17} /></span><span><strong>{trainLabel(train)}</strong><small><ServiceBadge service={train} /></small></span></Link></td><td><Link className="journey-cell" to={path}><span>{stationName(origin?.stationShortCode, stations)}</span><ArrowRight size={13} /><span>{stationName(destination?.stationShortCode, stations)}</span></Link></td><td>{next ? stationName(next.stationShortCode, stations) : '—'}{next?.trainStopping === false && <small>Pass-through</small>}</td><td><Countdown row={next} now={now} cancelled={train.cancelled} /></td><td className="time-cell">{formatTime(expectedTime(next))}</td><td><Status {...trainStatus(train)} /></td><td><div className="table-actions"><button className={`icon-button bookmark ${saved ? 'saved' : ''}`} aria-label={`${saved ? 'Unsave' : 'Save'} ${trainLabel(train)}`} aria-pressed={saved} onClick={() => saved ? store.removeFavoriteTrain(id) : store.addFavoriteTrain(id)}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /></button><Link to={path} className="icon-button" aria-label={`Open ${trainLabel(train)}`}><ArrowRight size={17} /></Link></div></td></tr>;
  })}</tbody></table></div><div className="table-footer"><span>Showing {(currentPage - 1) * 8 + 1}–{Math.min(currentPage * 8, trains.length)} of {trains.length} trains</span><div><button className="button small" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>{currentPage} / {pageCount}</span><button className="button small" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div></div></>;
}
