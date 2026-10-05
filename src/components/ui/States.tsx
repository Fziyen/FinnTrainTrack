import { AlertCircle, ArrowRight, Loader2, TrainFront } from 'lucide-react';
import { Link } from 'react-router-dom';
export function Loading({ label = 'Getting the latest train data…' }: { label?: string }) {
  return <div className="loading-state" role="status"><Loader2 className="spin" size={22} /><span>{label}</span></div>;
}
export function ErrorBanner({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-banner" role="alert"><AlertCircle size={19} /><span>{message}</span>{retry && <button onClick={retry}>Try again <ArrowRight size={14} /></button>}</div>;
}
export function EmptyState({ title, description, action = true }: { title: string; description: string; action?: boolean }) {
  return <div className="empty-state"><div className="empty-icon"><TrainFront size={28} /></div><h2>{title}</h2><p>{description}</p>{action && <Link className="button primary" to="/">Explore the network <ArrowRight size={16} /></Link>}</div>;
}
export function Status({ label, tone = 'neutral' }: { label: string; tone?: string }) {
  return <span className={`status ${tone}`}><span />{label}</span>;
}
