import type {
  AudioConfig,
  SubtitleConfig,
  TimelineConfig,
  VisualConfig,
} from "./project-store";

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  voice: "Narator Natural",
  music: "Ambient Cinematic",
  language: "Indonesia",
  voiceVolume: 100,
  musicVolume: 35,
  fadeIn: true,
  fadeOut: true,
};

export const DEFAULT_VISUAL_CONFIG: VisualConfig = {
  style: "Cinematic",
  cameraMotion: "Smart",
  lighting: "Natural",
  transition: "Smooth",
  assetMode: "AI + Upload",
};

export const DEFAULT_SUBTITLE_CONFIG: SubtitleConfig = {
  enabled: true,
  language: "Indonesia",
  style: "Clean",
  position: "Bottom",
  size: "Medium",
};

export const DEFAULT_TIMELINE_CONFIG: TimelineConfig = {
  pacing: "Smart",
  transitionDuration: 0.5,
  introDuration: 2,
  outroDuration: 3,
};

export function buildAudioConfig(input: Partial<AudioConfig> = {}): AudioConfig {
  return { ...DEFAULT_AUDIO_CONFIG, ...input };
}

export function buildVisualConfig(input: Partial<VisualConfig> = {}): VisualConfig {
  return { ...DEFAULT_VISUAL_CONFIG, ...input };
}

export function buildSubtitleConfig(input: Partial<SubtitleConfig> = {}): SubtitleConfig {
  return { ...DEFAULT_SUBTITLE_CONFIG, ...input };
}

export function buildTimelineConfig(input: Partial<TimelineConfig> = {}): TimelineConfig {
  return { ...DEFAULT_TIMELINE_CONFIG, ...input };
}
