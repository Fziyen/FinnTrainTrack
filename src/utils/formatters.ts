import type { Station, TimeTableRow, Train } from '../types/apiTypes';
import { expectedTime, routeRows } from './trainServices';
const zone = 'Europe/Helsinki';
export const formatTime = (value?: string | Date) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit' }).format(new Date(value));
};
export const formatDate = (value?: string | Date) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { timeZone: zone, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
};
export const formatDateTime = (value?: string) => `${formatDate(value)} · ${formatTime(value)}`;
export const todayInFinland = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
export const formatDuration = (minutes: number) => `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}h ` : ''}${minutes % 60}m`;
export const calculateDelay = (scheduled?: string, actual?: string) => {
  if (!scheduled || !actual) return 0;
  const difference = new Date(actual).getTime() - new Date(scheduled).getTime();
  return Number.isFinite(difference) ? Math.round(difference / 60000) : 0;
};
export const rowDelay = (row?: TimeTableRow) => row ? row.differenceInMinutes ?? calculateDelay(row.scheduledTime, row.actualTime ?? row.liveEstimateTime) : 0;
export const trainLabel = (train: Pick<Train, 'trainNumber' | 'trainType' | 'commuterLineID'>) => `${train.commuterLineID || train.trainType} ${train.trainNumber}`;
export const formatTrainName = (type?: string, number?: number) => `${type || 'Train'} ${number ?? ''}`.trim();
export const stationName = (code?: string, stations: Station[] = []) => stations.find(station => station.stationShortCode === code)?.stationName ?? code ?? 'Unknown station';
export const passengerRows = routeRows;
export const endpoints = (train: Train) => {
  const rows = passengerRows(train);
  return { origin: rows.find(row => row.type === 'DEPARTURE'), destination: [...rows].reverse().find(row => row.type === 'ARRIVAL') };
};
export const currentRow = (train: Train, now = Date.now()) => {
  const rows = passengerRows(train);
  return rows.find(row => !row.actualTime && !row.cancelled && new Date(expectedTime(row) ?? '').getTime() >= now) ?? [...rows].reverse().find(row => row.actualTime) ?? rows[0];
};
export const trainDelay = (train: Train) => rowDelay(currentRow(train));
export const trainStatus = (train: Train) => {
  if (train.cancelled) return { label: 'Cancelled', tone: 'red' };
  const row = currentRow(train);
  if (!row || (row.differenceInMinutes == null && !row.actualTime && !row.liveEstimateTime)) return { label: 'Scheduled', tone: 'neutral' };
  const delay = rowDelay(row);
  return delay > 0 ? { label: `+${delay} min`, tone: 'amber' } : { label: delay < 0 ? `${delay} min` : 'On time', tone: 'green' };
};
export const parseFavoriteId = (id: string) => {
  const match = /^(\d+)-(\d{4}-\d{2}-\d{2})$/.exec(id);
  return match ? { trainNumber: match[1], departureDate: match[2] } : null;
};
