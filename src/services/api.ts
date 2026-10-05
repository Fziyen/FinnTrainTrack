import type { Train, TrainLocation, RawTrainLocation, Station, TimeTableRow } from '../types/apiTypes';
import { isPassengerService } from '../utils/trainServices';
const base = 'https://rata.digitraffic.fi/api/v1';
class HttpError extends Error { constructor(public status: number) { super(`Train data service returned ${status}.`); } }
async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    signal?.throwIfAborted();
    const controller = new AbortController();
    const cancel = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', cancel, { once: true });
    const timeout = setTimeout(() => controller.abort(new Error('The data service took too long to respond. Please try again.')), 12000);
    try {
      const response = await fetch(`${base}${path}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new HttpError(response.status);
      return await response.json() as T;
    } catch (error) {
      if (signal?.aborted || attempt === 1 || (error instanceof HttpError && error.status < 500 && error.status !== 429)) throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
    }
  }
  throw new Error('Unable to reach live train data. Please try again.');
}
let stationCache: { data: Station[]; expires: number } | null = null;
let stationRequest: Promise<Station[]> | null = null;
export const fetchStations = async (includeOperational = false): Promise<Station[]> => {
  const select = (data: Station[]) => includeOperational ? data : data.filter(station => station.passengerTraffic);
  if (stationCache && stationCache.expires > Date.now()) return select(stationCache.data);
  if (!stationRequest) stationRequest = request<Station[]>('/metadata/stations').then(data => {
    const stations = data.filter(station => station.countryCode === 'FI').sort((a, b) => a.stationName.localeCompare(b.stationName, 'fi'));
    stationCache = { data: stations, expires: Date.now() + 86400000 };
    return stations;
  }).finally(() => { stationRequest = null; });
  return select(await stationRequest);
};
export const fetchRunningTrains = async (signal?: AbortSignal) => (await request<Train[]>('/live-trains', signal)).filter(train => train.runningCurrently && !train.cancelled);
export const fetchTrainsByDate = (date: string, signal?: AbortSignal) => request<Train[]>(`/trains/${encodeURIComponent(date)}`, signal);
export const fetchTrainByNumber = async (number: string, date: string, signal?: AbortSignal): Promise<Train | null> => {
  try { return (await request<Train[]>(`/trains/${encodeURIComponent(date)}/${encodeURIComponent(number)}`, signal))[0] ?? null; }
  catch (error) { if (error instanceof HttpError && error.status === 404) return null; throw error; }
};
export const normalizeLocations = (data: RawTrainLocation[]): TrainLocation[] => {
  const latest = new Map<string, TrainLocation>();
  for (const row of data) {
    const coordinates = row.location?.coordinates;
    if (!coordinates || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1]) || Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 90) continue;
    const normalized = { ...row, location: { longitude: coordinates[0], latitude: coordinates[1] } };
    const id = `${row.trainNumber}-${row.departureDate}`;
    if (!latest.has(id) || row.timestamp > latest.get(id)!.timestamp) latest.set(id, normalized);
  }
  return [...latest.values()];
};
export const fetchLatestTrainLocations = async (signal?: AbortSignal) => normalizeLocations(await request<RawTrainLocation[]>('/train-locations/latest', signal));
export const fetchTrainLocations = async (number: string, date: string, signal?: AbortSignal) => normalizeLocations(await request<RawTrainLocation[]>(`/train-locations/${encodeURIComponent(date)}/${encodeURIComponent(number)}`, signal));
export const fetchStationTimetable = async (code: string, signal?: AbortSignal): Promise<TimeTableRow[]> => {
  const trains = await request<Train[]>(`/live-trains/station/${encodeURIComponent(code)}?minutes_before_departure=180&minutes_after_departure=5&minutes_before_arrival=180&minutes_after_arrival=5&include_nonstopping=true`, signal);
  return trains.flatMap(train => {
    const destination = [...train.timeTableRows].reverse().find(row => row.type === 'ARRIVAL')?.stationShortCode;
    const origin = train.timeTableRows.find(row => row.type === 'DEPARTURE')?.stationShortCode;
    return train.timeTableRows.filter(row => row.stationShortCode === code && (!isPassengerService(train) || (row.trainStopping !== false && row.commercialStop !== false))).map(row => ({ ...row, cancelled: train.cancelled || row.cancelled, trainNumber: train.trainNumber, departureDate: train.departureDate, trainType: train.trainType, trainCategory: train.trainCategory, operatorShortCode: train.operatorShortCode, commuterLineID: train.commuterLineID, destination: row.type === 'DEPARTURE' ? destination : origin }));
  }).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
};
export const searchStations = async (query: string) => (await fetchStations(true)).filter(station => `${station.stationName} ${station.stationShortCode}`.toLocaleLowerCase('fi').includes(query.trim().toLocaleLowerCase('fi')));
