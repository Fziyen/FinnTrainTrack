import type { TimeTableRow } from '../../types/apiTypes';
import { stationCountdown } from '../../utils/trainServices';

export default function Countdown({ row, now, cancelled = false }: { row?: TimeTableRow; now: number; cancelled?: boolean }) {
  const countdown = stationCountdown(row, now, cancelled);
  return <span className={`countdown ${countdown.kind}`}><strong>{countdown.label}</strong><small>{countdown.detail}</small></span>;
}
