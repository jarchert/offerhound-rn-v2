import { useState } from "react";

export function useWelcomeDialog(_role: string, _ready: boolean, _hasProfile: boolean) {
  const [showWelcome, setShowWelcome] = useState(false);
  return {
     showWelcome,
     handleClose: () => setShowWelcome(false),
     handleBypassChange: (_bypass: boolean) => {},
  };
}
