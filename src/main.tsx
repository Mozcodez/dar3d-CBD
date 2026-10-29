import ReactDOM from 'react-dom/client';
import { StrictMode } from 'react';
import { setWorkerUrl } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import App from './App';
import './styles.css';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(mapWorkerUrl);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
