import * as THREE from 'three';

/**
 * Original, texture-free dad character. Feet rest on y=0; front is +Z.
 * createDad() -> { group, setOutfit(mode), animate(time, state) }
 * Modes: default | movie | gym | drive. States: wave | idle | selected | walk.
 * time is elapsed seconds. Call animate every frame. Materials cast/receive
 * shadows. The caller owns lights, ground, camera, and disposal.
 */
export function createDad() {
  const group = new THREE.Group();
  group.name = 'Birthday Dad';
  const body = new THREE.Group();
  group.add(body);
  let mode = 'default';
  let lastTime = null;
  const mat = (color, roughness = .72, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const skin = mat('#85543a', .66);
  const skinWarm = mat('#926046', .68);
  const skinDark = mat('#694431', .8);
  const lipMat = mat('#75432f', .75);
  const fabric = mat('#f5ca44', .9);
  const trimMat = mat('#e7b431', .9);
  const pantsMat = mat('#333b42', .95);
  const shoeMat = mat('#838c91', .85);
  const rubber = mat('#d0d0c9', .94);
  const white = mat('#fff5da', .7);
  const black = mat('#202224', .62);
  const gold = mat('#d7ae61', .33, { metalness: .68 });
  const headRoot = new THREE.Group();
  const outfitDefault = new THREE.Group();
  const outfitGym = new THREE.Group();
  const outfitDrive = new THREE.Group();
  const movieProps = new THREE.Group();
  const gymProps = new THREE.Group();
  const driveProps = new THREE.Group();
  body.add(outfitDefault, outfitGym, outfitDrive, movieProps, gymProps, driveProps);

  function mesh(geometry, material, parent, position = [0, 0, 0], scale) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(...position);
    if (scale) m.scale.set(...scale);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const sphereGeo = new THREE.SphereGeometry(1, 32, 24);
  const mediumSphereGeo = new THREE.SphereGeometry(1, 20, 14);
  const smallSphereGeo = new THREE.SphereGeometry(1, 12, 8);
  const tinySphereGeo = new THREE.SphereGeometry(1, 8, 6);
  function ell(parent, material, position, scale) {
    // Tiny leaves, buttons and popcorn do not need the head's smooth mesh density.
    const size = Math.max(...scale);
    const geo = size <= .016 ? tinySphereGeo : size <= .060 ? smallSphereGeo : size <= .135 ? mediumSphereGeo : sphereGeo;
    return mesh(geo, material, parent, position, scale);
  }
  function rod(parent, material, a, b, radius, radiusB = radius, segments = 20) {
    const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b);
    const m = mesh(new THREE.CylinderGeometry(radiusB, radius, p.distanceTo(q), segments), material, parent);
    m.position.copy(p).add(q).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.sub(p).normalize());
    return m;
  }
  function line(parent, material, points, radius = .009, segments) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const count = segments ?? (curve.getLength() < .12 ? 12 : 24);
    return mesh(new THREE.TubeGeometry(curve, count, radius, 8, false), material, parent);
  }
  function ring(parent, material, radius, tube, position, scale = [1, 1, 1]) {
    return mesh(new THREE.TorusGeometry(radius, tube, 10, 48), material, parent, position, scale);
  }
  function roundedBox(parent, material, w, h, d, r, pos) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: r, bevelThickness: r, curveSegments: 8 });
    g.translate(0, 0, -d / 2 + r);
    return mesh(g, material, parent, pos);
  }
  function torso(parent, material, extra = 0) {
    const levels = [[1.04, .268, .168], [1.10, .286, .187], [1.23, .299, .200], [1.43, .351, .216], [1.64, .395, .222], [1.75, .401, .198], [1.84, .330, .168], [1.88, .188, .119]];
    const vertices = [], indices = [], count = 64;
    for (const [y, rx, rz] of levels) {
      for (let i = 0; i <= count; i++) {
        const a = i / count * Math.PI * 2;
        vertices.push(Math.cos(a) * (rx + extra), y, Math.sin(a) * (rz + extra));
      }
    }
    for (let j = 0; j < levels.length - 1; j++) for (let i = 0; i < count; i++) {
      const a = j * (count + 1) + i, b = a + count + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    // Capped underside and shoulder opening are hidden by hips and neck.
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices); geo.computeVertexNormals();
    return mesh(geo, material, parent);
  }

  // A broad chest, softly tapered waist, and athletic limbs keep the silhouette human.
  torso(body, skin);
  torso(outfitGym, fabric, .007);
  torso(outfitDrive, fabric, .011);
  const tankBody = torso(outfitDefault, fabric, .004);
  // Skin-colored curved shoulder caps carve a low sleeveless armhole silhouette.
  const tankNeck = ell(outfitDefault, skin, [0, 1.819, .114], [.163, .106, .105]);
  line(outfitDefault, trimMat, [[-.171, 1.877, .088], [-.144, 1.810, .169], [0, 1.741, .222], [.144, 1.810, .169], [.171, 1.877, .088]], .017);
  for (const s of [-1, 1]) {
    ell(outfitDefault, skin, [s * .365, 1.777, -.017], [.139, .112, .172]);
    line(outfitDefault, trimMat, [[s * .305, 1.867, .086], [s * .320, 1.798, .17], [s * .383, 1.680, .136]], .015);
    line(outfitDefault, trimMat, [[s * .28, 1.13, .095], [s * .307, 1.31, .137], [s * .358, 1.56, .121]], .005);
  }
  // Very subtle cloth creases and stitching.
  line(outfitDefault, trimMat, [[-.20, 1.18, .185], [-.03, 1.157, .203], [.20, 1.181, .185]], .005);
  ell(body, pantsMat, [0, 1.042, 0], [.292, .174, .192]);
  const waistband = ring(body, pantsMat, .264, .025, [0, 1.083, 0], [1, .68, 1]);
  waistband.rotation.x = Math.PI / 2;
  const drawstring = mat('#a4aaa9', .9);
  line(body, drawstring, [[-.015, 1.076, .198], [-.033, 1.04, .204], [-.038, .98, .208]], .006);
  line(body, drawstring, [[.015, 1.076, .198], [.035, 1.038, .206], [.040, 1.006, .21]], .006);
  ell(body, skin, [0, 1.915, 0], [.130, .132, .122]);

  // Articulated legs and low-profile sneakers.
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * .165, 1.055, 0); body.add(hip);
    ell(hip, pantsMat, [0, -.212, 0], [.152, .291, .167]);
    const knee = new THREE.Group(); knee.position.y = -.48; hip.add(knee);
    ell(knee, pantsMat, [0, -.190, -.009], [.113, .270, .122]);
    ell(knee, pantsMat, [0, -.388, -.006], [.100, .040, .106]);
    line(knee, mat('#48515b', .95), [[s * .082, -.015, .068], [s * .085, -.2, .072], [s * .065, -.37, .07]], .0035);
    const foot = new THREE.Group(); foot.position.set(0, -.477, .056); knee.add(foot);
    ell(foot, rubber, [0, -.048, .053], [.120, .052, .210]);
    ell(foot, shoeMat, [0, -.013, .064], [.114, .089, .198]);
    ell(foot, mat('#626e75', .85), [0, .018, -.050], [.104, .074, .093]);
    ell(foot, mat('#a1a8a9', .85), [0, .038, .076], [.067, .036, .105]);
    for (let i = 0; i < 4; i++) rod(foot, rubber, [-.059, .066 - i * .005, .033 + i * .026], [.059, .066 - i * .005, .033 + i * .026], .006);
    line(foot, rubber, [[-.092, -.005, .130], [-.078, .007, .184], [0, .013, .216], [.078, .007, .184], [.092, -.005, .130]], .005);
    legs.push({ hip, knee, foot });
  }

  // Real shoulder -> elbow -> wrist chains, with small rounded fingers.
  const arms = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(s * .403, 1.792, 0); body.add(shoulder);
    shoulder.name = s < 0 ? 'Right shoulder' : 'Left shoulder';
    ell(shoulder, skin, [s * .021, -.027, 0], [.134, .148, .137]);
    ell(shoulder, skin, [0, -.179, 0], [.122, .215, .122]);
    const sleeve = ell(shoulder, fabric, [0, -.050, 0], [.148, .160, .150]);
    sleeve.visible = false;
    const cuff = ring(shoulder, fabric, .120, .013, [0, -.167, 0], [1, 1, 1]);
    cuff.rotation.x = Math.PI / 2; cuff.visible = false;
    const elbow = new THREE.Group(); elbow.position.y = -.342; shoulder.add(elbow);
    elbow.name = s < 0 ? 'Right elbow' : 'Left elbow';
    ell(elbow, skin, [0, -.008, 0], [.106, .111, .109]);
    ell(elbow, skin, [0, -.140, .009], [.096, .196, .098]);
    const hand = new THREE.Group(); hand.position.set(0, -.300, .013); elbow.add(hand);
    hand.name = s < 0 ? 'Right hand' : 'Left hand';
    ell(hand, skinWarm, [0, -.044, .009], [.079, .098, .043]);
    const fingers = [];
    for (let i = 0; i < 4; i++) {
      const finger = ell(hand, skinWarm, [(i - 1.5) * .034, -.128 + Math.abs(i - 1.5) * .012, .013], [.0185, .060 - Math.abs(i - 1.5) * .006, .021]);
      fingers.push(finger);
      ell(hand, skin, [(i - 1.5) * .034, -.093, .047], [.018, .018, .008]);
    }
    const thumb = ell(hand, skinWarm, [-s * .074, -.049, .029], [.030, .057, .032]);
    thumb.rotation.z = s * .48;
    arms.push({ shoulder, elbow, hand, sleeve, cuff, fingers, s });
  }
  const [rightArm, leftArm] = arms;
  // Watch and wedding band are little personal details.
  const watch = ring(leftArm.elbow, black, .084, .013, [0, -.265, .008], [1, 1, .80]);
  watch.rotation.x = Math.PI / 2;
  roundedBox(leftArm.elbow, black, .072, .052, .018, .008, [0, -.265, .091]);
  roundedBox(leftArm.elbow, mat('#526f6b', .35), .052, .035, .010, .004, [0, -.265, .103]);
  const band = ring(leftArm.hand, gold, .019, .005, [.017, -.108, .012]); band.rotation.x = Math.PI / 2;

  // Head has an adult jaw, modest ears, sculpted cheeks, and a calm closed smile.
  headRoot.position.set(0, 1.982, .010); body.add(headRoot);
  ell(headRoot, skin, [0, .153, 0], [.227, .258, .219]);
  ell(headRoot, skin, [0, .018, .033], [.184, .138, .171]);
  ell(headRoot, skinWarm, [0, -.028, .100], [.112, .065, .107]);
  for (const s of [-1, 1]) {
    ell(headRoot, skin, [s * .226, .119, -.008], [.052, .083, .042]);
    ell(headRoot, skinDark, [s * .246, .121, .024], [.023, .044, .012]);
    ell(headRoot, skinWarm, [s * .245, .092, .032], [.015, .026, .010]);
    ell(headRoot, skinWarm, [s * .127, .080, .168], [.077, .077, .051]);
  }
  const eyeWhites = mat('#f2e7d4', .42);
  const irises = mat('#33251c', .40);
  const pupilMat = mat('#151412', .28);
  const browsMat = mat('#392b24', .88);
  const eyes = [];
  const lids = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(s * .089, .179, .197); headRoot.add(eye);
    eye.rotation.y = s * .105;
    ell(eye, eyeWhites, [0, 0, 0], [.062, .036, .021]);
    const iris = new THREE.Group(); eye.add(iris);
    ell(iris, irises, [0, -.001, .020], [.027, .030, .011]);
    ell(iris, pupilMat, [0, 0, .029], [.0135, .019, .007]);
    ell(iris, white, [-.008, .012, .035], [.0068, .0068, .0025]);
    line(eye, skinDark, [[-.059, -.003, .004], [-.036, .026, .018], [0, .033, .022], [.037, .024, .018], [.059, -.003, .003]], .009);
    line(eye, skinWarm, [[-.058, -.008, .003], [0, -.031, .015], [.058, -.008, .003]], .008);
    const lid = ell(eye, skin, [0, .001, .024], [.064, .038, .008]); lid.visible = false;
    lids.push(lid); eyes.push(iris);
    const eyebrow = line(headRoot, browsMat, [[s * .032, .244, .201], [s * .070, .261, .199], [s * .116, .259, .186], [s * .157, .243, .168]], .016);
    eyebrow.name = s < 0 ? 'Right brow' : 'Left brow';
    line(headRoot, skinDark, [[s * .130, .115, .206], [s * .146, .095, .211], [s * .151, .075, .208]], .003);
  }
  ell(headRoot, skinWarm, [0, .140, .224], [.046, .079, .051]);
  ell(headRoot, skinWarm, [0, .101, .254], [.058, .042, .046]);
  for (const s of [-1, 1]) {
    ell(headRoot, skin, [s * .046, .091, .240], [.032, .023, .030]);
    ell(headRoot, skinDark, [s * .036, .079, .254], [.011, .007, .004]);
  }
  // A single soft smile line, never an open cartoon mouth.
  line(headRoot, skinDark, [[-.095, .027, .188], [-.058, .012, .207], [0, .006, .215], [.058, .012, .207], [.095, .027, .188]], .0075);
  line(headRoot, lipMat, [[-.070, .007, .201], [0, -.005, .216], [.070, .007, .201]], .010);
  line(headRoot, skinWarm, [[-.050, -.037, .185], [0, -.046, .193], [.050, -.037, .185]], .003);
  // Sparse salt-and-pepper stubble: deterministic tiny geometry, no texture maps.
  const stubbleMat = mat('#5c5148', .95);
  const stubble = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 4), stubbleMat, 114);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 114; i++) {
    const u = ((i * .61803398875) % 1) * 2 - 1;
    const v = ((i * .41421356237) % 1);
    const x = u * .139;
    const y = -.073 + v * .062 + Math.pow(Math.abs(u), 1.4) * .062;
    const z = .130 + Math.sqrt(Math.max(0, 1 - (x / .193) ** 2)) * .059;
    dummy.position.set(x, y, z);
    dummy.scale.set(.0023, .0037, .0019); dummy.rotation.z = u * .5;
    dummy.updateMatrix(); stubble.setMatrixAt(i, dummy.matrix);
  }
  stubble.castShadow = false; headRoot.add(stubble);

  // Glasses follow the head. Thin bridges and arms give a clear profile.
  const glasses3D = new THREE.Group(); headRoot.add(glasses3D);
  const sunglasses = new THREE.Group(); headRoot.add(sunglasses);
  function makeGlasses(parent, frame, lenses) {
    for (const s of [-1, 1]) {
      roundedBox(parent, frame, .166, .115, .024, .022, [s * .099, .181, .228]);
      roundedBox(parent, lenses[s < 0 ? 0 : 1], .133, .083, .027, .012, [s * .099, .181, .246]);
      line(parent, frame, [[s * .180, .203, .225], [s * .221, .203, .119], [s * .231, .178, .021]], .011);
    }
    rod(parent, frame, [-.028, .194, .235], [.028, .194, .235], .012);
  }
  makeGlasses(glasses3D, mat('#f6f0db', .75), [mat('#e44348', .33, { transparent: true, opacity: .88 }), mat('#3da6d1', .33, { transparent: true, opacity: .88 })]);
  makeGlasses(sunglasses, black, [mat('#273b3b', .2, { metalness: .20 }), mat('#273b3b', .2, { metalness: .20 })]);
  line(sunglasses, mat('#819c94', .3), [[-.156, .211, .264], [-.101, .211, .264], [-.070, .204, .264]], .003);
  line(sunglasses, mat('#819c94', .3), [[.056, .211, .264], [.110, .211, .264], [.139, .205, .264]], .003);

  // Movie: compact remote and overflowing classic striped popcorn tub.
  const remote = new THREE.Group(); rightArm.hand.add(remote);
  remote.position.set(0, -.035, .067); remote.rotation.x = -.15;
  roundedBox(remote, black, .083, .220, .035, .016, [0, 0, 0]);
  ell(remote, mat('#b74636', .6), [0, .073, .024], [.013, .013, .007]);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) ell(remote, mat('#677477', .8), [(c - .5) * .035, .024 - r * .027, .022], [.009, .007, .005]);
  const bucket = new THREE.Group(); movieProps.add(bucket);
  const red = mat('#d6513d', .88), paper = mat('#fff2d7', .9);
  mesh(new THREE.CylinderGeometry(.139, .104, .236, 40), paper, bucket, [0, -.060, 0]);
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;
    mesh(new THREE.CylinderGeometry(.140, .105, .235, 4, 1, true, a, .24), red, bucket, [0, -.060, 0]);
  }
  const bucketRim = ring(bucket, paper, .139, .010, [0, .059, 0]); bucketRim.rotation.x = Math.PI / 2;
  const popcorn = mat('#f3da8b', .96), popcornLight = mat('#fff1bd', .98);
  for (let i = 0; i < 47; i++) {
    const a = i * 2.39996, r = .116 * Math.sqrt((i + .4) / 47);
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = .066 + .036 * (1 - r / .15);
    ell(bucket, i % 3 ? popcornLight : popcorn, [x, y, z], [.023, .019 + (i % 3) * .006, .020]);
    ell(bucket, popcornLight, [x + .011, y + .01, z], [.013, .016, .014]);
  }

  // Gym: cotton crewneck, small chest mark, and soft duffel bag with handles.
  const crew = ring(outfitGym, black, .137, .022, [0, 1.891, 0], [1, .86, 1]); crew.rotation.x = Math.PI / 2;
  line(outfitGym, mat('#d5d8cc', .8), [[-.170, 1.715, .208], [-.151, 1.690, .221], [-.112, 1.725, .224]], .007);
  const bag = new THREE.Group(); gymProps.add(bag);
  const bagMat = mat('#3b5551', .93), bagTrim = mat('#203b38', .96);
  roundedBox(bag, bagMat, .42, .22, .22, .065, [0, -.240, 0]);
  for (const s of [-1, 1]) {
    line(bag, bagTrim, [[s * .10, -.16, -.08], [s * .09, -.038, -.065], [s * .065, -.018, .01], [s * .09, -.038, .080], [s * .10, -.16, .085]], .011);
    line(bag, bagTrim, [[s * .145, -.14, -.115], [s * .145, -.265, -.12], [s * .145, -.35, 0], [s * .145, -.265, .12], [s * .145, -.14, .115]], .010);
  }
  line(bag, mat('#abb3a4', .5), [[-.16, -.123, .006], [0, -.113, .006], [.16, -.123, .006]], .003);
  roundedBox(bag, bagTrim, .12, .055, .014, .01, [0, -.247, .125]);

  // Vacation shirt: stitched front, buttons, shaped collar, tiny tropical leaves.
  const shirtTrim = mat('#da9a6c', .88), leafMat = mat('#476f64', .92), leafLight = mat('#f5dba0', .92);
  line(outfitDrive, shirtTrim, [[0, 1.10, .203], [0, 1.35, .233], [0, 1.59, .244], [0, 1.79, .197]], .012);
  for (let i = 0; i < 5; i++) ell(outfitDrive, mat('#e8c292', .9), [.018, 1.2 + i * .119, .246 - (i === 0 ? .026 : 0)], [.009, .009, .005]);
  function triangle(parent, material, pts) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); g.setIndex([0, 1, 2, 2, 1, 0]); g.computeVertexNormals();
    return mesh(g, material, parent);
  }
  for (const s of [-1, 1]) {
    triangle(outfitDrive, shirtTrim, [[s * .063, 1.883, .139], [s * .214, 1.834, .177], [s * .108, 1.696, .249]]);
    triangle(outfitDrive, mat('#f2b57f', .9), [[s * .055, 1.886, .142], [s * .194, 1.828, .186], [s * .103, 1.721, .250]]);
  }
  for (let i = 0; i < 17; i++) {
    const side = i % 2 ? -1 : 1;
    const x = side * (.086 + ((i * .073) % .21));
    const y = 1.18 + ((i * .127) % .55);
    const rx = .30 + (y - 1.18) * .19;
    const z = Math.sqrt(Math.max(.05, 1 - (x / rx) ** 2)) * (.214 + (y - 1.18) * .045) + .019;
    const motif = new THREE.Group(); motif.position.set(x, y, z); motif.rotation.z = side * .6; outfitDrive.add(motif);
    line(motif, leafMat, [[0, -.038, 0], [0, 0, .001], [.016, .043, 0]], .003);
    for (let k = 0; k < 3; k++) for (const s of [-1, 1]) {
      const l = ell(motif, i % 4 ? leafMat : leafLight, [s * .014, -.019 + k * .019, 0], [.010, .020, .003]); l.rotation.z = -s * .6;
    }
  }
  const hat = new THREE.Group(); headRoot.add(hat);
  const straw = mat('#d4b47a', .97), strawLight = mat('#e1c48e', .98);
  ell(hat, straw, [0, .385, -.010], [.322, .022, .268]);
  mesh(new THREE.CylinderGeometry(.171, .222, .158, 48), straw, hat, [0, .465, -.011], [1, 1, .91]);
  ell(hat, straw, [0, .540, -.011], [.172, .028, .155]);
  const hatBand = mesh(new THREE.CylinderGeometry(.213, .221, .035, 48, 1, true), mat('#594737', .95), hat, [0, .408, -.011], [1, 1, .91]);
  for (let i = 0; i < 6; i++) {
    const hoop = ring(hat, strawLight, .179 + i * .025, .002, [0, .398 - i * .002, -.010], [1, .84, 1]); hoop.rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 9; i++) {
    const hoop = ring(hat, strawLight, .175 + i * .005, .0015, [0, .532 - i * .015, -.011], [1, .91, 1]); hoop.rotation.x = Math.PI / 2;
  }
  line(hat, mat('#bea06b', 1), [[-.090, .555, -.005], [0, .549, -.025], [.090, .555, -.005]], .008);

  const rightHandPosition = new THREE.Vector3(), leftHandPosition = new THREE.Vector3();
  const inverseBody = new THREE.Matrix4();
  const smooth = (a, b, k) => THREE.MathUtils.lerp(a, b, k);
  function setOutfit(next = 'default') {
    mode = ['default', 'movie', 'gym', 'drive'].includes(next) ? next : 'default';
    outfitDefault.visible = mode === 'default' || mode === 'movie';
    outfitGym.visible = mode === 'gym'; outfitDrive.visible = mode === 'drive';
    movieProps.visible = mode === 'movie'; gymProps.visible = mode === 'gym'; driveProps.visible = mode === 'drive';
    remote.visible = mode === 'movie'; glasses3D.visible = mode === 'movie';
    sunglasses.visible = mode === 'gym' || mode === 'drive'; hat.visible = mode === 'drive';
    fabric.color.set(mode === 'gym' ? '#252a2d' : mode === 'drive' ? '#e9aa78' : '#f5ca44');
    pantsMat.color.set(mode === 'gym' ? '#273e55' : mode === 'drive' ? '#34403e' : '#333b42');
    for (const arm of arms) { arm.sleeve.visible = mode === 'gym' || mode === 'drive'; arm.cuff.visible = arm.sleeve.visible; }
    group.userData.outfit = mode;
  }
  function animate(time = 0, state = 'idle') {
    const dt = lastTime === null ? 1 / 60 : Math.max(0, Math.min(.08, time - lastTime)); lastTime = time;
    const k = 1 - Math.exp(-10 * dt);
    const walk = state === 'walk', wave = state === 'wave', selected = state === 'selected';
    const thinking = !walk && !wave && !selected && mode === 'default';
    const phase = time * 7.1, breathe = Math.sin(time * 1.65);
    body.position.y = walk ? .018 + Math.abs(Math.sin(phase)) * .018 : breathe * .006;
    body.rotation.y = smooth(body.rotation.y, walk ? Math.sin(phase) * .028 : Math.sin(time * .53) * .016, k);
    body.rotation.z = smooth(body.rotation.z, walk ? Math.sin(phase) * .014 : Math.sin(time * .7) * .008, k);
    headRoot.rotation.y = smooth(headRoot.rotation.y, wave ? -.055 : selected ? .08 : Math.sin(time * .40) * (thinking ? .21 : .105), k);
    headRoot.rotation.x = smooth(headRoot.rotation.x, selected ? -.055 : (thinking ? -.115 : -.02) + Math.sin(time * .60) * .025, k);
    headRoot.rotation.z = smooth(headRoot.rotation.z, wave ? -.045 : selected ? -.055 : Math.sin(time * .4) * .028, k);
    for (const iris of eyes) { iris.position.x = Math.sin(time * .4) * (thinking ? .010 : .006); iris.position.y = thinking ? .009 : selected ? .003 : 0; }
    const blink = (time + .45) % 4.7 < .115 || (time + .2) % 11.8 < .1;
    for (const lid of lids) lid.visible = blink;
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i], stride = Math.sin(phase + i * Math.PI);
      leg.hip.rotation.x = smooth(leg.hip.rotation.x, walk ? stride * .36 : 0, k);
      leg.knee.rotation.x = smooth(leg.knee.rotation.x, walk ? Math.max(0, -stride) * .45 : .015, k);
      leg.foot.rotation.x = smooth(leg.foot.rotation.x, walk ? Math.max(0, stride) * -.08 : -.015, k);
    }
    for (let i = 0; i < arms.length; i++) {
      const arm = arms[i], s = arm.s;
      let ax = -.055, ay = 0, az = s * .085, ex = -.075, ey = 0, ez = 0, hx = 0;
      if (walk) ax = -Math.sin(phase + i * Math.PI) * .31;
      if (mode === 'movie') {
        ax = i === 0 ? -.61 : -.72; az = s * .18; ex = i === 0 ? -.90 : -1.01; hx = .20;
      } else if (mode === 'gym' && i === 1) { az = .15; ax = -.06; ex = -.10; }
      if (wave && i === 0 && mode !== 'movie') {
        ax = -.18; az = -1.86 + Math.sin(time * 5.2) * .10; ex = -.16; ez = -.72 + Math.sin(time * 5.2) * .17;
      } else if (thinking) {
        // Keep a continuous thinking silhouette: knuckles at the chin, opposite
        // forearm gently crossed beneath the elbow. Small shifts feel alive.
        if (i === 0) {
          ax = -1.197 + Math.sin(time * .7) * .012; ay = .50; az = .666;
          ex = -1.703 + Math.sin(time * .7) * .010; ey = .566; hx = .025;
        } else {
          ax = -.860; ay = -.019; az = -.576;
          ex = -.315; ey = -.207; ez = -.684;
        }
      } else if (selected && mode !== 'movie') {
        // Selection settles into a comfortable stance; only the intro waves.
        ax = i === 0 ? -.085 : -.060; az = s * .13; ex = i === 0 ? -.18 : -.10;
      }
      arm.shoulder.rotation.x = smooth(arm.shoulder.rotation.x, ax, k);
      arm.shoulder.rotation.y = smooth(arm.shoulder.rotation.y, ay, k);
      arm.shoulder.rotation.z = smooth(arm.shoulder.rotation.z, az, k);
      arm.elbow.rotation.x = smooth(arm.elbow.rotation.x, ex, k);
      arm.elbow.rotation.y = smooth(arm.elbow.rotation.y, ey, k);
      arm.elbow.rotation.z = smooth(arm.elbow.rotation.z, ez, k);
      arm.hand.rotation.x = smooth(arm.hand.rotation.x, hx, k);
      arm.hand.rotation.z = smooth(arm.hand.rotation.z, (wave && i === 0) ? Math.sin(time * 5.2) * .12 : 0, k);
      for (let f = 0; f < arm.fingers.length; f++) {
        const finger = arm.fingers[f];
        finger.rotation.z = smooth(finger.rotation.z, wave && i === 0 ? (f - 1.5) * .085 : 0, k);
        finger.rotation.x = smooth(finger.rotation.x, thinking && i === 0 ? 1.05 : 0, k);
        finger.position.y = smooth(finger.position.y, (thinking && i === 0 ? -.099 : -.128) + Math.abs(f - 1.5) * .012, k);
      }
    }
    // These hand-carried objects stay upright while the arms ease between poses.
    body.updateWorldMatrix(true, true);
    inverseBody.copy(body.matrixWorld).invert();
    leftArm.hand.getWorldPosition(leftHandPosition).applyMatrix4(inverseBody);
    rightArm.hand.getWorldPosition(rightHandPosition).applyMatrix4(inverseBody);
    bucket.position.copy(leftHandPosition).add(new THREE.Vector3(.025, -.075, .105));
    bucket.rotation.z = Math.sin(time * 1.4) * .012;
    bag.position.copy(leftHandPosition).add(new THREE.Vector3(.020, -.060, 0));
    bag.rotation.z = walk ? Math.sin(phase) * .065 : .035;
    group.userData.animationState = state;
  }
  setOutfit('default');
  animate(0, 'idle');
  return { group, setOutfit, animate };
}
