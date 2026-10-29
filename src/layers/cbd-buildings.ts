import type { FillExtrusionLayerSpecification } from 'maplibre-gl';

export const cbdBuildingSourceId = 'cbd-buildings';
export const cbdBuildingLayerId = 'cbd-buildings-3d';

export const cbdBuildingsLayer: FillExtrusionLayerSpecification = {
  id: cbdBuildingLayerId,
  type: 'fill-extrusion',
  source: cbdBuildingSourceId,
  minzoom: 14,
  paint: {
    'fill-extrusion-height': ['get', 'height'],
    'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
    'fill-extrusion-color': [
      'match', ['get', 'height_source'],
      'estimated', ['interpolate', ['linear'], ['get', 'height'],
        3, '#c4cec7',
        8, '#aabbb0',
        16, '#90a498',
        32, '#748b7e',
        80, '#5c7569',
        180, '#465f54',
      ],
      'landmark', '#e49757',
      ['interpolate', ['linear'], ['get', 'height'],
        3, '#e0cfb4',
        8, '#d1b390',
        16, '#b99176',
        32, '#937a70',
        80, '#6d7475',
        180, '#505e63',
      ],
    ],
    'fill-extrusion-opacity': 0.94,
    'fill-extrusion-vertical-gradient': true,
  },
};
