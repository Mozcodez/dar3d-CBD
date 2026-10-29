import * as THREE from 'three';
import {
  MercatorCoordinate,
  type CustomLayerInterface,
  type Map as MapLibreMap,
} from 'maplibre-gl';

/** A small Three.js beacon that shares MapLibre's WebGL context and camera. */
export class ThreeFocusLayer implements CustomLayerInterface {
  id = 'three-focus-beacon';
  type = 'custom' as const;
  renderingMode = '3d' as const;

  private renderer?: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly group = new THREE.Group();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  onAdd(map: MapLibreMap, gl: WebGL2RenderingContext) {
    const origin = MercatorCoordinate.fromLngLat([39.28, -6.818], 2);
    const metersToMercator = origin.meterInMercatorCoordinateUnits();
    this.group.position.set(origin.x, origin.y, origin.z);
    this.group.scale.set(metersToMercator, -metersToMercator, metersToMercator);

    const haloGeometry = new THREE.TorusGeometry(44, 2.2, 8, 56);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: '#d77a42',
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.position.z = 1;

    const coreGeometry = new THREE.SphereGeometry(12, 20, 14);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: '#f1a46a' });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.z = 18;

    this.geometries.push(haloGeometry, coreGeometry);
    this.materials.push(haloMaterial, coreMaterial);
    this.group.add(halo, core);
    this.scene.add(this.group);

    this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl });
    this.renderer.autoClear = false;
  }

  render(_gl: WebGL2RenderingContext, options: Parameters<NonNullable<CustomLayerInterface['render']>>[1]) {
    if (!this.renderer) return;
    this.camera.projectionMatrix.fromArray(options.defaultProjectionData.mainMatrix);
    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
  }

  onRemove() {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.renderer?.dispose();
    this.renderer = undefined;
  }
}
