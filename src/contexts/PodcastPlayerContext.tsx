import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

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
  const soundRef = useRef<Audio.Sound | null>(null);
  const [state, setState] = useState<PodcastPlayerState>({
    currentEpisode: null, isPlaying: false, currentTime: 0,
    duration: 0, volume: 1, playbackRate: 1, isMinimized: true,
  });

  const playEpisode = useCallback(async (episode: InfluencerPodcastEpisode, startPosition = 0) => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }
    const { sound } = await Audio.Sound.createAsync(
      { uri: episode.audio_file_url },
      { positionMillis: startPosition * 1000, shouldPlay: true, volume: state.volume, rate: state.playbackRate },
      (status) => {
        if (status.isLoaded) {
          setState(prev => ({
            ...prev,
            currentTime: (status.positionMillis || 0) / 1000,
            duration: (status.durationMillis || 0) / 1000,
            isPlaying: status.isPlaying || false,
          }));
        }
      }
    );
    soundRef.current = sound;
    setState(prev => ({ ...prev, currentEpisode: episode, isPlaying: true, isMinimized: true }));
  }, [state.volume, state.playbackRate]);

  const pause = useCallback(async () => {
    await soundRef.current?.pauseAsync();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const resume = useCallback(async () => {
    await soundRef.current?.playAsync();
    setState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const seek = useCallback(async (time: number) => {
    await soundRef.current?.setPositionAsync(time * 1000);
    setState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const skipForward = useCallback(async (seconds = 15) => {
    const newTime = Math.min(state.currentTime + seconds, state.duration);
    await soundRef.current?.setPositionAsync(newTime * 1000);
  }, [state.currentTime, state.duration]);

  const skipBackward = useCallback(async (seconds = 15) => {
    const newTime = Math.max(state.currentTime - seconds, 0);
    await soundRef.current?.setPositionAsync(newTime * 1000);
  }, [state.currentTime]);

  const setVolume = useCallback(async (v: number) => {
    await soundRef.current?.setVolumeAsync(v);
    setState(prev => ({ ...prev, volume: v }));
  }, []);

  const setPlaybackRate = useCallback(async (r: number) => {
    await soundRef.current?.setRateAsync(r, true);
    setState(prev => ({ ...prev, playbackRate: r }));
  }, []);

  const toggleMinimized = useCallback(() => setState(prev => ({ ...prev, isMinimized: !prev.isMinimized })), []);

  const closePlayer = useCallback(async () => {
    await soundRef.current?.stopAsync();
    await soundRef.current?.unloadAsync();
    soundRef.current = null;
    setState(prev => ({ ...prev, currentEpisode: null, isPlaying: false, currentTime: 0, duration: 0 }));
  }, []);

  return (
    <PodcastPlayerContext.Provider value={{ ...state, playEpisode, pause, resume, seek, skipForward, skipBackward, setVolume, setPlaybackRate, toggleMinimized, closePlayer }}>
      {children}
    </PodcastPlayerContext.Provider>
  );
}
