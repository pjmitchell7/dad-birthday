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
  const duration = 35, span = 128, cruise = 17, ramp = 2.2;
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
    skid: new THREE.MeshBasicMaterial({ color: 0x1a1c1e, transparent: true, opacity: .58, depthWrite: false }),
    smoke: new THREE.MeshBasicMaterial({ color: 0xdde4ea, transparent: true, opacity: .36, depthWrite: false }),
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
  // Dynamic tire skid mark system along asphalt
  const skidCount = 64;
  const skids = instances(new THREE.BoxGeometry(.22, .004, .76), materials.skid, skidCount, 'Tire skid marks');
  const skidData = Array.from({ length: skidCount }, () => ({ active: false, x: 0, roadDist: 0, initialZ: 0, yaw: 0 }));
  let skidHead = 0, lastSkidDist = 0;

  function recordSkid(xOffset) {
    const rec = skidData[skidHead];
    skidHead = (skidHead + 1) % skidCount;
    rec.active = true;
    rec.x = car.group.position.x + Math.cos(yawAngle) * xOffset;
    rec.roadDist = currentRoadDistance;
    rec.initialZ = -1.46 + Math.sin(yawAngle) * xOffset;
    rec.yaw = yawAngle;
  }

  function updateSkids(distance) {
    for (let i = 0; i < skidCount; i++) {
      const rec = skidData[i];
      if (!rec.active) {
        place(skids, i, 0, -10, 0, 0, 0, 0);
        continue;
      }
      const ageDist = distance - rec.roadDist;
      if (ageDist > 28 || ageDist < -1) {
        rec.active = false;
        place(skids, i, 0, -10, 0, 0, 0, 0);
      } else {
        const z = rec.initialZ - ageDist;
        const scale = THREE.MathUtils.clamp(1 - ageDist / 28, 0, 1);
        place(skids, i, rec.x, .058, z, scale, 1, 1, rec.yaw);
      }
    }
    skids.instanceMatrix.needsUpdate = true;
  }

  // Tire smoke particle pool
  const smokeCount = 20;
  const smokeGroup = new THREE.Group(); smokeGroup.name = 'Tire drift smoke'; group.add(smokeGroup);
  const smokeGeo = new THREE.SphereGeometry(.2, 7, 5);
  const smokeParticles = [];
  for (let i = 0; i < smokeCount; i++) {
    const mesh = new THREE.Mesh(smokeGeo, materials.smoke.clone());
    mesh.visible = false;
    smokeGroup.add(mesh);
    smokeParticles.push({ mesh, active: false, life: 0, maxLife: .65, maxScale: 1.6, vx: 0, vy: 0, vz: 0 });
  }

  function emitSmoke(sideOffset) {
    const p = smokeParticles.find(item => !item.active) || smokeParticles[skidHead % smokeCount];
    p.active = true;
    p.life = 0;
    p.maxLife = .42 + random() * .32;
    p.maxScale = 1.3 + random() * .7;
    p.mesh.position.set(
      car.group.position.x + sideOffset * .88 + (random() - .5) * .2,
      .13,
      -1.46 + (random() - .5) * .3
    );
    p.vx = (random() - .5) * .7 - steer * .35;
    p.vy = .35 + random() * .4;
    p.vz = -cruise * .26 + (random() - .5) * 1.5;
    p.mesh.scale.setScalar(.32);
    p.mesh.material.opacity = .35;
    p.mesh.visible = true;
  }

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
    updateSkids(distance);
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

  // Drift, steering and 360 spin state
  let targetSteer = 0;
  let steer = 0;
  let lateralX = 0;
  let yawAngle = 0;
  let rollAngle = 0;
  let lastT = 0;
  let currentRoadDistance = 0;
  let hardDriftTime = 0;
  let lastSteerInput = 0;
  let spinState = 'idle';
  let spinProgress = 0;
  let spinDirection = 1;
  const spinDuration = 1.15;
  let spinCooldown = 0;
  let onSpinComplete = null;
  let onSpinStart = null;

  function trigger360(dir) {
    if (spinState === 'spinning') return;
    spinState = 'spinning';
    spinProgress = 0;
    spinDirection = dir !== undefined ? Math.sign(dir) || 1 : (targetSteer >= 0 ? 1 : -1);
    hardDriftTime = 0;
    onSpinStart?.();
  }

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
    for (const wheel of (car.wheels || [])) wheel.rotation.order = 'YXZ';
    group.add(car.group); car.group.position.set(0, .061, 0); car.group.rotation.set(0, 0, 0); car.group.scale.setScalar(1); car.group.visible = true;
    car.group.add(dad.group); dad.group.scale.setScalar(.66); dad.group.rotation.set(0, 0, 0); dad.group.visible = true;
    const seat = car.group.userData.driverPosition?.clone() || new THREE.Vector3(-.4, .776, -.28);
    const offset = dad.group.userData.drivingHipOffset;
    const hips = offset?.isVector3 ? offset.clone() : new THREE.Vector3(...(offset || [0, 1.307146, -.004381]));
    dad.group.position.copy(seat).sub(hips.multiplyScalar(.66));
    targetSteer = 0; steer = 0; lateralX = 0; yawAngle = 0; rollAngle = 0; lastT = 0;
    hardDriftTime = 0; lastSteerInput = 0; spinState = 'idle'; spinProgress = 0; spinCooldown = 0;
    for (const p of smokeParticles) { p.active = false; p.mesh.visible = false; }
    for (const s of skidData) { s.active = false; }
    updateSkids(0);
    active = true; group.visible = true; update(0);
  }

  function update(elapsed = 0) {
    if (!active) return;
    const t = THREE.MathUtils.clamp(elapsed, 0, duration), u = Math.min(1, t / ramp);
    const dt = Math.min(.1, Math.max(.001, t - lastT));
    lastT = t;
    const distance = reduced ? 0 : cruise * (t < ramp ? ramp * (u ** 3 - .5 * u ** 4) : t - ramp / 2);
    currentRoadDistance = distance;
    animationTime = reduced ? 0 : t;
    if (spinCooldown > 0) spinCooldown = Math.max(0, spinCooldown - dt);

    // 360 Spin trigger detection (requires hard, decisive action: fast violent flick OR sustained hard drift)
    if (!reduced && spinState === 'idle' && spinCooldown <= 0 && t > ramp * .6) {
      if (Math.abs(targetSteer) >= .92) {
        hardDriftTime += dt;
        if (hardDriftTime >= .95) trigger360(targetSteer >= 0 ? 1 : -1);
      } else {
        hardDriftTime = Math.max(0, hardDriftTime - dt * 2.5);
      }
      const steerDelta = Math.abs(targetSteer - lastSteerInput);
      const steerRate = steerDelta / dt;
      if (steerRate > 6.0 && Math.abs(targetSteer) >= .92) {
        trigger360(targetSteer >= 0 ? 1 : -1);
      }
      lastSteerInput = targetSteer;
    }

    let pulse = 0;
    if (spinState === 'spinning') {
      spinProgress += dt / spinDuration;
      const prog = THREE.MathUtils.clamp(spinProgress, 0, 1);
      const eased = prog * prog * (3 - 2 * prog);
      const spinAngle = (spinDirection >= 0 ? -1 : 1) * Math.PI * 2 * eased;
      yawAngle = spinAngle;
      lateralX = THREE.MathUtils.clamp(lateralX + Math.sin(eased * Math.PI) * spinDirection * dt * 1.6, -3.3, 3.3);
      if (prog >= .22 && prog <= .85) pulse = Math.max(pulse, .98);
      if (prog >= 1) {
        spinState = 'idle';
        spinProgress = 0;
        spinCooldown = 2.0;
        yawAngle = 0;
        onSpinComplete?.();
      }
    } else {
      steer = THREE.MathUtils.damp(steer, targetSteer, 7.5, dt);
      if (targetSteer === 0) {
        lateralX = THREE.MathUtils.damp(lateralX, 0, 4.5, dt);
        yawAngle = THREE.MathUtils.damp(yawAngle, 0, 7.0, dt);
        rollAngle = THREE.MathUtils.damp(rollAngle, 0, 8.0, dt);
      } else {
        const targetX = steer * 3.3;
        lateralX = THREE.MathUtils.damp(lateralX, targetX, 5.0, dt);
        const targetYaw = steer * .42;
        yawAngle = THREE.MathUtils.damp(yawAngle, targetYaw, 6.5, dt);
        rollAngle = THREE.MathUtils.damp(rollAngle, -steer * .05, 6.0, dt);
      }
    }

    // Front wheel countersteering
    if (car.wheels && car.wheels.length >= 4) {
      const counterAngle = spinState === 'spinning' ? -spinDirection * .45 : -steer * .38;
      car.wheels[0].rotation.y = counterAngle;
      car.wheels[2].rotation.y = counterAngle;
    }

    moveRoad(distance);

    car.group.position.x = (reduced ? 0 : Math.sin(t * .55) * .085) + (reduced ? 0 : lateralX);
    car.group.position.y = .061 + (reduced ? 0 : Math.sin(t * 4.8) * .003);
    car.group.rotation.y = reduced ? 0 : yawAngle;
    car.group.rotation.z = (reduced ? 0 : Math.sin(t * .55) * -.004) + (reduced ? 0 : rollAngle);
    car.animate?.(reduced ? 0 : 1, distance);

    // Dynamic skid marks & tire smoke
    const isDriftingHard = Math.abs(steer) > .32 || spinState === 'spinning';
    if (!reduced && isDriftingHard && t > ramp * .6) {
      if (Math.abs(distance - lastSkidDist) > .52) {
        recordSkid(-.91);
        recordSkid(.91);
        lastSkidDist = distance;
      }
      emitSmoke(-1);
      emitSmoke(1);
    }

    // Update active smoke puffs
    for (const p of smokeParticles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      const frac = p.life / p.maxLife;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.scale.setScalar(.32 + frac * (p.maxScale - .32));
      p.mesh.material.opacity = (1 - frac) * .36;
    }

    flames.position.copy(car.group.position); flames.quaternion.copy(car.group.quaternion);
    if (!reduced) for (const when of [3.10, 7.5, 12.2, 17.8, 23.4, 29.1]) {
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
    savedWheels.forEach(([wheel, quaternion]) => {
      wheel.quaternion.copy(quaternion);
      wheel.rotation.order = 'XYZ';
    });
    for (const p of smokeParticles) { p.active = false; p.mesh.visible = false; }
    for (const s of skidData) { s.active = false; }
    updateSkids(0);
    active = false; group.visible = false; flames.visible = false; animationTime = 0;
  }

  return {
    group, cameraPosition, cameraTarget, duration, start, update, stop,
    steer(amount) {
      if (amount !== undefined) targetSteer = THREE.MathUtils.clamp(amount, -1, 1);
      return steer;
    },
    trigger360,
    resetDrift() { targetSteer = 0; steer = 0; lateralX = 0; yawAngle = 0; rollAngle = 0; spinState = 'idle'; spinProgress = 0; },
    get currentSteer() { return steer; },
    get isDrifting() { return Math.abs(steer) > .25; },
    get isSpinning() { return spinState === 'spinning'; },
    get lateralX() { return lateralX; },
    get yawAngle() { return yawAngle; },
    get onSpinComplete() { return onSpinComplete; },
    set onSpinComplete(fn) { onSpinComplete = fn; },
    get onSpinStart() { return onSpinStart; },
    set onSpinStart(fn) { onSpinStart = fn; },
    pose: 'driving', get animationTime() { return animationTime; },
    get active() { return active; },
    backgroundColor: new THREE.Color('#b9dce9'), fogColor: new THREE.Color('#c5dde2'),
  };
}
