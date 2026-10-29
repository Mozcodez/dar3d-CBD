import { useEffect, useMemo, useState } from 'react';
import type { LookState, Quality, ThemeId } from '../look/state';
import { atEATMinutes, eatMinutes } from '../look/state';
import { formatEAT, getSunPosition, getSunTimes } from '../look/sun';

interface Props { look: LookState; onChange: (look: LookState) => void; fps?: number; activeQuality: 'high' | 'low' }

export function LookPanel({ look, onChange, fps, activeQuality }: Props) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(60);
  const [expanded, setExpanded] = useState(false);
  const position = getSunPosition(look.time);
  const times = useMemo(() => getSunTimes(look.time), [look.time.toDateString()]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => onChange({ ...look, time: new Date(look.time.getTime() + speed * 1000) }), 1000);
    return () => window.clearInterval(timer);
  }, [playing, speed, look, onChange]);

  const preset = (label: string, date: Date | null) => date && (
    <button key={label} className="look-preset" type="button" onClick={() => onChange({ ...look, time: date })} aria-label={`Set time to ${label}, ${formatEAT(date)} East Africa Time`}>
      <span>{label}</span><time>{formatEAT(date)}</time>
    </button>
  );

  return (
    <section className={`look-panel${expanded ? ' is-expanded' : ''}`} aria-label="Map look and lighting controls">
      <div className="look-panel-top">
        <div className="look-time-readout">
          <span className="sun-symbol" aria-hidden="true"><svg viewBox="0 0 20 20">{position.phase === 'night' ? <path d="M14.8 13.2A7 7 0 0 1 6.7 5.1a7.2 7.2 0 1 0 8.1 8.1Z" /> : <><circle cx="10" cy="10" r="3.2" /><path d="M10 1.7v2M10 16.3v2M1.7 10h2m12.6 0h2M4.1 4.1l1.4 1.4m9 9 1.4 1.4m0-11.8-1.4 1.4m-9 9-1.4 1.4" /></>}</svg></span>
          <div><strong>{formatEAT(look.time)}</strong><span>{position.phase} · East Africa Time</span></div>
        </div>
        <div className="look-actions">
          <button className="look-icon-button" type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause day and night playback' : 'Play day and night cycle'}>
            <svg viewBox="0 0 20 20" aria-hidden="true">{playing ? <path d="M6.5 4v12M13.5 4v12" /> : <path d="m6.5 3.8 9 6.2-9 6.2z" />}</svg>
          </button>
          <label className="look-speed">Speed<select aria-label="Day and night playback speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
            <option value="1">×1</option><option value="60">×60</option><option value="600">×600</option>
          </select></label>
          <button className="look-now" type="button" onClick={() => { setPlaying(false); onChange({ ...look, time: new Date() }); }}>Now</button>
          <button className="look-expand" type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-label={expanded ? 'Collapse look controls' : 'Expand look controls'}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d={expanded ? 'm5 12 5-5 5 5' : 'm5 8 5 5 5-5'} /></svg>
          </button>
        </div>
      </div>
      <div className="look-details">
        <label className="look-slider-label" htmlFor="look-time">SUN POSITION <span>{Math.round(position.altitudeDeg)}° altitude · {Math.round(position.azimuthDeg)}° azimuth</span></label>
        <input id="look-time" className="look-slider" type="range" min="0" max="1439" step="1" value={eatMinutes(look.time)}
          aria-label="Time in Dar es Salaam (East Africa Time)" onChange={(event) => { setPlaying(false); onChange({ ...look, time: atEATMinutes(Number(event.target.value)) }); }} />
        <div className="look-detail-row">
          <div className="look-presets" aria-label="Solar time presets">
            {preset('Sunrise', times.sunrise)}{preset('Golden hour', times.goldenHour)}{preset('Sunset', times.sunset)}{preset('Dusk', times.dusk)}
          </div>
          <div className="look-toggles">
            <label className="look-toggle"><input type="checkbox" checked={look.seaOn} onChange={(event) => onChange({ ...look, seaOn: event.target.checked })} /> <span>Time-aware water</span></label>
            <label className="look-quality">Quality<select aria-label="Rendering quality" value={look.quality} onChange={(event) => onChange({ ...look, quality: event.target.value as Quality })}>
              <option value="auto">Auto ({activeQuality})</option><option value="high">High</option><option value="low">Low</option>
            </select></label>
            {window.location.search.includes('debug') && <span className="look-fps">{fps ?? '—'} FPS</span>}
          </div>
        </div>
        <div className="look-theme-row" role="group" aria-label="Map theme">
          <span className="look-theme-label">THEME</span>
          {(['clay', 'blueprint', 'neon'] as ThemeId[]).map((theme) => <button key={theme} type="button" className={`theme-chip theme-${theme}${look.theme === theme ? ' selected' : ''}`}
            aria-pressed={look.theme === theme} onClick={() => onChange({ ...look, theme })}>{theme === 'neon' ? 'Night-neon' : theme[0].toUpperCase() + theme.slice(1)}</button>)}
        </div>
      </div>
    </section>
  );
}
