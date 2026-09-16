import * as THREE from 'three';
import { mergeStaticChildren } from './mergeStaticChildren.js';

// Original, lightweight procedural car models. Forward is +Z; road height is 0.
export function createCar(kind = 'silver') {
  const blue = kind === 'blue';
  const group = new THREE.Group();
  group.name = blue ? 'Cobalt grand touring convertible' : 'Silver sports coupe';
  const wheels = [];
  const materials = {
    paint: new THREE.MeshStandardMaterial({ color: blue ? 0x1359df : 0xc9d0d7, metalness: .78, roughness: .25 }),
    paintDark: new THREE.MeshStandardMaterial({ color: blue ? 0x07369c : 0x88919b, metalness: .7, roughness: .3 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x1a3545, metalness: .65, roughness: .16 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: .89 }),
    black: new THREE.MeshStandardMaterial({ color: 0x151b22, roughness: .55 }),
    rim: new THREE.MeshStandardMaterial({ color: blue ? 0xdce6ed : 0x313841, metalness: .9, roughness: .22 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe6edf5, metalness: .92, roughness: .19 }),
    seam: new THREE.MeshStandardMaterial({ color: blue ? 0x093582 : 0x57616c, roughness: .6 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xdcc4a0, roughness: .77 }),
    soft: new THREE.MeshStandardMaterial({ color: 0x1a273f, roughness: .96 }),
    brake: new THREE.MeshStandardMaterial({ color: 0xc13431, roughness: .46, metalness: .3 }),
    headlight: new THREE.MeshStandardMaterial({ color: 0xe3f5ff, emissive: 0xbcdfff, emissiveIntensity: .45, metalness: .2, roughness: .15 }),
    taillight: new THREE.MeshStandardMaterial({ color: 0xad1027, emissive: 0xe61735, emissiveIntensity: .5, roughness: .23 }),
  };
  const mesh = (geometry, material, parent = group) => {
    const m = new THREE.Mesh(geometry, material); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  function ellipsoid(x, y, z, sx, sy, sz, material, parent = group, segments = 24) {
    const m = mesh(new THREE.SphereGeometry(1, segments, 12), material, parent);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m;
  }
  function tube(points, radius, material, closed = false, parent = group) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed);
    return mesh(new THREE.TubeGeometry(curve, Math.max(12, points.length * 5), radius, 6, closed), material, parent);
  }
  function patch(rows, material, parent = group) {
    const pos = [], indices = [], n = rows[0].length;
    rows.forEach(r => r.forEach(p => pos.push(...p)));
    for (let r = 0; r < rows.length - 1; r++) for (let c = 0; c < n - 1; c++) {
      const a = r * n + c; indices.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(indices); geo.computeVertexNormals();
    const mat = material.clone(); mat.side = THREE.DoubleSide; return mesh(geo, mat, parent);
  }
  function polygon(points, material, parent = group) {
    const pos = points.flat(), idx = [];
    for (let i = 1; i < points.length - 1; i++) idx.push(0, i, i + 1);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const mat = material.clone(); mat.side = THREE.DoubleSide; return mesh(geo, mat, parent);
  }
  function roundedBox(w, h, d, radius, material, position, parent = group) {
    // Extruded round-corner shapes keep the interior soft and toy-like.
    const x = -w / 2, y = -h / 2, r = Math.min(radius, w / 2, h / 2);
    const s = new THREE.Shape(); s.moveTo(x + r, y); s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, steps: 1, bevelEnabled: true, bevelSize: .014, bevelThickness: .014, bevelSegments: 2, curveSegments: 4 });
    g.translate(0, 0, -d / 2); const m = mesh(g, material, parent); m.position.set(...position); return m;
  }

  const length = blue ? 4.82 : 4.44;
  const half = length / 2;
  const wheelZ = blue ? [1.42, -1.46] : [1.28, -1.29];
  const bodySamples = blue ? [
    [-half, .58, .59, .78], [-2.16, .87, .79, .96], [-1.6, .95, .85, 1.0],
    [-.9, .91, .87, .98], [0, .90, .85, .98], [.73, .91, .91, 1.02],
    [1.45, .96, .87, .98], [2.04, .84, .72, .85], [half, .61, .52, .64]
  ] : [
    [-half, .61, .62, .78], [-1.94, .86, .82, .99], [-1.4, .98, .9, 1.06],
    [-.65, .93, .92, 1.04], [.1, .89, .85, .95], [.71, .93, .88, .98],
    [1.35, .96, .84, .92], [1.91, .81, .68, .78], [half, .56, .48, .59]
  ];
  const profiles = bodySamples.map(p => new THREE.Vector3(p[1], p[2], p[3]));
  function profile(z) {
    let i = 0; while (i < bodySamples.length - 2 && bodySamples[i + 1][0] < z) i++;
    const u = THREE.MathUtils.clamp((z - bodySamples[i][0]) / (bodySamples[i + 1][0] - bodySamples[i][0]), 0, 1);
    const t = u * u * (3 - 2 * u); return profiles[i].clone().lerp(profiles[i + 1], t);
  }
  // Each ring follows the hood crown, fender shoulder and rising wheel openings.
  const bodyRows = [];
  for (let j = 0; j <= 108; j++) {
    const z = -half + length * j / 108, p = profile(z), w = p.x, shoulder = p.y, top = p.z;
    let arch = .29;
    for (const wz of wheelZ) {
      const dz = Math.abs(z - wz), r = .455;
      if (dz < r) arch = Math.max(arch, .39 + Math.sqrt(r * r - dz * dz));
    }
    const low = Math.min(arch, shoulder - .035);
    const ring = [
      [0, .245, z], [-w * .78, .26, z], [-w * .965, low, z], [-w, (low + shoulder) / 2, z],
      [-w * .985, shoulder, z], [-w * .78, top - .024, z], [-w * .4, top + .012, z], [0, top + .025, z],
      [w * .4, top + .012, z], [w * .78, top - .024, z], [w * .985, shoulder, z],
      [w, (low + shoulder) / 2, z], [w * .965, low, z], [w * .78, .26, z], [0, .245, z]
    ];
    bodyRows.push(ring);
  }
  patch(bodyRows, materials.paint);
  polygon(bodyRows[0].slice(0, -1).reverse(), materials.paint);
  polygon(bodyRows[bodyRows.length - 1].slice(0, -1), materials.paint);
  // Dark wheel liners, raised painted wheel lips and continuous lower sills.
  for (const side of [-1, 1]) {
    for (const wz of wheelZ) {
      const archPoints = [];
      for (let i = 0; i <= 24; i++) {
        const a = Math.PI * i / 24, z = wz - Math.cos(a) * .44;
        archPoints.push([side * profile(z).x * .997, .39 + Math.sin(a) * .443, z]);
      }
      tube(archPoints, .027, materials.paint);
      ellipsoid(side * .835, .415, wz, .10, .405, .414, materials.black);
    }
    tube([[side * .84, .31, wheelZ[1] + .42], [side * .93, .30, 0], [side * .86, .31, wheelZ[0] - .43]], .055, materials.paintDark);
  }

  function makeWheel(side, z) {
    const wheel = new THREE.Group(); wheel.position.set(side * .91, .38, z); group.add(wheel); wheels.push(wheel);
    // Tire cylinders and rings have their axle along X.
    const tire = mesh(new THREE.CylinderGeometry(.38, .38, .225, 32, 1), materials.rubber, wheel); tire.rotation.z = Math.PI / 2;
    for (const x of [-.105, .105]) {
      const sidewall = mesh(new THREE.TorusGeometry(.305, .072, 8, 32), materials.rubber, wheel); sidewall.rotation.y = Math.PI / 2; sidewall.position.x = x;
    }
    const outside = side * .123;
    const disc = mesh(new THREE.CylinderGeometry(.278, .278, .022, 32), materials.black, wheel); disc.rotation.z = Math.PI / 2; disc.position.x = outside;
    const brakeDisc = mesh(new THREE.CylinderGeometry(.225, .225, .026, 24), materials.chrome, wheel); brakeDisc.rotation.z = Math.PI / 2; brakeDisc.position.x = outside + side * .006;
    const caliper = roundedBox(.07, .16, .055, .022, materials.brake, [outside + side * .025, .035, -.17], wheel); caliper.rotation.y = Math.PI / 2;
    const rimRing = mesh(new THREE.TorusGeometry(.272, .022, 8, 32), materials.rim, wheel); rimRing.rotation.y = Math.PI / 2; rimRing.position.x = outside + side * .025;
    const spokes = blue ? 10 : 5;
    for (let i = 0; i < spokes; i++) {
      const a = i * 2 * Math.PI / spokes;
      const spoke = mesh(new THREE.BoxGeometry(.033, blue ? .035 : .060, .23), materials.rim, wheel);
      spoke.position.set(outside + side * .042, Math.sin(a) * .133, Math.cos(a) * .133); spoke.rotation.x = -a;
      if (blue) {
        const paired = mesh(new THREE.BoxGeometry(.027, .016, .195), materials.rim, wheel);
        paired.position.set(outside + side * .045, Math.sin(a + .055) * .14, Math.cos(a + .055) * .14); paired.rotation.x = -a - .055;
      }
    }
    const hub = mesh(new THREE.CylinderGeometry(.065, .065, .047, 16), materials.rim, wheel); hub.rotation.z = Math.PI / 2; hub.position.x = outside + side * .052;
    const cap = mesh(new THREE.CylinderGeometry(.032, .032, .049, 16), blue ? materials.paint : materials.chrome, wheel); cap.rotation.z = Math.PI / 2; cap.position.x = outside + side * .06;
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      ellipsoid(outside + side * .079, Math.sin(a) * .048, Math.cos(a) * .048, .011, .011, .011, materials.chrome, wheel, 8);
    }
  }
  for (const side of [-1, 1]) for (const z of wheelZ) makeWheel(side, z);

  if (!blue) {
    // Fastback: low rounded roof and a continuous black glazing ribbon.
    const roofRows = [];
    for (let j = 0; j <= 24; j++) {
      const u = j / 24, z = -.98 + u * 1.18;
      const width = .57 + .06 * Math.sin(u * Math.PI), height = 1.46 + .14 * Math.sin(u * Math.PI * .87);
      const row = [];
      for (let i = 0; i <= 20; i++) { const v = -1 + i / 10; row.push([v * width, height - v * v * .085, z]); }
      roofRows.push(row);
    }
    patch(roofRows, materials.paint);
    const frontGlass = [], rearGlass = [];
    for (let j = 0; j <= 10; j++) {
      const t = j / 10, f = [], r = [];
      for (let i = 0; i <= 16; i++) {
        const v = -1 + i / 8;
        f.push([v * (.60 + .15 * t), 1.515 - .53 * t - .075 * v * v + .025 * Math.sin(t * Math.PI), .20 + .49 * t + .025 * v * v]);
        r.push([v * (.57 + .18 * t), 1.455 - .39 * t - .065 * v * v, -.98 - .62 * t - .03 * v * v]);
      }
      frontGlass.push(f); rearGlass.push(r);
    }
    patch(frontGlass, materials.glass); patch(rearGlass, materials.glass);
    for (const s of [-1, 1]) {
      const window = [[s * .77, 1.015, .61], [s * .612, 1.43, .19], [s * .602, 1.485, -.37], [s * .58, 1.38, -.92], [s * .81, 1.065, -1.35]];
      polygon(window, materials.glass);
      tube(window, .028, materials.paint, true);
      tube([[s * .79, 1.055, -.69], [s * .62, 1.455, -.61]], .023, materials.paint);
      tube([[s * .77, 1.015, .61], [s * .68, 1.21, .42], [s * .612, 1.43, .19]], .038, materials.paint);
      tube([[s * .77, 1.015, .60], [s * .91, .79, .53], [s * .915, .43, .37], [s * .93, .42, -.71], [s * .92, .79, -.86], [s * .81, 1.065, -.90]], .007, materials.seam);
      // 350Z-style vertical metallic pull handle.
      const handle = roundedBox(.026, .13, .038, .012, materials.chrome, [s * .932, .865, -.63]); handle.rotation.x = -.13;
    }
    // Subtle roof-to-hatch pillars frame the rear glass.
    for (const s of [-1, 1]) tube([[s * .57, 1.39, -.98], [s * .65, 1.28, -1.24], [s * .79, 1.04, -1.61]], .060, materials.paint);
    tube([[-.72, 1.055, -1.66], [0, 1.077, -1.74], [.72, 1.055, -1.66]], .029, materials.paint);
  } else {
    // Open cabin, with four warm leather seats and the folded navy soft top.
    roundedBox(1.48, .15, 1.80, .12, materials.black, [0, .975, -.48]);
    roundedBox(1.37, .09, 1.63, .10, materials.cream, [0, 1.038, -.48]);
    for (const x of [-.40, .40]) {
      for (const z of [-.31, -.99]) {
        roundedBox(.48, .115, .42, .065, materials.cream, [x, 1.10, z]);
        const seat = roundedBox(.48, .46, .13, .10, materials.cream, [x, 1.28, z - .18]); seat.rotation.x = -.1;
        roundedBox(.27, .16, .105, .05, materials.cream, [x, 1.53, z - .20]);
        for (const dx of [-.12, .12]) tube([[x + dx, 1.17, z - .098], [x + dx, 1.41, z - .12]], .006, materials.paintDark);
      }
    }
    roundedBox(.18, .19, 1.1, .045, materials.black, [0, 1.11, -.35]);
    roundedBox(.13, .032, .37, .018, materials.chrome, [0, 1.223, -.12]);
    ellipsoid(0, 1.275, -.05, .04, .045, .04, materials.black);
    roundedBox(1.38, .17, .27, .055, materials.black, [0, 1.12, .55]);
    roundedBox(.30, .13, .024, .017, materials.chrome, [0, 1.154, .402]);
    roundedBox(.22, .085, .025, .01, materials.glass, [0, 1.155, .386]);
    // Left-hand driving position, useful for adding a birthday character.
    group.userData.driverPosition = new THREE.Vector3(-.40, 1.13, -.28);
    const steering = mesh(new THREE.TorusGeometry(.158, .021, 8, 24), materials.black); steering.position.set(-.4, 1.25, .31); steering.rotation.x = -.35;
    tube([[-.52, 1.29, .32], [-.4, 1.24, .31], [-.28, 1.29, .32]], .017, materials.chrome);
    tube([[-.4, 1.24, .31], [-.4, 1.11, .34]], .017, materials.chrome);
    const glassRows = [];
    for (let j = 0; j <= 10; j++) {
      const t = j / 10, row = [];
      for (let i = 0; i <= 16; i++) {
        const v = -1 + i / 8;
        row.push([v * (.75 - .095 * t), 1.08 + .51 * t - .03 * v * v, .79 - .29 * t + .04 * v * v]);
      } glassRows.push(row);
    }
    patch(glassRows, materials.glass);
    tube(glassRows[glassRows.length - 1], .036, materials.chrome);
    tube(glassRows[0], .038, materials.paint);
    for (const s of [-1, 1]) {
      tube([[s * .75, 1.05, .83], [s * .70, 1.33, .69], [s * .655, 1.56, .54]], .036, materials.chrome);
      tube([[s * .79, 1.015, .64], [s * .825, 1.03, -.54], [s * .80, 1.035, -1.32]], .024, materials.chrome);
      tube([[s * .88, .95, .61], [s * .912, .71, .58], [s * .91, .40, .31], [s * .924, .40, -.88], [s * .915, .82, -1.08], [s * .84, 1.005, -1.11]], .007, materials.seam);
      roundedBox(.028, .036, .17, .014, materials.chrome, [s * .935, .863, -.73]);
      // Three oval fender gills per side.
      for (let n = 0; n < 3; n++) {
        const z = .81 + n * .145;
        ellipsoid(s * .944, .76, z, .012, .045, .039, materials.chrome);
        ellipsoid(s * .957, .76, z, .009, .030, .025, materials.black);
      }
    }
    for (let n = 0; n < 3; n++) roundedBox(1.37 - n * .025, .07, .17, .035, materials.soft, [0, 1.105 + n * .035, -1.37 - n * .065]);
  }

  // Mirrors, hood creases and understated body highlights.
  for (const s of [-1, 1]) {
    const mz = blue ? .61 : .48;
    tube([[s * .77, 1.005, mz], [s * .98, 1.015, mz]], .026, materials.black);
    ellipsoid(s * 1.025, 1.055, mz + .005, .145, .075, .09, materials.paint);
    ellipsoid(s * 1.031, 1.055, mz - .071, .109, .050, .012, materials.glass);
    tube([[s * .43, blue ? 1.047 : .990, .78], [s * .48, blue ? .984 : .935, 1.38], [s * .53, blue ? .827 : .773, 1.93]], .009, materials.paintDark);
  }
  if (blue) {
    // Wide oval Maserati-inspired mouth, shaped chrome surround, and a small trident.
    ellipsoid(0, .52, half + .008, .555, .205, .049, materials.chrome);
    ellipsoid(0, .525, half + .050, .514, .170, .025, materials.black);
    for (let i = -6; i <= 6; i++) {
      const x = i * .069, h = .145 * Math.sqrt(1 - (x / .50) ** 2);
      tube([[x, .525 - h, half + .073], [x, .525 + h, half + .073]], .006, materials.chrome);
    }
    const tz = half + .085;
    tube([[0, .425, tz], [0, .645, tz]], .010, materials.chrome);
    tube([[-.065, .615, tz], [-.052, .56, tz], [0, .537, tz], [.052, .56, tz], [.065, .615, tz]], .010, materials.chrome);
    tube([[-.054, .430, tz], [.054, .430, tz]], .010, materials.chrome);
    for (const s of [-1, 1]) {
      const pts = [[s * .47, .82, 2.115], [s * .64, .864, 1.96], [s * .829, .749, 2.002], [s * .739, .680, 2.156]];
      polygon(pts, materials.headlight); tube(pts, .014, materials.chrome, true);
      ellipsoid(s * .64, .787, 2.073, .065, .045, .026, materials.headlight);
      ellipsoid(s * .738, .64, -2.191, .153, .065, .069, materials.taillight);
      tube([[s * .44, .30, half - .035], [s * .71, .32, half - .13]], .035, materials.black);
    }
  } else {
    // Tall swept-back triangular lamps give the coupe its distinctive 350Z face.
    for (const s of [-1, 1]) {
      const pts = [[s * .54, .624, 2.12], [s * .85, .726, 1.84], [s * .75, .886, 1.48], [s * .655, .795, 1.84]];
      polygon(pts, materials.headlight); tube(pts, .015, materials.chrome, true);
      tube([[s * .58, .65, 2.07], [s * .73, .775, 1.80]], .015, materials.headlight);
      polygon([[s * .56, .758, -2.18], [s * .855, .831, -1.95], [s * .822, .65, -2.057]], materials.taillight);
    }
    roundedBox(.91, .16, .07, .05, materials.black, [0, .404, half + .017]);
    for (let i = -3; i <= 3; i++) tube([[i * .10, .34, half + .059], [i * .10, .458, half + .059]], .008, materials.paintDark);
    ellipsoid(0, .671, 2.12, .044, .021, .014, materials.chrome);
  }
  // Rear diffuser, twin exhaust and a clean, unlettered registration plate.
  roundedBox(1.05, .14, .105, .055, materials.black, [0, .33, -half + .08]);
  for (const s of [-1, 1]) {
    const exhaust = mesh(new THREE.CylinderGeometry(.064, .064, .14, 16), materials.chrome); exhaust.rotation.x = Math.PI / 2; exhaust.position.set(s * .64, .325, -half + .013);
    const bore = mesh(new THREE.CylinderGeometry(.046, .046, .143, 16), materials.black); bore.rotation.x = Math.PI / 2; bore.position.copy(exhaust.position);
  }
  roundedBox(.40, .12, .015, .012, materials.chrome, [0, .59, -half - .017]);
  group.userData.kind = kind;
  group.userData.forwardAxis = '+Z';
  // Batch the stationary shell and each wheel independently: animation remains
  // unchanged, while the convertible drops well below 200 draw calls.
  mergeStaticChildren(group, { preserve: wheels, dropUVs: true });
  for (const wheel of wheels) mergeStaticChildren(wheel, { dropUVs: true });
  return {
    group,
    wheels,
    animate(speed = 0, time = 0) {
      if (Math.abs(speed) > .001) for (const wheel of wheels) wheel.rotation.x = time * speed / .38;
    },
  };
}
