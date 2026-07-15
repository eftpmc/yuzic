export const THEME_DEFAULT_COLOR = '#ff7f7f';
export const THEME_PRESET_COLORS = [
  THEME_DEFAULT_COLOR,
  '#ff9f43',
  '#ffd32a',
  '#0be881',
  '#54a0ff',
  '#5f27cd',
] as const;

export const DOWNLOAD_QUALITY_OPTIONS = [
  { key: 'low' as const, labelKey: 'settings.library.downloadQuality.options.low' },
  { key: 'medium' as const, labelKey: 'settings.library.downloadQuality.options.medium' },
  { key: 'high' as const, labelKey: 'settings.library.downloadQuality.options.high' },
  { key: 'original' as const, labelKey: 'settings.library.downloadQuality.options.original' },
] as const;
