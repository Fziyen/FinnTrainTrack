import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { TrainFront, LayoutDashboard, Map, MapPin, Bookmark, ArrowUpRight, Info, Menu, X, Clock3 } from 'lucide-react';
import { formatTime } from '../../utils/formatters';
import { useFavoriteStore } from '../../stores/favoriteStore';
const links = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/map', label: 'Live map', icon: Map },
  { to: '/stations', label: 'Stations', icon: MapPin },
  { to: '/favorites', label: 'Saved journeys', icon: Bookmark },
];
export default function Header() {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const location = useLocation();
  const count = useFavoriteStore(state => state.favoriteTrain.length + state.favoriteStations.length);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { const search = document.getElementById('network-search'); if (search) { event.preventDefault(); search.focus(); } }
    };
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key);
  }, []);
  const title = location.pathname === '/map' ? 'Live map' : location.pathname.startsWith('/station') ? 'Stations' : location.pathname.startsWith('/train') ? 'Train details' : location.pathname === '/favorites' ? 'Saved journeys' : location.pathname === '/about' ? 'About the platform' : 'Network overview';
  return <>
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <Link className="brand" to="/" aria-label="FinnTrack home"><span className="brand-mark"><TrainFront size={24} strokeWidth={1.8} /></span><span>Finn<span className="brand-light">Track</span><small>FINLAND, IN MOTION</small></span></Link>
      <div className="nav-label">YOUR NETWORK</div>
      <nav aria-label="Main navigation" id="main-navigation">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={19} /><span>{label}</span>{to === '/favorites' && count > 0 && <span className="nav-count">{count}</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><span className="small-orbit"><TrainFront size={20} /></span><h3>A little closer to<br />your next stop.</h3><p>Follow the journeys that matter to you.</p><Link to="/favorites">Your saved journeys <ArrowUpRight size={16} /></Link></div>
      <NavLink to="/about" className="nav-item"><Info size={18} /><span>About FinnTrack</span></NavLink><div className="sidebar-country"><span>🇫🇮</span> Made for Finland <span className="country-line" /></div></div>
    </aside>
    {open && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <header className="topbar"><div className="topbar-left"><button className="icon-button menu-button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}>{open ? <X size={21} /> : <Menu size={21} />}</button><span className="breadcrumb">Workspace <span>/</span> <strong>{title}</strong></span></div><div className="topbar-right"><span className="helsinki-clock"><Clock3 size={15} />{formatTime(now)}<span>Helsinki</span></span><span className="topbar-divider" /><Link to="/about" className="network-label"><span className="live-dot" />Open rail data</Link></div></header>
  </>;
}
