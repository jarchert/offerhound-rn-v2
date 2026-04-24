import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { useAudioPlayer, AudioPlayer } from 'expo-audio';

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
  const player = useAudioPlayer(null);
  const [state, setState] = useState<PodcastPlayerState>({
    currentEpisode: null, isPlaying: false, currentTime: 0,
    duration: 0, volume: 1, playbackRate: 1, isMinimized: true,
  });

  const playEpisode = useCallback(async (episode: InfluencerPodcastEpisode, _startPosition = 0) => {
    try {
      (player as any).replace?.({ uri: episode.audio_file_url });
      player.play();
      setState(prev => ({ ...prev, currentEpisode: episode, isPlaying: true, isMinimized: true }));
    } catch (e) {
      console.warn('[PodcastPlayer] play failed', e);
    }
  }, [player]);

  const pause = useCallback(() => {
    player.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, [player]);

  const resume = useCallback(() => {
    player.play();
    setState(prev => ({ ...prev, isPlaying: true }));
  }, [player]);

  const seek = useCallback((time: number) => {
    (player as any).seekTo?.(time);
    setState(prev => ({ ...prev, currentTime: time }));
  }, [player]);

  const skipForward = useCallback((seconds = 15) => {
    const newTime = Math.min(state.currentTime + seconds, state.duration);
    (player as any).seekTo?.(newTime);
  }, [player, state.currentTime, state.duration]);

  const skipBackward = useCallback((seconds = 15) => {
    const newTime = Math.max(state.currentTime - seconds, 0);
    (player as any).seekTo?.(newTime);
  }, [player, state.currentTime]);

  const setVolume = useCallback((v: number) => {
    player.volume = v;
    setState(prev => ({ ...prev, volume: v }));
  }, [player]);

  const setPlaybackRate = useCallback((r: number) => {
    (player as any).rate = r;
    setState(prev => ({ ...prev, playbackRate: r }));
  }, [player]);

  const toggleMinimized = useCallback(() => setState(prev => ({ ...prev, isMinimized: !prev.isMinimized })), []);

  const closePlayer = useCallback(() => {
    player.pause();
    (player as any).replace?.(null);
    setState(prev => ({ ...prev, currentEpisode: null, isPlaying: false, currentTime: 0, duration: 0 }));
  }, [player]);

  return (
    <PodcastPlayerContext.Provider value={{ ...state, playEpisode, pause, resume, seek, skipForward, skipBackward, setVolume, setPlaybackRate, toggleMinimized, closePlayer }}>
      {children}
    </PodcastPlayerContext.Provider>
  );
}
