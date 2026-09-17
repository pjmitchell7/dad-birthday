import * as THREE from 'three';

/**
 * Existing-car highway vignette. Add group to the scene once, then call start().
 * Parent supplies its own Dad animation via pose/animationTime and ends at duration.
 * stop() restores both original parents, local transforms, visibility and wheel rotations.
 * Keep the vignette visible beneath an ending card; call stop() when returning home.
 */
export function createHighwayScene({ car, dad, reduced = false } = {}) {
  if (!car?.group || !dad?.group) throw new TypeError('The highway needs the existing car and Dad.');
  const group = new THREE.Group(); group.name = 'Sunny highway drive'; group.visible = false;
  const cameraPosition = new THREE.Vector3(.32, 10.25, 4.8);
  const cameraTarget = new THREE.Vector3(0, .4, -.05);
  const duration = 14, span = 128, cruise = 17, ramp = 2.2;
  let active = false, savedCar = null, savedDad = null, savedWheels = [], animationTime = 0;
  let seed = 981;
  const random = () => { seed = Math.imul(1664525, seed) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
  const matrix = new THREE.Object3D(), color = new THREE.Color();
  const materials = {
    asphalt: new THREE.MeshStandardMaterial({ color: 0x686d71, roughness: .98 }),
    paint: new THREE.MeshStandardMaterial({ color: 0xf1efe3, roughness: .87 }),
    gravel: new THREE.MeshStandardMaterial({ color: 0xb7ac92, roughness: 1 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x80966b, roughness: 1 }),
    rail: new THREE.MeshStandardMaterial({ color: 0xbcc4c5, metalness: .55, roughness: .45 }),
    bark: new THREE.MeshStandardMaterial({ color: 0x6f6251, roughness: 1 }),
    leaves: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
    post: new THREE.MeshStandardMaterial({ color: 0xe6e5d6, roughness: .8 }),
    reflector: new THREE.MeshStandardMaterial({ color: 0xfaa365, emissive: 0xc96224, emissiveIntensity: .15, roughness: .5 }),
  };
  function add(geometry, material) {
    const object = new THREE.Mesh(geometry, material); object.receiveShadow = true; group.add(object); return object;
  }
  function box(w, h, d, x, y, z, material) {
    const object = add(new THREE.BoxGeometry(w, h, d), material); object.position.set(x, y, z); return object;
  }
  function instances(geometry, material, count, name, castShadow = false) {
    const object = new THREE.InstancedMesh(geometry, material, count);
    object.name = name; object.castShadow = castShadow; object.receiveShadow = true;
    object.instanceMatrix.setUsage(THREE.DynamicDrawUsage); object.frustumCulled = false; group.add(object); return object;
  }
  function place(object, i, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) {
    matrix.position.set(x, y, z); matrix.rotation.set(0, ry, 0); matrix.scale.set(sx, sy, sz); matrix.updateMatrix(); object.setMatrixAt(i, matrix.matrix);
  }

  // Fine, low-contrast aggregate is procedural and repeats without visible joints.
  const texSize = 128, aggregate = new Uint8Array(texSize * texSize * 4);
  for (let i = 0; i < texSize * texSize; i++) {
    const shade = Math.round(202 + random() * 24); aggregate[i * 4] = aggregate[i * 4 + 1] = aggregate[i * 4 + 2] = shade; aggregate[i * 4 + 3] = 255;
  }
  const asphaltMap = new THREE.DataTexture(aggregate, texSize, texSize, THREE.RGBAFormat);
  asphaltMap.colorSpace = THREE.SRGBColorSpace; asphaltMap.wrapS = asphaltMap.wrapT = THREE.RepeatWrapping;
  asphaltMap.repeat.set(9, 110); asphaltMap.magFilter = THREE.LinearFilter; asphaltMap.minFilter = THREE.LinearFilter; asphaltMap.needsUpdate = true;
  materials.asphalt.map = asphaltMap;
  box(140, .12, 180, 0, -.067, 0, materials.grass);
  box(14.1, .035, span, 0, .005, 0, materials.gravel);
  box(10.8, .055, span, 0, .0275, 0, materials.asphalt);
  for (const side of [-1, 1]) {
    box(.10, .004, span, side * 5.02, .059, 0, materials.paint);
    // Two continuous steel folds read as a guardrail from the overhead angle.
    const rail = box(.10, .19, span, side * 6.56, .77, 0, materials.rail); rail.castShadow = true;
    box(.13, .045, span, side * 6.56, .835, 0, materials.rail);
  }
  const marks = instances(new THREE.BoxGeometry(.13, .007, 2.55), materials.paint, 44, 'Moving lane dashes');
  const railPosts = instances(new THREE.BoxGeometry(.10, .78, .12), materials.rail, 64, 'Guardrail supports');
  const guidePosts = instances(new THREE.BoxGeometry(.09, .91, .12), materials.post, 32, 'Roadside guide posts');
  const reflectors = instances(new THREE.BoxGeometry(.013, .13, .13), materials.reflector, 32, 'Amber edge reflectors');
  const trunks = instances(new THREE.CylinderGeometry(.12, .22, 1, 9), materials.bark, 32, 'Passing tree trunks', true);
  const crowns = instances(new THREE.SphereGeometry(1, 10, 7), materials.leaves, 96, 'Passing tree crowns', true);
  const trees = [];
  for (let side = -1; side <= 1; side += 2) for (let i = 0; i < 16; i++) {
    const height = 2.4 + random() * 2.0;
    trees.push({ x: side * (10.0 + random() * 5.2), z: i * 8 + random() * 3, height, radius: 1.15 + random() * .65, turn: random() * Math.PI });
    for (let crown = 0; crown < 3; crown++) {
      color.setHSL(.235 + random() * .07, .25 + random() * .15, .25 + random() * .11); crowns.setColorAt((trees.length - 1) * 3 + crown, color);
    }
  }
  crowns.instanceColor.needsUpdate = true;
  const roadside = [marks, railPosts, guidePosts, reflectors, trunks, crowns];
  function wrap(z, distance) { return ((z - distance + span / 2) % span + span) % span - span / 2; }
  function moveRoad(distance) {
    for (let side = -1; side <= 1; side += 2) {
      const row = side < 0 ? 0 : 1;
      for (let i = 0; i < 22; i++) place(marks, row * 22 + i, side * 1.8, .061, wrap(i * span / 22, distance));
      for (let i = 0; i < 32; i++) place(railPosts, row * 32 + i, side * 6.59, .39, wrap(i * 4, distance));
      for (let i = 0; i < 16; i++) {
        const z = wrap(i * 8 + 2, distance); place(guidePosts, row * 16 + i, side * 7.12, .47, z); place(reflectors, row * 16 + i, side * 7.065, .75, z);
      }
    }
    trees.forEach((tree, i) => {
      const z = wrap(tree.z, distance); place(trunks, i, tree.x, tree.height * .31, z, 1, tree.height * .62, 1, tree.turn);
      place(crowns, i * 3, tree.x, tree.height * .83, z, tree.radius, tree.height * .41, tree.radius * .88, tree.turn);
      place(crowns, i * 3 + 1, tree.x - .63, tree.height * .63, z + .37, tree.radius * .75, tree.height * .28, tree.radius * .82, tree.turn + .7);
      place(crowns, i * 3 + 2, tree.x + .55, tree.height * .68, z - .42, tree.radius * .73, tree.height * .32, tree.radius * .75, tree.turn - .4);
    });
    roadside.forEach(object => { object.instanceMatrix.needsUpdate = true; });
    asphaltMap.offset.y = -distance / span * asphaltMap.repeat.y;
  }
  moveRoad(0);

  // Short twin exhaust bursts use smooth flame surfaces, with no particle emitter.
  const flames = new THREE.Group(); flames.name = 'Brief twin exhaust flames'; group.add(flames);
  function flameGeometry(length, radius) {
    const vertices = [], indices = [], rows = 8, segments = 12;
    for (let j = 0; j <= rows; j++) {
      const t = j / rows, r = radius * Math.pow(Math.max(0, 1 - t), .55) * (.48 + Math.sin(t * Math.PI) * .52);
      for (let i = 0; i <= segments; i++) {
        const angle = i / segments * Math.PI * 2;
        vertices.push(Math.cos(angle) * r, Math.sin(angle) * r + Math.sin(t * Math.PI) * .025, -t * length);
        if (j < rows && i < segments) { const a = j * (segments + 1) + i, b = a + segments + 1; indices.push(a, b, a + 1, a + 1, b, b + 1); }
      }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
  }
  const flameMaterials = [
    new THREE.MeshBasicMaterial({ color: 0x59bfff, transparent: true, opacity: .62, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
    new THREE.MeshBasicMaterial({ color: 0xffad4b, transparent: true, opacity: .80, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
    new THREE.MeshBasicMaterial({ color: 0xe0f6ff, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
  ];
  const flameGeometries = [flameGeometry(.91, .102), flameGeometry(.58, .065), flameGeometry(.27, .034)];
  const outlets = [];
  for (const side of [-1, 1]) {
    const outlet = new THREE.Group(); outlet.position.set(side * .64, .270, -2.47); flames.add(outlet); outlets.push(outlet);
    for (let i = 0; i < 3; i++) outlet.add(new THREE.Mesh(flameGeometries[i], flameMaterials[i]));
  }
  flames.visible = false;

  function snapshot(object) {
    return { parent: object.parent, position: object.position.clone(), quaternion: object.quaternion.clone(), scale: object.scale.clone(), visible: object.visible };
  }
  function restore(object, saved) {
    if (saved.parent) saved.parent.add(object); else object.removeFromParent();
    object.position.copy(saved.position); object.quaternion.copy(saved.quaternion); object.scale.copy(saved.scale); object.visible = saved.visible;
  }
  function start() {
    if (active) stop();
    savedCar = snapshot(car.group); savedDad = snapshot(dad.group);
    savedWheels = (car.wheels || []).map(wheel => [wheel, wheel.quaternion.clone()]);
    group.add(car.group); car.group.position.set(0, .061, 0); car.group.rotation.set(0, 0, 0); car.group.scale.setScalar(1); car.group.visible = true;
    car.group.add(dad.group); dad.group.scale.setScalar(.66); dad.group.rotation.set(0, 0, 0); dad.group.visible = true;
    const seat = car.group.userData.driverPosition?.clone() || new THREE.Vector3(-.4, .776, -.28);
    const offset = dad.group.userData.drivingHipOffset;
    const hips = offset?.isVector3 ? offset.clone() : new THREE.Vector3(...(offset || [0, 1.307146, -.004381]));
    dad.group.position.copy(seat).sub(hips.multiplyScalar(.66));
    active = true; group.visible = true; update(0);
  }
  function update(elapsed = 0) {
    if (!active) return;
    const t = THREE.MathUtils.clamp(elapsed, 0, duration), u = Math.min(1, t / ramp);
    const distance = reduced ? 0 : cruise * (t < ramp ? ramp * (u ** 3 - .5 * u ** 4) : t - ramp / 2);
    animationTime = reduced ? 0 : t;
    moveRoad(distance);
    car.group.position.x = reduced ? 0 : Math.sin(t * .55) * .085;
    car.group.position.y = .061 + (reduced ? 0 : Math.sin(t * 4.8) * .003);
    car.group.rotation.z = reduced ? 0 : Math.sin(t * .55) * -.004;
    car.animate?.(reduced ? 0 : 1, distance);
    flames.position.copy(car.group.position); flames.quaternion.copy(car.group.quaternion);
    let pulse = 0;
    if (!reduced) for (const when of [3.10, 6.65, 10.10, 12.35]) {
      const age = t - when; if (age >= 0 && age < .34) pulse = Math.max(pulse, Math.sin(age / .34 * Math.PI));
    }
    flames.visible = pulse > .035;
    outlets.forEach((outlet, i) => { outlet.scale.set(.64 + pulse * .36, .64 + pulse * .36, pulse * (.86 + .14 * Math.sin(t * 70 + i))); });
    cameraPosition.set(.32 + (reduced ? 0 : Math.sin(t * .28) * .06), 10.25, 4.8);
  }
  function stop() {
    if (!active) { group.visible = false; return; }
    // Restore Dad first even if his saved parent was the car itself.
    restore(dad.group, savedDad); restore(car.group, savedCar);
    savedWheels.forEach(([wheel, quaternion]) => wheel.quaternion.copy(quaternion));
    active = false; group.visible = false; flames.visible = false; animationTime = 0;
  }
  return {
    group, cameraPosition, cameraTarget, duration, start, update, stop,
    pose: 'driving', get animationTime() { return animationTime; },
    get active() { return active; },
    backgroundColor: new THREE.Color('#b9dce9'), fogColor: new THREE.Color('#c5dde2'),
  };
}
