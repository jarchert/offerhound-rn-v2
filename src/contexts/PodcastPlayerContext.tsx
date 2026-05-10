// NOTE: expo-audio is intentionally NOT imported at module-eval time.
// On iOS 26 + New Architecture, expo-audio's ExpoAudio.js mutates native
// AudioPlayer/AudioRecorder prototypes at module-eval scope via
// requireNativeModule('ExpoAudio'). This triggers the same
// __cxa_rethrow → std::terminate crash on the turbomodulemanager queue
// that we saw with NetInfo and expo-notifications.
// We lazy-load expo-audio inside a useEffect and store the player in a ref.
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
// AudioPlayer type-only import is safe — it's just a TS interface, no runtime eval.
import type { AudioPlayer } from 'expo-audio';

export interface InfluencerPodcastEpisode {
  id: string;
  title: string;
  audio_file_url: string;
  cover_image_url?: string;
  short_description?: string;
  [key: string]: any;
}

interface PodcastPlayerState {
  currentEpisode: InfluencerPodcastEpisode | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isMinimized: boolean;
}

interface PodcastPlayerContextValue extends PodcastPlayerState {
  playEpisode: (episode: InfluencerPodcastEpisode, startPosition?: number) => void;
  pause: () => void;
  resume: () => void;
  seek: (time: number) => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  toggleMinimized: () => void;
  closePlayer: () => void;
}

const PodcastPlayerContext = createContext<PodcastPlayerContextValue | null>(null);

export function usePodcastPlayer() {
  const context = useContext(PodcastPlayerContext);
  if (!context) throw new Error('usePodcastPlayer must be used within PodcastPlayerProvider');
  return context;
}

export function PodcastPlayerProvider({ children }: { children: React.ReactNode }) {
  // Lazy-load expo-audio after first render to avoid the iOS 26 + New Arch
  // module-eval TurboModule crash. playerRef starts null; all action callbacks
  // guard against null so they're safe to call before the module loads.
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    import('expo-audio')
      .then(({ useAudioPlayer: _hook, ...mod }) => {
        // We can't call a hook outside a component, so we use the imperative
        // AudioPlayer constructor if available, or fall back to a no-op stub.
        // expo-audio exposes AudioModule.AudioPlayer as a constructable class.
        try {
          const AudioModule = (mod as any).AudioModule ?? (mod as any).default;
          if (AudioModule?.AudioPlayer) {
            playerRef.current = new AudioModule.AudioPlayer(null) as AudioPlayer;
          }
        } catch (e) {
          console.warn('[PodcastPlayer] expo-audio init failed (iOS 26?):', e);
        }
      })
      .catch((e) => console.warn('[PodcastPlayer] expo-audio import failed:', e));
  }, []);

  const [state, setState] = useState<PodcastPlayerState>({
    currentEpisode: null, isPlaying: false, currentTime: 0,
    duration: 0, volume: 1, playbackRate: 1, isMinimized: true,
  });

  const playEpisode = useCallback(async (episode: InfluencerPodcastEpisode, _startPosition = 0) => {
    try {
      const p = playerRef.current;
      if (!p) { console.warn('[PodcastPlayer] player not ready yet'); return; }
      (p as any).replace?.({ uri: episode.audio_file_url });
      (p as any).play?.();
      setState(prev => ({ ...prev, currentEpisode: episode, isPlaying: true, isMinimized: true }));
    } catch (e) {
      console.warn('[PodcastPlayer] play failed', e);
    }
  }, []);

  const pause = useCallback(() => {
    try { (playerRef.current as any)?.pause?.(); } catch (e) { console.warn('[PodcastPlayer] pause failed', e); }
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const resume = useCallback(() => {
    try { (playerRef.current as any)?.play?.(); } catch (e) { console.warn('[PodcastPlayer] resume failed', e); }
    setState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const seek = useCallback((time: number) => {
    try { (playerRef.current as any)?.seekTo?.(time); } catch (e) { console.warn('[PodcastPlayer] seek failed', e); }
    setState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const skipForward = useCallback((seconds = 15) => {
    const newTime = Math.min(state.currentTime + seconds, state.duration);
    try { (playerRef.current as any)?.seekTo?.(newTime); } catch (e) { console.warn('[PodcastPlayer] skipForward failed', e); }
  }, [state.currentTime, state.duration]);

  const skipBackward = useCallback((seconds = 15) => {
    const newTime = Math.max(state.currentTime - seconds, 0);
    try { (playerRef.current as any)?.seekTo?.(newTime); } catch (e) { console.warn('[PodcastPlayer] skipBackward failed', e); }
  }, [state.currentTime]);

  const setVolume = useCallback((v: number) => {
    try { if (playerRef.current) (playerRef.current as any).volume = v; } catch (e) { console.warn('[PodcastPlayer] setVolume failed', e); }
    setState(prev => ({ ...prev, volume: v }));
  }, []);

  const setPlaybackRate = useCallback((r: number) => {
    try { if (playerRef.current) (playerRef.current as any).rate = r; } catch (e) { console.warn('[PodcastPlayer] setPlaybackRate failed', e); }
    setState(prev => ({ ...prev, playbackRate: r }));
  }, []);

  const toggleMinimized = useCallback(() => setState(prev => ({ ...prev, isMinimized: !prev.isMinimized })), []);

  const closePlayer = useCallback(() => {
    try {
      (playerRef.current as any)?.pause?.();
      (playerRef.current as any)?.replace?.(null);
    } catch (e) { console.warn('[PodcastPlayer] closePlayer failed', e); }
    setState(prev => ({ ...prev, currentEpisode: null, isPlaying: false, currentTime: 0, duration: 0 }));
  }, []);

  return (
    <PodcastPlayerContext.Provider value={{ ...state, playEpisode, pause, resume, seek, skipForward, skipBackward, setVolume, setPlaybackRate, toggleMinimized, closePlayer }}>
      {children}
    </PodcastPlayerContext.Provider>
  );
}
