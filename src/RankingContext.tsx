import React, { createContext, useContext, ReactNode } from 'react';
import { useRanking, RankingUser } from './hooks/useRanking';

interface RankingContextType {
  ranking: RankingUser[];
  isLoading: boolean;
}

const RankingContext = createContext<RankingContextType | undefined>(undefined);

export function RankingProvider({ children }: { children: ReactNode }) {
  const rankingData = useRanking();
  return (
    <RankingContext.Provider value={rankingData}>
      {children}
    </RankingContext.Provider>
  );
}

export function useGlobalRanking() {
  const context = useContext(RankingContext);
  if (context === undefined) {
    throw new Error('useGlobalRanking must be used within a RankingProvider');
  }
  return context;
}
