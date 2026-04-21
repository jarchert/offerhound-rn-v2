import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Cookie preferences are a web concept — in RN this context is retained for API compatibility
// but isOpen will never show a web-style cookie banner (not applicable on mobile).
interface CookiePreferencesContextType {
  isOpen: boolean;
  openCookiePreferences: () => void;
  closeCookiePreferences: () => void;
}

const CookiePreferencesContext = createContext<CookiePreferencesContextType | undefined>(undefined);

export function CookiePreferencesProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openCookiePreferences = useCallback(() => setIsOpen(true), []);
  const closeCookiePreferences = useCallback(() => setIsOpen(false), []);
  return (
    <CookiePreferencesContext.Provider value={{ isOpen, openCookiePreferences, closeCookiePreferences }}>
      {children}
    </CookiePreferencesContext.Provider>
  );
}

export function useCookiePreferencesModal() {
  const context = useContext(CookiePreferencesContext);
  if (context === undefined) throw new Error('useCookiePreferencesModal must be used within CookiePreferencesProvider');
  return context;
}
