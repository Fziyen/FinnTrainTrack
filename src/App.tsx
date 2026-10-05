import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import { Loading } from './components/ui/States';
const Home = lazy(() => import('./pages/HomePage'));
const Stations = lazy(() => import('./pages/StationsPage'));
const Train = lazy(() => import('./pages/TrainDetailsPage'));
const Station = lazy(() => import('./pages/StationDetailsPage'));
const Favorites = lazy(() => import('./pages/FavoritesPage'));
const About = lazy(() => import('./pages/AboutPage'));
const NotFound = lazy(() => import('./pages/NotFoundPage'));
export default function App() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return <div className="app-shell"><a href="#main-content" className="skip-link">Skip to content</a><Header /><div className="workspace"><main id="main-content" className="main-content" tabIndex={-1}><Suspense fallback={<Loading label="Opening your view…" />}><Routes>
    <Route path="/" element={<Home />} /><Route path="/map" element={<Home mapOnly />} />
    <Route path="/stations" element={<Stations />} /><Route path="/train/:trainNumber/:departureDate" element={<Train />} />
    <Route path="/station/:stationCode" element={<Station />} /><Route path="/favorites" element={<Favorites />} />
    <Route path="/about" element={<About />} /><Route path="*" element={<NotFound />} />
  </Routes></Suspense></main><Footer /></div></div>;
}
