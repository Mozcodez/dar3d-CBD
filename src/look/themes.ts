import type { ThemeId } from './state';

export interface ThemeStyle {
  id: ThemeId;
  name: string;
  darkUi: boolean;
  background: string;
  water: string;
  land: string;
  road: string;
  labelColor: string;
  buildingLow: string;
  buildingHigh: string;
  estimated: string;
  accent: string;
  buildingOpacity: number;
}

export const themes: Record<ThemeId, ThemeStyle> = {
  clay: {
    id: 'clay', name: 'Clay', darkUi: false,
    background: '#e5e9e2', water: '#a9cede', land: '#eee9dd', road: '#d2c8b5', labelColor: '#46574d',
    buildingLow: '#dfc9aa', buildingHigh: '#895d4b', estimated: '#9bab9d', accent: '#e7a068', buildingOpacity: 0.94,
  },
  blueprint: {
    id: 'blueprint', name: 'Blueprint', darkUi: true,
    background: '#0b2a4a', water: '#102e50', land: '#123459', road: '#72c9df', labelColor: '#ddf3ff',
    buildingLow: '#65c7e6', buildingHigh: '#b9f4ff', estimated: '#49899f', accent: '#f2cc83', buildingOpacity: 0.72,
  },
  neon: {
    id: 'neon', name: 'Night-neon', darkUi: true,
    background: '#07070f', water: '#10142d', land: '#11111b', road: '#38a9bd', labelColor: '#dbd5ff',
    buildingLow: '#17495d', buildingHigh: '#a4428b', estimated: '#354752', accent: '#ffba6a', buildingOpacity: 0.9,
  },
};

export function phasePalette(theme: ThemeStyle, altitudeDeg: number) {
  const night = clamp((-altitudeDeg - 6) / 12);
  const twilight = clamp(1 - Math.abs(altitudeDeg - 1) / 10) * (1 - night * 0.35);
  const nightSky = theme.id === 'neon' ? '#05050b' : theme.id === 'blueprint' ? '#07182a' : '#17283d';
  const daySky = theme.id === 'clay' ? '#c7dbe2' : theme.id === 'blueprint' ? '#4e7898' : '#263852';
  const nightHorizon = theme.id === 'neon' ? '#211938' : theme.id === 'blueprint' ? '#192c43' : '#324358';
  const landNight = theme.id === 'neon' ? '#0b0b15' : theme.id === 'blueprint' ? '#0d2339' : '#182632';
  const roadNight = theme.id === 'neon' ? '#332944' : theme.id === 'blueprint' ? '#26465e' : '#374253';
  const labelNight = theme.id === 'clay' ? '#d6ddd9' : theme.labelColor;
  const warmHorizon = theme.id === 'clay' ? '#edaa87' : theme.id === 'neon' ? '#a9518e' : '#70aec1';
  return {
    night,
    twilight,
    sky: mix(daySky, nightSky, night),
    horizon: mix(mix(daySky, warmHorizon, twilight), nightHorizon, night),
    fog: mix(mix(theme.background, warmHorizon, twilight * 0.45), nightSky, night),
    background: mix(mix(theme.background, warmHorizon, twilight * 0.35), nightSky, night),
    water: mix(mix(theme.water, warmHorizon, twilight * 0.38), theme.id === 'clay' ? '#122238' : nightSky, night),
    land: mix(mix(theme.land, warmHorizon, twilight * 0.22), landNight, night),
    road: mix(mix(theme.road, warmHorizon, twilight * 0.18), roadNight, night),
    label: mix(theme.labelColor, labelNight, night),
  };
}

function mix(a: string, b: string, amount: number) {
  const from = a.match(/[\da-f]{2}/gi)!.map((value) => parseInt(value, 16));
  const to = b.match(/[\da-f]{2}/gi)!.map((value) => parseInt(value, 16));
  return `#${from.map((value, index) => Math.round(value + (to[index] - value) * amount).toString(16).padStart(2, '0')).join('')}`;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));
