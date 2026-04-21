import { useMemo } from "react";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { SportType, SPORTS_CONFIG } from "@/lib/data/sports";

interface SecondarySport {
  sport: string;
  positions?: string[];
}

interface AthleteSportsResult {
  primarySport: SportType | null;
  secondarySports: SportType[];
  allSports: SportType[];
  hasSport: (sport: string) => boolean;
  isLoading: boolean;
}

export function useAthleteSports(): AthleteSportsResult {
  const { profile, isLoading } = usePlayerProfile();

  const result = useMemo(() => {
    const primarySport = (profile?.sport as SportType) || null;
    const rawSecondarySports = profile?.secondary_sports;
    const secondarySportsData: SecondarySport[] = Array.isArray(rawSecondarySports)
       ? (rawSecondarySports as unknown as SecondarySport[])
       : [];
    const secondarySports: SportType[] = secondarySportsData
       .map((s) => s.sport as SportType)
       .filter((s) => s && SPORTS_CONFIG[s]);

    const allSports: SportType[] = [];
    if (primarySport && SPORTS_CONFIG[primarySport]) allSports.push(primarySport);
    secondarySports.forEach((sport) => {
       if (!allSports.includes(sport)) allSports.push(sport);
    });

    const hasSport = (sport: string): boolean => {
       const sportLower = sport.toLowerCase();
       return allSports.some(
          (s) => s.toLowerCase() === sportLower || SPORTS_CONFIG[s]?.name.toLowerCase() === sportLower
       );
    };

    return { primarySport, secondarySports, allSports, hasSport };
  }, [profile?.sport, profile?.secondary_sports]);

  return { ...result, isLoading };
}

export function normalizeSportName(sport: string): string {
  const sportLower = sport.toLowerCase().trim();
  if (sportLower === "track" || sportLower === "track & field" || sportLower === "track-field") return "track-field";
  for (const [id, config] of Object.entries(SPORTS_CONFIG)) {
    if (id === sportLower || config.name.toLowerCase() === sportLower) return id;
  }
  return sportLower;
}

export function sportsMatch(sport1: string, sport2: string): boolean {
  return normalizeSportName(sport1) === normalizeSportName(sport2);
}
