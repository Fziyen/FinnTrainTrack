export interface Coordinates { latitude: number; longitude: number }
export interface Station {
  passengerTraffic: boolean; type: string; stationName: string; stationShortCode: string;
  stationUICCode: number; countryCode: string; longitude: number; latitude: number;
}
export interface TimeTableRow {
  stationShortCode: string; stationUICCode: number; countryCode: string;
  type: 'ARRIVAL' | 'DEPARTURE'; scheduledTime: string; actualTime?: string;
  differenceInMinutes?: number; liveEstimateTime?: string; cancelled: boolean;
  commercialStop?: boolean; trainStopping?: boolean;
  trainNumber?: number; trainType?: string; trainCategory?: string; departureDate?: string;
  destination?: string; commuterLineID?: string; operatorShortCode?: string; commercialTrack?: string;
}
export interface Train {
  trainNumber: number; departureDate: string; operatorUICCode: number; operatorShortCode: string;
  trainType: string; trainCategory: string; commuterLineID?: string; runningCurrently: boolean;
  cancelled: boolean; version: number; timetableType: string; timetableAcceptanceDate: string;
  timeTableRows: TimeTableRow[];
}
export interface TrainLocation {
  location: Coordinates; accuracy?: number; speed: number; timestamp: string;
  trainNumber: number; departureDate: string;
}
export interface RawTrainLocation extends Omit<TrainLocation, 'location'> {
  location: { type: 'Point'; coordinates: [number, number] };
}
