import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Batch static leaf meshes by material, keeping designated moving subtrees intact.
 * Geometry is copied into root-local coordinates. Call before rendering; source
 * geometries are not disposed because another object may share them.
 * dropUVs is useful for untextured procedural assets with mixed geometry schemas.
 */
export function mergeStaticChildren(root, { preserve = [], dropUVs = false } = {}) {
  root.updateWorldMatrix(true, true);
  const excluded = new Set(preserve), buckets = new Map();
  const inverse = root.matrixWorld.clone().invert();
  function visit(object) {
    if (!object.visible) return;
    if (object !== root && excluded.has(object)) return;
    if (object.isMesh && !object.isSkinnedMesh && !object.isInstancedMesh &&
        object.children.length === 0 && !Array.isArray(object.material) &&
        !Object.keys(object.geometry.morphAttributes).length && object.visible &&
        !object.material.transparent) {
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      if (dropUVs) { geometry.deleteAttribute('uv'); geometry.deleteAttribute('uv1'); }
      const attributes = Object.entries(geometry.attributes).map(([name, attr]) => `${name}:${attr.itemSize}:${attr.normalized}:${attr.array.constructor.name}`).sort().join('|');
      const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}:${object.renderOrder}:${object.layers.mask}:${attributes}`;
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
      if (!buckets.has(key)) buckets.set(key, { geometry: [], objects: [], material: object.material });
      const bucket = buckets.get(key); bucket.geometry.push(geometry); bucket.objects.push(object);
    }
    for (const child of object.children) visit(child);
  }
  visit(root);
  let mergedMeshes = 0, removedMeshes = 0;
  for (const bucket of buckets.values()) {
    if (bucket.objects.length < 2) { bucket.geometry.forEach(g => g.dispose()); continue; }
    const geometry = mergeGeometries(bucket.geometry, false);
    bucket.geometry.forEach(g => g.dispose());
    if (!geometry) continue;
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const first = bucket.objects[0], combined = new THREE.Mesh(geometry, bucket.material);
    combined.name = `Batched ${first.material.name || first.material.type}`;
    combined.castShadow = first.castShadow; combined.receiveShadow = first.receiveShadow;
    combined.renderOrder = first.renderOrder; combined.layers.mask = first.layers.mask;
    root.add(combined);
    for (const object of bucket.objects) object.removeFromParent();
    mergedMeshes++; removedMeshes += bucket.objects.length;
  }
  return { mergedMeshes, removedMeshes, savedDrawCalls: removedMeshes - mergedMeshes };
}
