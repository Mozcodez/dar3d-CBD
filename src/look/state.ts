export type ThemeId = 'clay' | 'blueprint' | 'neon';
export type Quality = 'auto' | 'high' | 'low';

export interface LookState {
  time: Date;
  theme: ThemeId;
  seaOn: boolean;
  quality: Quality;
}

export function readLookUrl(): Pick<LookState, 'time' | 'theme' | 'seaOn' | 'quality'> | null {
  const params = new URLSearchParams(window.location.search);
  const time = params.get('t');
  const theme = params.get('theme');
  const quality = params.get('quality');
  if (!time && !theme && !params.has('sea') && !quality) return null;
  const date = new Date();
  const [hours = 0, minutes = 0] = (time ?? '').split(':').map(Number);
  // Slider values represent East Africa Time (UTC+3), independently of browser locale.
  date.setUTCHours((hours - 3 + 24) % 24, minutes || 0, 0, 0);
  return {
    time: date,
    theme: theme === 'blueprint' || theme === 'neon' ? theme : 'clay',
    seaOn: params.get('sea') !== '0',
    quality: quality === 'high' || quality === 'low' ? quality : 'auto',
  };
}

export function syncLookUrl(state: LookState) {
  const params = new URLSearchParams(window.location.search);
  params.set('t', `${String((state.time.getUTCHours() + 3) % 24).padStart(2, '0')}:${String(state.time.getUTCMinutes()).padStart(2, '0')}`);
  params.set('theme', state.theme);
  params.set('sea', state.seaOn ? '1' : '0');
  params.set('quality', state.quality);
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
}

export function atEATMinutes(minutes: number): Date {
  const date = new Date();
  date.setUTCHours(Math.floor(minutes / 60) - 3, minutes % 60, 0, 0);
  return date;
}

export function eatMinutes(date: Date): number {
  return ((date.getUTCHours() + 3) % 24) * 60 + date.getUTCMinutes();
}
