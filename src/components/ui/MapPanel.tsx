import { lazy, Suspense, Component, type ReactNode, type ComponentProps } from 'react';
import { Loading } from './States';
const TrainMap = lazy(() => import('../map/TrainMap'));
class MapBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="empty-state"><h3>The map could not load</h3><p>Schedules are still available. Reload the page to try the map again.</p></div> : this.props.children; }
}
export default function MapPanel(props: ComponentProps<typeof TrainMap>) {
  return <MapBoundary><Suspense fallback={<div style={{ height: props.height ?? '400px' }}><Loading label="Opening the railway map…" /></div>}><TrainMap {...props} /></Suspense></MapBoundary>;
}
