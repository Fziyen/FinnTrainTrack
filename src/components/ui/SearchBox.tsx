import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, MapPin, Search, TrainFront, X } from 'lucide-react';
import { searchStations } from '../../services/api';
import type { Station } from '../../types/apiTypes';
interface Props { placeholder?: string; className?: string }
export default function SearchBox({ placeholder = 'Where are you heading? Station or train number', className = '' }: Props) {
  const [query, setQuery] = useState(''); const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Station[]>([]); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); const [selected, setSelected] = useState(-1);
  const root = useRef<HTMLDivElement>(null); const navigate = useNavigate(); const id = useId();
  const trainNumber = /^(?:[a-z]{1,3}\s*)?(\d{1,5})$/i.exec(query.trim())?.[1];
  useEffect(() => {
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', outside); return () => document.removeEventListener('mousedown', outside);
  }, []);
  useEffect(() => {
    let cancelled = false; setSelected(-1); setError(''); setResults([]);
    if (!query.trim() || trainNumber) { setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(() => { searchStations(query).then(data => { if (!cancelled) setResults(data.slice(0, 7)); }).catch(() => { if (!cancelled) setError('Station search is unavailable. Please try again.'); }).finally(() => { if (!cancelled) setLoading(false); }); }, 180);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, trainNumber]);
  const choose = (index: number) => {
    if (trainNumber) navigate(`/train/${Number(trainNumber)}/latest`);
    else if (results[index]) navigate(`/station/${results[index].stationShortCode}`);
    else return;
    setOpen(false); setQuery('');
  };
  const count = trainNumber ? 1 : results.length;
  return <div className={`search-box ${className}`} ref={root}><form onSubmit={event => { event.preventDefault(); choose(Math.max(0, selected)); }}>
    <Search size={20} /><input id="network-search" value={query} role="combobox" aria-label="Search stations or trains" aria-autocomplete="list" aria-expanded={open && !!query.trim()} aria-controls={id} aria-activedescendant={selected >= 0 ? `${id}-${selected}` : undefined} placeholder={placeholder} autoComplete="off" onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={event => {
      if (event.key === 'Escape') { setOpen(false); setSelected(-1); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setSelected(value => count ? value < 0 ? (event.key === 'ArrowDown' ? 0 : count - 1) : (value + (event.key === 'ArrowDown' ? 1 : -1) + count) % count : -1); }
    }} />{query ? <button type="button" className="icon-button" aria-label="Clear search" onClick={() => { setQuery(''); setOpen(false); document.getElementById('network-search')?.focus(); }}><X size={17} /></button> : <kbd>⌘ K</kbd>}<button type="submit" className="search-submit" aria-label="Find station or train"><ArrowRight size={20} /></button>
  </form>{open && query.trim() && <div className="search-results" id={id} role="listbox" aria-label="Search results">{loading ? <div className="search-message"><Loader2 size={17} className="spin" />Finding your station…</div> : error ? <div className="search-message" role="status">{error}</div> : trainNumber ? <button type="button" role="option" aria-selected={selected === 0} id={`${id}-0`} className={selected === 0 ? 'selected' : ''} onClick={() => choose(0)}><TrainFront size={19} /><span><strong>Train {Number(trainNumber)}</strong><small>Find the nearest scheduled journey</small></span><ArrowRight size={16} /></button> : results.length ? results.map((station, index) => <button type="button" role="option" id={`${id}-${index}`} aria-selected={selected === index} className={selected === index ? 'selected' : ''} key={station.stationShortCode} onClick={() => choose(index)}><MapPin size={19} /><span><strong>{station.stationName}</strong><small>{station.stationShortCode} · {station.passengerTraffic ? 'Passenger station' : 'Rail operating point'}</small></span><ArrowRight size={16} /></button>) : <div className="search-message">No station matches “{query}”. Try its name or station code.</div>}</div>}</div>;
}
