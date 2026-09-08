import type {
  AudioConfig,
  SubtitleConfig,
  TimelineConfig,
  VisualConfig,
  VideoProject,
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
  style: "Clean White",
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

export function buildStudioConfig(project: Partial<VideoProject>) {
  return {
    audio: buildAudioConfig({
      ...(project.audio || {}),
      voice: project.voice || project.audio?.voice,
      music: project.music || project.audio?.music,
      language: project.language || project.audio?.language,
    }),
    visual: buildVisualConfig({
      ...(project.visual || {}),
      style: project.style || project.visual?.style,
    }),
    subtitle: buildSubtitleConfig({
      ...(project.subtitle || {}),
      enabled: project.autoSubtitle ?? project.subtitle?.enabled,
      language: project.language || project.subtitle?.language,
    }),
    timeline: buildTimelineConfig({
      ...(project.timeline || {}),
      pacing: project.smartPacing === false ? "Manual" : project.timeline?.pacing || "Smart",
    }),
  };
}
