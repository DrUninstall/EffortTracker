/**
 * Sound Effects Library
 *
 * Provides audio feedback for app interactions.
 * Uses Web Audio API for low-latency playback.
 *
 * All sounds are optional and respect user preferences.
 */

// Base path for static assets in Next.js static export
const BASE_PATH = '/EffortTracker';

export type SoundName = 'complete' | 'log' | 'timerEnd' | 'achievement';

interface SoundConfig {
  src: string;
  volume: number;
}

const SOUND_CONFIG: Record<SoundName, SoundConfig> = {
  complete: {
    src: `${BASE_PATH}/sounds/complete.mp3`,
    volume: 0.6,
  },
  log: {
    src: `${BASE_PATH}/sounds/log.mp3`,
    volume: 0.4,
  },
  timerEnd: {
    src: `${BASE_PATH}/sounds/timer-end.mp3`,
    volume: 0.6,
  },
  achievement: {
    src: `${BASE_PATH}/sounds/achievement.mp3`,
    volume: 0.7,
  },
};

// Audio element cache for reuse
const audioCache: Map<SoundName, HTMLAudioElement> = new Map();

// Track if sounds have been unlocked by user interaction
let audioUnlocked = false;

/**
 * Preload all sound files into cache
 * Call this on first user interaction to unlock audio on mobile
 */
export function preloadSounds(): void {
  if (typeof window === 'undefined') return;

  Object.entries(SOUND_CONFIG).forEach(([name, config]) => {
    const audio = new Audio(config.src);
    audio.preload = 'auto';
    audio.volume = config.volume;
    audioCache.set(name as SoundName, audio);
  });

  audioUnlocked = true;
}

/**
 * Check if sound is supported in the current environment
 */
export function isSoundSupported(): boolean {
  return typeof window !== 'undefined' && 'Audio' in window;
}

/**
 * Play a sound effect
 *
 * @param name - The sound to play
 * @param options - Optional settings override
 * @returns Promise that resolves when sound starts playing
 */
export async function playSound(
  name: SoundName,
  options?: { volume?: number }
): Promise<boolean> {
  if (!isSoundSupported()) {
    return false;
  }

  // Check for reduced motion preference (also disable sounds)
  if (typeof window !== 'undefined') {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion) {
      return false;
    }
  }

  try {
    let audio = audioCache.get(name);

    if (!audio) {
      // Create and cache audio element on first use
      const config = SOUND_CONFIG[name];
      audio = new Audio(config.src);
      audio.volume = config.volume;
      audioCache.set(name, audio);
    }

    // Apply volume override if provided
    if (options?.volume !== undefined) {
      audio.volume = options.volume;
    } else {
      // Reset to default volume
      audio.volume = SOUND_CONFIG[name].volume;
    }

    // Reset playback position for rapid re-triggers
    audio.currentTime = 0;

    // Play and handle potential autoplay restrictions
    await audio.play();
    return true;
  } catch (error) {
    // Autoplay was blocked or file not found
    // Silently fail - sounds are enhancement, not critical
    console.debug('Sound playback failed:', name, error);
    return false;
  }
}

/**
 * Play sound only if settings allow
 *
 * @param name - The sound to play
 * @param soundEnabled - From user settings
 */
export async function playSoundIfEnabled(
  name: SoundName,
  soundEnabled: boolean
): Promise<boolean> {
  if (!soundEnabled) {
    return false;
  }
  return playSound(name);
}

/**
 * Unlock audio context on first user interaction
 * Required for iOS Safari and other browsers with autoplay restrictions
 */
export function unlockAudio(): void {
  if (audioUnlocked) return;

  // Create a silent audio context to unlock
  const AudioContext =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
  if (AudioContext) {
    const ctx = new AudioContext();
    // Create a short silent buffer
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    ctx.close();
  }

  preloadSounds();
  audioUnlocked = true;
}

/**
 * Stop all currently playing sounds
 */
export function stopAllSounds(): void {
  audioCache.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
}
