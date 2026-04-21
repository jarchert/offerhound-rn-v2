export function useScheduledLetters() {
  return {
    scheduledLetters: [] as any[],
    isLoading: false,
    scheduleLetter: async (_: any) => {},
    cancelScheduledLetter: async (_: string) => {},
  };
}
