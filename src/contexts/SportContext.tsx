import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SportType, DEFAULT_SPORT, SPORTS_CONFIG } from '@/lib/data/sports';

interface SportContextType {
  selectedSport: SportType;
  setSelectedSport: (sport: SportType) => void;
  sportName: string;
}

const SportContext = createContext<SportContextType | undefined>(undefined);
const STORAGE_KEY = 'offerhound_selected_sport';

export function SportProvider({ children }: { children: ReactNode }) {
  const [selectedSport, setSelectedSportState] = useState<SportType>(DEFAULT_SPORT);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored && SPORTS_CONFIG[stored as SportType]) {
        setSelectedSportState(stored as SportType);
      }
    });
  }, []);

  const setSelectedSport = (sport: SportType) => {
    setSelectedSportState(sport);
    AsyncStorage.setItem(STORAGE_KEY, sport);
  };

  const sportName = SPORTS_CONFIG[selectedSport]?.name || 'Football';

  return (
    <SportContext.Provider value={{ selectedSport, setSelectedSport, sportName }}>
      {children}
    </SportContext.Provider>
  );
}

export function useSport() {
  const context = useContext(SportContext);
  if (context === undefined) throw new Error('useSport must be used within SportProvider');
  return context;
}

export function useSportSafe() {
  const context = useContext(SportContext);
  if (context === undefined) return { selectedSport: DEFAULT_SPORT, setSelectedSport: () => {}, sportName: 'Football' };
  return context;
}
