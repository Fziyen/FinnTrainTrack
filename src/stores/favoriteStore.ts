import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoriteState {
  favoriteTrain: string[]; // trainNumber-departureDate
  favoriteStations: string[]; // stationCode
  addFavoriteTrain: (trainId: string) => void;
  removeFavoriteTrain: (trainId: string) => void;
  addFavoriteStation: (stationCode: string) => void;
  removeFavoriteStation: (stationCode: string) => void;
  isFavoriteTrain: (trainId: string) => boolean;
  isFavoriteStation: (stationCode: string) => boolean;
}

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      favoriteTrain: [],
      favoriteStations: [],
      
      addFavoriteTrain: (trainId: string) => 
        set((state) => ({
          favoriteTrain: state.favoriteTrain.includes(trainId) ? state.favoriteTrain : [...state.favoriteTrain, trainId]
        })),
        
      removeFavoriteTrain: (trainId: string) =>
        set((state) => ({
          favoriteTrain: state.favoriteTrain.filter((id) => id !== trainId)
        })),
        
      addFavoriteStation: (stationCode: string) =>
        set((state) => ({
          favoriteStations: state.favoriteStations.includes(stationCode) ? state.favoriteStations : [...state.favoriteStations, stationCode]
        })),
        
      removeFavoriteStation: (stationCode: string) =>
        set((state) => ({
          favoriteStations: state.favoriteStations.filter((code) => code !== stationCode)
        })),
        
      isFavoriteTrain: (trainId: string) =>
        get().favoriteTrain.includes(trainId),
        
      isFavoriteStation: (stationCode: string) =>
        get().favoriteStations.includes(stationCode),
    }),
    {
      name: 'favorites-storage',
    }
  )
);
