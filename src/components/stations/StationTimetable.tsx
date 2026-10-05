import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, TrainFront } from 'lucide-react';
import type { Station, TimeTableRow } from '../../types/apiTypes';
import { formatTime, rowDelay, stationName } from '../../utils/formatters';
import { expectedTime, serviceGroup, type ServiceGroup } from '../../utils/trainServices';
import { useNow } from '../../hooks/useNow';
import { ServiceBadge, ServiceFilter } from '../ui/ServiceFilter';
import Countdown from '../ui/Countdown';
import { Loading, EmptyState, Status } from '../ui/States';
export default function StationTimetable({ stationCode, timetableRows, loading, stations = [] }: { stationCode: string; timetableRows: TimeTableRow[]; loading: boolean; stations?: Station[] }) {
  const [tab, setTab] = useState<'DEPARTURE' | 'ARRIVAL'>('ARRIVAL');
  const [service, setService] = useState<ServiceGroup>('all');
  const now = useNow();
  const upcoming = timetableRows.filter(row => row.stationShortCode === stationCode && new Date(expectedTime(row) ?? '').getTime() >= now - 300000 && new Date(expectedTime(row) ?? '').getTime() <= now + 10800000);
  const rows = upcoming.filter(row => row.type === tab && (service === 'all' || serviceGroup(row) === service)).sort((a, b) => (expectedTime(a) ?? '').localeCompare(expectedTime(b) ?? ''));
  // Count each service once even when the board includes both arrival and departure.
  const identities = [...new Map(upcoming.map(row => [`${row.trainNumber}-${row.departureDate}`, row])).values()];
  return <><div className="station-board-controls"><div className="tabs timetable-tabs"><button className={tab === 'ARRIVAL' ? 'active' : ''} aria-pressed={tab === 'ARRIVAL'} onClick={() => setTab('ARRIVAL')}><ArrowDownLeft size={16} />Arrivals</button><button className={tab === 'DEPARTURE' ? 'active' : ''} aria-pressed={tab === 'DEPARTURE'} onClick={() => setTab('DEPARTURE')}><ArrowUpRight size={16} />Departures</button></div><ServiceFilter value={service} onChange={setService} services={identities} /></div>{loading ? <Loading label="Updating the departure board…" /> : !rows.length ? <EmptyState title={`No upcoming ${tab === 'DEPARTURE' ? 'departures' : 'arrivals'}`} description="No matching services are listed within the next three hours. Choose another service filter or check back shortly." action={false} /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>{tab === 'ARRIVAL' ? 'Arrives in' : 'Leaves in'}</th><th>Expected</th><th>Train</th><th>{tab === 'DEPARTURE' ? 'Destination' : 'From'}</th><th>Track</th><th>Status</th></tr></thead><tbody>{rows.map(row => {
    const delay = rowDelay(row); const label = row.cancelled ? 'Cancelled' : row.actualTime ? (row.trainStopping === false ? 'Passed' : tab === 'ARRIVAL' ? 'Arrived' : 'Departed') : delay > 0 ? `+${delay} min` : row.liveEstimateTime || row.differenceInMinutes != null ? 'On time' : 'Scheduled';
    return <tr key={`${row.trainNumber}-${row.departureDate}-${row.scheduledTime}`}><td><Countdown row={row} now={now} /></td><td className="time-cell">{formatTime(expectedTime(row))}{delay !== 0 && <small className="scheduled-time">Scheduled {formatTime(row.scheduledTime)}</small>}</td><td>{row.trainNumber && row.departureDate ? <><Link className="train-cell" to={`/train/${row.trainNumber}/${row.departureDate}`}><TrainFront size={16} /><strong>{row.commuterLineID || row.trainType} {row.trainNumber}</strong></Link><small><ServiceBadge service={row} />{row.trainStopping === false && <span className="passing-label">Pass-through</span>}</small></> : '—'}</td><td>{stationName(row.destination, stations)}</td><td><span className="track-number">{row.commercialTrack || '—'}</span></td><td><Status label={label} tone={row.cancelled ? 'red' : delay > 0 ? 'amber' : label === 'Scheduled' ? 'neutral' : 'green'} /></td></tr>;
  })}</tbody></table></div>}<div className="eta-note">Countdowns use live estimates or reported delays when available; otherwise the scheduled time. Freight pass-throughs are labelled. HSL is a service group, not a ticket-validity guide.</div></>;
}
