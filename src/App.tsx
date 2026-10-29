import { useCallback, useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, NavigationControl, Popup, ScaleControl } from 'maplibre-gl';
import { ThreeFocusLayer } from './map/three-focus-layer';
import { cbdBuildingLayerId, cbdBuildingSourceId, cbdBuildingsLayer } from './layers/cbd-buildings';
import { LookPanel } from './components/LookPanel';
import { applyLook } from './look/lighting';
import { readLookUrl, syncLookUrl, type LookState } from './look/state';
import { installShadows } from './look/shadows';
import { installOcean } from './look/ocean';
import { installNightLights } from './look/nightLights';
import { getSunPosition } from './look/sun';
import { monitorQuality, type QualityTier } from './look/quality';
import { cityStories, type CityStory } from './stories';
import { StoryTour } from './components/StoryTour';

const INITIAL_VIEW = {
  center: [39.28, -6.818] as [number, number],
  zoom: 15.5,
  pitch: 60,
  bearing: -20,
};
const SMALL_SCREEN_QUERY = '(max-width: 640px)';
interface CbdBuildingSummary {
  total_buildings: number;
  height_source_counts: { osm: number; estimated: number; landmark: number };
  height_source_percent: { osm: number; estimated: number; landmark: number };
  height_details: { explicit_osm_height: number; osm_levels_derived: number; type_estimated: number; landmark: number };
  height_detail_percent: { explicit_osm_height: number; osm_levels_derived: number; type_estimated: number; landmark: number };
}

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [buildingSummary, setBuildingSummary] = useState<CbdBuildingSummary | null>(null);
  const [look, setLook] = useState<LookState>(() => ({ time: new Date(), theme: 'clay', seaOn: true, quality: 'auto', ...(readLookUrl() ?? {}) }));
  const [activeQuality, setActiveQuality] = useState<QualityTier>('high');
  const [fps, setFps] = useState<number>();
  const [activeStory, setActiveStory] = useState<CityStory | null>(() => {
    const id = new URLSearchParams(window.location.search).get('tour');
    const requestedStory = cityStories.find((story) => story.id === id);
    if (requestedStory) return requestedStory;
    return window.matchMedia(SMALL_SCREEN_QUERY).matches ? null : cityStories[0];
  });
  const shadowsRef = useRef<ReturnType<typeof installShadows> | null>(null);
  const oceanUpdaterRef = useRef<Awaited<ReturnType<typeof installOcean>> | null>(null);
  const nightLightsUpdaterRef = useRef<ReturnType<typeof installNightLights> | null>(null);
  const appliedLookKeyRef = useRef('');
  const effectiveQuality = look.quality === 'auto' ? activeQuality : look.quality;
  const renderLook: LookState = { ...look, quality: effectiveQuality };
  const renderLookRef = useRef(renderLook);
  const qualityRef = useRef(effectiveQuality);
  renderLookRef.current = renderLook;
  qualityRef.current = effectiveQuality;

  const updateLook = useCallback((next: LookState) => {
    setLook(next);
    syncLookUrl(next);
  }, []);

  useEffect(() => {
    syncLookUrl(look);
  }, [look]);

  useEffect(() => {
    const media = window.matchMedia(SMALL_SCREEN_QUERY);
    const closeDefaultStoryOnSmallScreen = (event: MediaQueryListEvent) => {
      if (event.matches && !new URLSearchParams(window.location.search).has('tour')) setActiveStory(null);
    };
    media.addEventListener('change', closeDefaultStoryOnSmallScreen);
    return () => media.removeEventListener('change', closeDefaultStoryOnSmallScreen);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const map = mapRef.current;
      if (!map?.isStyleLoaded() || !map.getLayer(cbdBuildingLayerId)) return;
      const state = renderLookRef.current;
      const key = `${state.time.getTime()}|${state.theme}|${state.seaOn}|${state.quality}`;
      if (key === appliedLookKeyRef.current) return;
      appliedLookKeyRef.current = key;
      const sun = getSunPosition(state.time);
      applyLook(map, state);
      shadowsRef.current?.update(state);
      nightLightsUpdaterRef.current?.(sun.nightFactor, state.theme);
      oceanUpdaterRef.current?.(state, qualityRef.current);
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/data/cbd-buildings-summary.json')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<CbdBuildingSummary>;
      })
      .then((summary) => { if (active) setBuildingSummary(summary); })
      .catch(() => { if (active) setBuildingSummary(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new MapLibreMap({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/bright',
      ...INITIAL_VIEW,
      attributionControl: { compact: false },
      cooperativeGestures: false,
    });

    mapRef.current = map;
    let disposed = false;
    map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-left');
    const popup = new Popup({ closeButton: true, closeOnClick: true, maxWidth: '260px' });
    let stopQuality = () => {};

    map.once('load', () => {
      if (disposed) return;
      stopQuality = monitorQuality(map, (tier) => setActiveQuality((current) => current === 'low' ? current : tier), setFps);
      setMapError(null);
      map.addSource(cbdBuildingSourceId, {
        type: 'geojson',
        data: '/data/cbd-buildings.geojson',
        maxzoom: 16,
        buffer: 0,
        tolerance: 0.5,
      });
      map.addLayer(cbdBuildingsLayer);
      shadowsRef.current = installShadows(map);
      map.addLayer(new ThreeFocusLayer());

      const coordinates = cityStories.map((story) => ({ type: 'Feature', properties: { id: story.id, title: story.title }, geometry: { type: 'Point', coordinates: story.coordinates } }));
      map.addSource('dar-story-stops', { type: 'geojson', data: { type: 'FeatureCollection', features: coordinates } as never });
      map.addLayer({ id: 'dar-story-halos', type: 'circle', source: 'dar-story-stops', paint: { 'circle-radius': ['case', ['==', ['get', 'id'], activeStory?.id ?? ''], 12, 8], 'circle-color': '#efaa68', 'circle-opacity': 0.3, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff9ec' } });
      map.addLayer({ id: 'dar-story-dots', type: 'circle', source: 'dar-story-stops', paint: { 'circle-radius': 4, 'circle-color': '#bd592f', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff9ec' } });
      map.on('click', 'dar-story-dots', (event) => {
        const id = String(event.features?.[0]?.properties?.id ?? '');
        const storyIndex = cityStories.findIndex((story) => story.id === id);
        if (storyIndex < 0) return;
        const story = cityStories[storyIndex];
        setActiveStory(story);
        map.setPaintProperty('dar-story-halos', 'circle-radius', ['case', ['==', ['get', 'id'], story.id], 12, 8]);
        const params = new URLSearchParams(window.location.search);
        params.set('tour', story.id);
        window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
        map.flyTo({ center: story.coordinates, zoom: 16.4, pitch: 64, bearing: -18, duration: 1300, essential: true });
      });
      map.on('mouseenter', 'dar-story-dots', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'dar-story-dots', () => { map.getCanvas().style.cursor = ''; });
      const initial = cityStories.findIndex((story) => story.id === activeStory?.id);
      if (initial >= 0) {
        const story = cityStories[initial];
        map.flyTo({ center: story.coordinates, zoom: 16.4, pitch: 64, bearing: -18, duration: 1500 });
      }

      void fetch('/data/cbd-landmarks.geojson')
        .then((response) => { if (!response.ok) throw new Error(`Landmark data returned HTTP ${response.status}`); return response.json(); })
        .then((data) => {
          if (!disposed && map.getStyle().layers) nightLightsUpdaterRef.current = installNightLights(map, data);
          const currentLook = renderLookRef.current;
          const sun = getSunPosition(currentLook.time);
          nightLightsUpdaterRef.current?.(sun.nightFactor, currentLook.theme);
        })
        .catch((error) => console.warn('Named OSM landmark glow is unavailable:', error));

      oceanUpdaterRef.current = installOcean(map);

      map.on('click', cbdBuildingLayerId, (event) => {
        const feature = event.features?.[0];
        const properties = feature?.properties;
        if (!feature || !properties) return;
        const content = document.createElement('div');
        content.className = 'building-popup';
        const title = document.createElement('strong');
        title.textContent = String(properties.osm_name ?? properties.building ?? 'Building');
        const height = document.createElement('span');
        height.textContent = `Height: ${Number(properties.height).toFixed(1)} m`;
        const provenance = document.createElement('span');
        provenance.textContent = `Height source: ${String(properties.height_source_detail ?? properties.height_source)}`;
        content.append(title, height, provenance);
        popup.setLngLat(event.lngLat).setDOMContent(content).addTo(map);
      });
      map.on('mouseenter', cbdBuildingLayerId, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', cbdBuildingLayerId, () => { map.getCanvas().style.cursor = ''; });
      const currentLook = renderLookRef.current;
      const sun = getSunPosition(currentLook.time);
      applyLook(map, currentLook);
      oceanUpdaterRef.current?.(currentLook, qualityRef.current);
      appliedLookKeyRef.current = `${currentLook.time.getTime()}|${currentLook.theme}|${currentLook.seaOn}|${currentLook.quality}`;
      shadowsRef.current?.update(currentLook);
      nightLightsUpdaterRef.current?.(sun.nightFactor, currentLook.theme);
    });

    map.on('error', (event) => {
      if (disposed) return;
      const reason = event.error?.message;
      if (reason?.includes('cbd-buildings.geojson')) {
        setMapError(reason ? `CBD building data failed to load: ${reason}` : 'CBD building data failed to load.');
        return;
      }
      if (reason?.includes(cbdBuildingLayerId)) {
        setMapError(reason ? `CBD extrusion layer failed to load: ${reason}` : 'CBD extrusion layer failed to load.');
        return;
      }
      if (map.isStyleLoaded()) return;
      setMapError(reason ? `Basemap error: ${reason}` : 'The basemap could not load. Check your connection and try again.');
    });

    return () => {
      disposed = true;
      stopQuality();
      shadowsRef.current?.remove();
      nightLightsUpdaterRef.current = null;
      oceanUpdaterRef.current = null;
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const resetView = () => {
    mapRef.current?.flyTo({ ...INITIAL_VIEW, duration: 850, essential: true });
  };

  const selectStory = (index: number) => {
    const story = cityStories[index];
    setActiveStory(story);
    mapRef.current?.setPaintProperty('dar-story-halos', 'circle-radius', ['case', ['==', ['get', 'id'], story.id], 12, 8]);
    const params = new URLSearchParams(window.location.search);
    params.set('tour', story.id);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
    mapRef.current?.flyTo({ center: story.coordinates, zoom: 16.4, pitch: 64, bearing: -18, duration: 1500, essential: true });
  };
  const closeStory = () => {
    setActiveStory(null);
    const params = new URLSearchParams(window.location.search);
    params.delete('tour');
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
  };
  return (
    <main className="app-shell">
      <div className="map-viewport">
        <div ref={mapContainer} className="map-canvas" aria-label="Map of Dar es Salaam" />
      </div>
      {mapError && (
        <div className="map-error" role="alert">
          <strong>Map unavailable</strong>
          <span>{mapError}</span>
        </div>
      )}

      <header className="map-header">
        <a className="brand" href="#home" aria-label="Dar es Salaam map home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-copy">
            <span className="brand-name">DAR ES SALAAM</span>
            <span className="brand-caption">CITY ATLAS · TANZANIA</span>
          </span>
        </a>
        <div className="header-status"><span className="status-dot" /> THREE.JS SCENE</div>
      </header>

      <section className="place-card" aria-labelledby="place-title">
        <p className="eyebrow">TANZANIA · CENTRAL BUSINESS DISTRICT</p>
        <h1 id="place-title">Central Dar es Salaam</h1>
        <p className="place-description">Explore the CBD in 3D. Building heights show their OSM source or are marked as estimates.</p>
        <div className="card-divider" />
        <div className="place-meta">
          <div><span className="meta-label">VIEW CENTER</span><span className="meta-value">Central Dar es Salaam</span></div>
          <button className="reset-button" type="button" onClick={resetView} aria-label="Reset map view">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.3 7.1A6.2 6.2 0 1 1 3.8 11M4.2 3.8v3.7h3.7" /></svg>
            <span>Reset view</span>
          </button>
        </div>
      </section>

      <aside className="map-note" aria-label="CBD building and height coverage">
        <span className="note-kicker">CBD BUILDING HEIGHTS</span>
        {buildingSummary ? (
          <>
            <strong className="building-count">{buildingSummary.total_buildings.toLocaleString()} footprints</strong>
            <div className="height-coverage-row"><span className="coverage-swatch osm-swatch" />
              <span>OSM-sourced · {buildingSummary.height_source_percent.osm}% ({buildingSummary.height_details.explicit_osm_height.toLocaleString()} explicit heights, {buildingSummary.height_details.osm_levels_derived.toLocaleString()} level-derived)</span>
            </div>
            <div className="height-coverage-row"><span className="coverage-swatch estimated-swatch" />
              <span>Type-estimated · {buildingSummary.height_source_percent.estimated}% ({buildingSummary.height_details.type_estimated.toLocaleString()})</span>
            </div>
            <span className="coverage-footnote">OSM levels use a 3.2 m per level conversion.</span>
          </>
        ) : <span className="note-copy">Loading CBD building coverage…</span>}
      </aside>

      <LookPanel look={look} onChange={updateLook} fps={fps} activeQuality={activeQuality} />

      <StoryTour story={activeStory} index={Math.max(0, cityStories.findIndex((story) => story.id === activeStory?.id))} onSelect={selectStory} onClose={closeStory} />

      <footer className="map-attribution">
        <span>Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></span>
        <span>Basemap by <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a></span>
      </footer>
    </main>
  );
}

export default App;
