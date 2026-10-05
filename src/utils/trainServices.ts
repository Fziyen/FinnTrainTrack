import type { Train, TimeTableRow } from '../types/apiTypes';

export type ServiceGroup = 'all' | 'vr' | 'hsl' | 'industrial' | 'other';
export type ServiceIdentity = Pick<Train, 'trainCategory' | 'operatorShortCode' | 'commuterLineID'>;

// HSL commissions these lines, even though Digitraffic lists VR as the operator.
// Sources: HSL's 2026–27 service plan and VR's commuter-network documentation.
const hslLines = new Set(['A', 'E', 'I', 'K', 'L', 'P', 'U', 'Y']);
const industrialCategories = new Set(['Cargo', 'Locomotive', 'Shunting', 'On-track machines', 'Test drive']);
export const isPassengerService = (service: Pick<Train, 'trainCategory'>) => ['Long-distance', 'Commuter'].includes(service.trainCategory);
export const serviceGroup = (service: Partial<ServiceIdentity>): Exclude<ServiceGroup, 'all'> => {
  if (industrialCategories.has(service.trainCategory ?? '')) return 'industrial';
  if (service.trainCategory === 'Commuter' && hslLines.has(service.commuterLineID?.trim().toUpperCase() ?? '')) return 'hsl';
  if (isPassengerService({ trainCategory: service.trainCategory ?? '' }) && service.operatorShortCode?.toLowerCase() === 'vr') return 'vr';
  return 'other';
};
export const serviceLabels: Record<ServiceGroup, string> = {
  all: 'All trains', vr: 'VR passenger', hsl: 'HSL commuter', industrial: 'Freight & work', other: 'Other services',
};
export const serviceDescription = (service: ServiceIdentity) => {
  const group = serviceGroup(service);
  if (group === 'hsl') return `HSL commuter · Line ${service.commuterLineID}`;
  if (group === 'vr') return service.trainCategory === 'Commuter' ? 'VR commuter' : 'VR long-distance';
  return group === 'industrial' ? `${service.trainCategory} · Not a passenger service` : service.trainCategory;
};
export const routeRows = (train: Train) => isPassengerService(train)
  ? train.timeTableRows.filter(row => row.commercialStop !== false && row.trainStopping !== false)
  : train.timeTableRows;

export function expectedTime(row?: TimeTableRow): string | undefined {
  if (!row) return undefined;
  if (row.actualTime) return row.actualTime;
  if (row.liveEstimateTime) return row.liveEstimateTime;
  const scheduled = new Date(row.scheduledTime).getTime();
  if (!Number.isFinite(scheduled)) return undefined;
  return new Date(scheduled + (Number.isFinite(row.differenceInMinutes) ? row.differenceInMinutes! * 60000 : 0)).toISOString();
}

export function nextArrival(train: Train, stationCode = '', now = Date.now()): TimeTableRow | undefined {
  if (train.cancelled) return undefined;
  const rows = train.timeTableRows;
  // A later recorded event also rules out earlier, unrecorded arrivals.
  const lastRecorded = rows.reduce((latest, row, index) => row.actualTime && new Date(row.actualTime).getTime() <= now ? index : latest, -1);
  return rows.find((row, index) => index > lastRecorded && row.type === 'ARRIVAL' && !row.actualTime && !row.cancelled && (!stationCode || row.stationShortCode === stationCode) && (!isPassengerService(train) || (row.trainStopping !== false && row.commercialStop !== false)));
}

export function stationCountdown(row?: TimeTableRow, now = Date.now(), cancelled = false) {
  const event = row?.trainStopping === false ? 'pass-through' : row?.type === 'DEPARTURE' ? 'departure' : 'arrival';
  if (cancelled || row?.cancelled) return { label: 'Cancelled', detail: 'No countdown available', kind: 'cancelled' };
  if (!row) return { label: '—', detail: 'No upcoming arrival', kind: 'unknown' };
  if (row.actualTime) return { label: event === 'departure' ? 'Departed' : event === 'pass-through' ? 'Passed' : 'Arrived', detail: 'Recorded time', kind: 'recorded' };
  const expected = expectedTime(row);
  const difference = expected ? new Date(expected).getTime() - now : NaN;
  if (!Number.isFinite(difference)) return { label: '—', detail: 'Time unavailable', kind: 'unknown' };
  if (difference < -60000) return { label: 'Awaiting update', detail: `Expected ${event} time has passed`, kind: 'overdue' };
  const estimated = !!row.liveEstimateTime || row.differenceInMinutes != null;
  return {
    label: difference < 60000 ? 'Due' : `${Math.ceil(difference / 60000)} min`,
    detail: `${estimated ? 'Estimated' : 'Scheduled'} ${event}`,
    kind: estimated ? 'estimated' : 'scheduled',
  };
}
