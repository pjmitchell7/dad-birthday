import * as THREE from 'three';
import { mergeStaticChildren } from './mergeStaticChildren.js';

// Original, lightweight procedural car models. Forward is +Z; road height is 0.
export function createCar(kind = 'silver') {
  const blue = kind === 'blue';
  const group = new THREE.Group();
  group.name = blue ? 'Cobalt grand touring convertible' : 'Silver sports coupe';
  const wheels = [];
  const materials = {
    paint: new THREE.MeshPhysicalMaterial({ color: blue ? 0x0b43a5 : 0xbec4ca, metalness: .72, roughness: .26, clearcoat: 1, clearcoatRoughness: .14 }),
    paintDark: new THREE.MeshStandardMaterial({ color: blue ? 0x07369c : 0x88919b, metalness: .7, roughness: .3 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x536b7c, metalness: .24, roughness: .16, transparent: true, opacity: .64, depthWrite: false, clearcoat: 1, side: THREE.DoubleSide }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: .89 }),
    black: new THREE.MeshStandardMaterial({ color: 0x151b22, roughness: .55 }),
    rim: new THREE.MeshStandardMaterial({ color: blue ? 0xdce6ed : 0x313841, metalness: .9, roughness: .22 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe6edf5, metalness: .92, roughness: .19 }),
    seam: new THREE.MeshStandardMaterial({ color: blue ? 0x093582 : 0x57616c, roughness: .6 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xdcc4a0, roughness: .77 }),
    soft: new THREE.MeshStandardMaterial({ color: 0x1a273f, roughness: .96 }),
    brake: new THREE.MeshStandardMaterial({ color: 0xc13431, roughness: .46, metalness: .3 }),
    headlight: new THREE.MeshStandardMaterial({ color: 0xb8c5ce, emissive: 0xbcdfff, emissiveIntensity: .08, metalness: .55, roughness: .13 }),
    taillight: new THREE.MeshStandardMaterial({ color: 0xad1027, emissive: 0xe61735, emissiveIntensity: .5, roughness: .23 }),
    lampHousing: new THREE.MeshPhysicalMaterial({color:0x18232d,metalness:.48,roughness:.19,clearcoat:1}),
    lampLens: new THREE.MeshPhysicalMaterial({color:0x7b94a5,metalness:.62,roughness:.09,clearcoat:1}),
    amber: new THREE.MeshStandardMaterial({color:0xde8e31,emissive:0x9b4810,emissiveIntensity:.12,roughness:.28}),
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
    [-half, .71, .61, .80], [-2.16, .88, .79, .96], [-1.6, .95, .85, 1.0],
    [-.9, .91, .87, .98], [0, .90, .85, .98], [.73, .91, .91, 1.02],
    [1.45, .94, .88, .99], [2.04, .90, .78, .87], [half, .75, .59, .73]
  ] : [
    [-half, .72, .65, .83], [-1.94, .89, .83, .99], [-1.4, .96, .9, 1.06],
    [-.65, .93, .92, 1.04], [.1, .89, .85, .95], [.71, .93, .88, .98],
    [1.35, .94, .85, .93], [1.91, .87, .75, .82], [half, .72, .60, .70]
  ];
  const profiles = bodySamples.map(p => new THREE.Vector3(p[1], p[2], p[3]));
  function profile(z) {
    let i = 0; while (i < bodySamples.length - 2 && bodySamples[i + 1][0] < z) i++;
    const u = THREE.MathUtils.clamp((z - bodySamples[i][0]) / (bodySamples[i + 1][0] - bodySamples[i][0]), 0, 1);
    const prev = Math.max(0, i - 1), next = Math.min(profiles.length - 1, i + 2);
    const span = bodySamples[i + 1][0] - bodySamples[i][0];
    const m0 = profiles[i + 1].clone().sub(profiles[prev]).multiplyScalar(span / (bodySamples[i + 1][0] - bodySamples[prev][0]));
    const m1 = profiles[next].clone().sub(profiles[i]).multiplyScalar(span / (bodySamples[next][0] - bodySamples[i][0]));
    return profiles[i].clone().multiplyScalar(2*u*u*u-3*u*u+1)
      .addScaledVector(m0,u*u*u-2*u*u+u)
      .addScaledVector(profiles[i+1],-2*u*u*u+3*u*u)
      .addScaledVector(m1,u*u*u-u*u);
  }
  function hoodY(x,z) {
    const p=profile(z), t=Math.abs(x)/p.x;
    if(t<.4)return p.z+.025-.013*t/.4;
    if(t<.78)return p.z+.012-.036*(t-.4)/.38;
    return THREE.MathUtils.lerp(p.z-.024,p.y,THREE.MathUtils.clamp((t-.78)/.205,0,1));
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
    const rounded = new THREE.CatmullRomCurve3(ring.slice(0,-1).map(p=>new THREE.Vector3(...p)),true,'catmullrom',.18).getPoints(48).map(p=>p.toArray());
    // Fold outer bumper corners rearward rather than cutting a flat slab face.
    const frontBlend=THREE.MathUtils.smoothstep(z,half-.34,half);
    for(const p of rounded)p[2]-=.15*Math.pow(Math.abs(p[0])/w,4)*frontBlend;
    bodyRows.push(rounded);
  }
  const boundary=bodyRows[bodyRows.length-1], centreY=(.245+profile(half).z+.025)/2;
  for(let step=1;step<=12;step++){
    const a=(step/12)*(Math.PI/2-.002), radius=Math.cos(a);
    bodyRows.push(boundary.map(p=>{
      const x=p[0]*radius,y=centreY+(p[1]-centreY)*radius;
      return [x,y,half-.15*Math.pow(Math.abs(x)/profile(half).x,4)+.070*Math.sin(a)];
    }));
  }
  const bodyMesh=patch(bodyRows, materials.paint);
  if(blue){
    // Open a real cabin recess in the upper body shell; seats sit inside it.
    const geo=bodyMesh.geometry, p=geo.attributes.position, kept=[];
    for(let k=0;k<geo.index.count;k+=3){
      const a=geo.index.getX(k),b=geo.index.getX(k+1),c=geo.index.getX(k+2);
      const x=(p.getX(a)+p.getX(b)+p.getX(c))/3,y=(p.getY(a)+p.getY(b)+p.getY(c))/3,z=(p.getZ(a)+p.getZ(b)+p.getZ(c))/3;
      if(!(Math.abs(x)<.765&&z> -1.30&&z<.52&&y>.84))kept.push(a,b,c);
    }geo.setIndex(kept);geo.computeVertexNormals();
  }
  bodyMesh.updateMatrixWorld(true);
  // Local 2D triangle bins project decals onto the exact body mesh without
  // thousands of full-mesh raycasts during scene startup.
  function projectionGrid(vertical){
    const bins=new Map(),p=bodyMesh.geometry.attributes.position,ix=bodyMesh.geometry.index,cell=.14;
    for(let k=0;k<ix.count;k+=3){
      const ids=[ix.getX(k),ix.getX(k+1),ix.getX(k+2)],v=ids.map(i=>[p.getX(i),vertical?p.getZ(i):p.getY(i),vertical?p.getY(i):p.getZ(i)]);
      const t=[v[0][0],v[0][1],v[1][0],v[1][1],v[2][0],v[2][1],v[0][2],v[1][2],v[2][2]];
      const den=(t[3]-t[5])*(t[0]-t[4])+(t[4]-t[2])*(t[1]-t[5]);if(Math.abs(den)<1e-10)continue;t.push(den);
      for(let x=Math.floor(Math.min(t[0],t[2],t[4])/cell);x<=Math.floor(Math.max(t[0],t[2],t[4])/cell);x++)for(let y=Math.floor(Math.min(t[1],t[3],t[5])/cell);y<=Math.floor(Math.max(t[1],t[3],t[5])/cell);y++){const key=x+','+y;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(t);}
    }
    return (x,y,fallback)=>{let max=-Infinity;for(const t of bins.get(Math.floor(x/cell)+','+Math.floor(y/cell))||[]){const a=((t[3]-t[5])*(x-t[4])+(t[4]-t[2])*(y-t[5]))/t[9],b=((t[5]-t[1])*(x-t[4])+(t[0]-t[4])*(y-t[5]))/t[9],c=1-a-b;if(a>=-1e-6&&b>=-1e-6&&c>=-1e-6)max=Math.max(max,a*t[6]+b*t[7]+c*t[8]);}return Number.isFinite(max)?max:fallback;};
  }
  const projectY=projectionGrid(true),projectZ=projectionGrid(false);
  const yCache=new Map(),zCache=new Map();
  function surfaceY(x,z){const key=x.toFixed(4)+','+z.toFixed(4);if(yCache.has(key))return yCache.get(key);const y=projectY(x,z,hoodY(x,z));yCache.set(key,y);return y;}
  function surfaceZ(x,y){const key=x.toFixed(4)+','+y.toFixed(4);if(zCache.has(key))return zCache.get(key);const z=projectZ(x,y,half);zCache.set(key,z);return z;}
  function hoodDecal(outline,material,lift=.009){
    const verts=[],n=3;
    function point(a,b,c,u,v){const x=a[0]*(1-u-v)+b[0]*u+c[0]*v,z=a[1]*(1-u-v)+b[1]*u+c[1]*v;return[x,surfaceY(x,z)+lift,z];}
    for(let t=1;t<outline.length-1;t++)for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){
      const a=outline[0],b=outline[t],c=outline[t+1],u=i/n,v=j/n;
      verts.push(...point(a,b,c,u,v),...point(a,b,c,u+1/n,v),...point(a,b,c,u,v+1/n));
      if(i+j<n-1)verts.push(...point(a,b,c,u+1/n,v),...point(a,b,c,u+1/n,v+1/n),...point(a,b,c,u,v+1/n));
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.computeVertexNormals();const mat=material.clone();mat.side=THREE.DoubleSide;return mesh(g,mat);
  }
  function hoodLens(x,z,r){
    const circle=rad=>Array.from({length:20},(_,i)=>{const a=i*Math.PI/10;return[x+Math.cos(a)*rad,z+Math.sin(a)*rad]});
    hoodDecal(circle(r),materials.chrome,.013);hoodDecal(circle(r*.72),materials.lampLens,.017);
    const glint=[[x-r*.30,z-r*.25],[x+r*.23,z-r*.30],[x+r*.05,z-r*.07]];hoodDecal(glint,materials.headlight,.019);
  }
  function frontDecal(outline,material,lift=.009){
    const rows=[];for(let j=0;j<=12;j++){const t=j/12,row=[];for(let i=0;i<=20;i++){const u=i/20;
      const x=THREE.MathUtils.lerp(outline[0],outline[1],u),y=THREE.MathUtils.lerp(outline[2],outline[3],t);row.push([x,y,surfaceZ(x,y)+lift]);}rows.push(row);}return patch(rows,material);
  }
  function frontOval(rx,ry,cy,material,lift){
    const rows=[];for(let j=0;j<=8;j++){const rad=1-.999*j/8,row=[];for(let i=0;i<=40;i++){const a=i*Math.PI/20,x=rx*Math.cos(a)*rad,y=cy+ry*Math.sin(a)*rad;row.push([x,y,surfaceZ(x,y)+lift]);}rows.push(row);}return patch(rows,material);
  }
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
      tube(archPoints, .017, materials.paint);
      ellipsoid(side * .835, .415, wz, .10, .405, .414, materials.black);
    }
    tube([[side * .84, .31, wheelZ[1] + .42], [side * .93, .30, 0], [side * .86, .31, wheelZ[0] - .43]], .055, materials.paintDark);
  }

  function makeWheel(side, z) {
    const wheel = new THREE.Group(); wheel.position.set(side * .91, .38, z); group.add(wheel); wheels.push(wheel);
    // Tire cylinders and rings have their axle along X.
    const tyreProfile=[[.286,-.110],[.326,-.114],[.356,-.100],[.376,-.070],[.38,-.025],[.38,.025],[.376,.070],[.356,.100],[.326,.114],[.286,.110]].map(p=>new THREE.Vector2(...p));
    const tyreGeometry=new THREE.LatheGeometry(tyreProfile,40);tyreGeometry.computeVertexNormals();
    const tire = mesh(tyreGeometry,materials.rubber,wheel);tire.rotation.z=Math.PI/2;
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
    // Visible leather cabin, dashboard and transmission tunnel behind clear glass.
    roundedBox(1.35, .09, 1.44, .1, materials.black, [0, 1.005, -.32]);
    for (const x of [-.37, .37]) {
      roundedBox(.47, .12, .48, .08, materials.black, [x, 1.06, -.34]);
      const back = roundedBox(.47, .32, .11, .075, materials.black, [x, 1.20, -.56]); back.rotation.x = -.12;
      roundedBox(.255, .12, .105, .045, materials.black, [x, 1.405, -.57]);
      for (const dx of [-.12, .12]) tube([[x+dx,1.11,-.482],[x+dx,1.33,-.497]],.005,materials.paintDark);
    }
    roundedBox(1.30,.13,.25,.055,materials.black,[0,1.035,.42]);
    roundedBox(.15,.12,.68,.035,materials.black,[0,1.07,-.05]);
    const steering = mesh(new THREE.TorusGeometry(.145,.017,8,28),materials.black);
    steering.position.set(-.37,1.26,.19); steering.rotation.x=-.3;
    tube([[-.48,1.28,.19],[-.37,1.245,.19],[-.26,1.28,.19]],.012,materials.chrome);
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
        f.push([v * (.60 + .17 * t), 1.515 - .475 * t - (.075*(1-t)+.025*t) * v * v + .012 * Math.sin(t * Math.PI), .20 + .46 * t - .05*t*v*v]);
        r.push([v * (.57 + .18 * t), 1.455 - .39 * t - .065 * v * v, -.98 - .62 * t - .03 * v * v]);
      }
      frontGlass.push(f); rearGlass.push(r);
    }
    patch(frontGlass, materials.glass); patch(rearGlass, materials.glass);
    for (const s of [-1, 1]) {
      const window = [[s * .77, 1.015, .61], [s * .612, 1.43, .19], [s * .602, 1.485, -.37], [s * .58, 1.38, -.92], [s * .81, 1.065, -1.35]];
      polygon(window, materials.glass);
      tube(window, .019, materials.paint, true);
      tube([[s * .79, 1.055, -.69], [s * .62, 1.455, -.61]], .023, materials.paint);
      tube([[s * .77, 1.015, .61], [s * .68, 1.21, .42], [s * .612, 1.43, .19]], .026, materials.paint);
      tube([[s * .77, 1.015, .60], [s * .91, .79, .53], [s * .915, .43, .37], [s * .93, .42, -.71], [s * .92, .79, -.86], [s * .81, 1.065, -.90]], .007, materials.seam);
      // 350Z-style vertical metallic pull handle.
      const handle = roundedBox(.026, .13, .038, .012, materials.chrome, [s * .932, .865, -.63]); handle.rotation.x = -.13;
    }
    // Subtle roof-to-hatch pillars frame the rear glass.
    for (const s of [-1, 1]) tube([[s * .57, 1.39, -.98], [s * .65, 1.28, -1.24], [s * .79, 1.04, -1.61]], .042, materials.paint);
    tube([[-.72, 1.055, -1.66], [0, 1.077, -1.74], [.72, 1.055, -1.66]], .029, materials.paint);
  } else {
    // Open cabin, with four warm leather seats and the folded navy soft top.
    roundedBox(1.48, .09, 1.80, .12, materials.black, [0, .68, -.48]);
    roundedBox(1.37, .06, 1.63, .10, materials.cream, [0, .735, -.48]);
    for (const x of [-.40, .40]) {
      for (const z of [-.31, -.99]) {
        const rear=z<-.7,dy=rear?-.07:0;
        ellipsoid(x,.88+dy,z,.237,.055,.235,materials.cream);
        const backRows=[];
        for(const [y,w] of [[.85,.12],[.90,.195],[1.00,.22],[1.14,.211],[1.27,.182],[1.325,.125]]){
          const row=[];for(let n=0;n<=24;n++){const a=n*Math.PI/12,co=Math.cos(a),si=Math.sin(a);row.push([x+w*Math.sign(co)*Math.pow(Math.abs(co),.65),y+dy,z-.18-.085*(y-.85)+.052*Math.sign(si)*Math.pow(Math.abs(si),.5)]);}backRows.push(row);
        }
        patch(backRows,materials.cream);polygon(backRows[backRows.length-1].slice(0,-1),materials.cream);
        ellipsoid(x,1.392+dy,z-.23,.126,.065,.052,materials.cream);
        for(const s of [-1,1])ellipsoid(x+s*.172,1.09+dy,z-.121,.051,.184,.050,materials.cream);
        for (const dx of [-.11, .11]) tube([[x + dx, .96+dy, z - .115], [x + dx, 1.24+dy, z - .148]], .004, materials.paintDark);
      }
    }
    roundedBox(.18, .19, 1.1, .045, materials.black, [0, .88, -.35]);
    roundedBox(.13, .032, .37, .018, materials.chrome, [0, .992, -.12]);
    ellipsoid(0, 1.040, -.05, .035, .04, .035, materials.black);
    roundedBox(1.38, .13, .27, .055, materials.black, [0, 1.035, .55]);
    roundedBox(.30, .10, .024, .017, materials.chrome, [0, 1.05, .402]);
    roundedBox(.22, .065, .025, .01, materials.glass, [0, 1.05, .386]);
    // Left-hand driving position, useful for adding a birthday character.
    group.userData.driverPosition = new THREE.Vector3(-.40, .935, -.28);
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
    ellipsoid(s * 1.005, 1.055, mz + .005, .11, .068, .095, materials.paint);
    ellipsoid(s * 1.011, 1.055, mz - .077, .088, .041, .012, materials.chrome);
    tube([[s * .43, blue ? 1.047 : .990, .78], [s * .48, blue ? .984 : .935, 1.38], [s * .53, blue ? .827 : .773, 1.93]], .009, materials.paintDark);
  }
  if (blue) {
    // Wide oval Maserati-inspired mouth, shaped chrome surround, and a small trident.
    frontOval(.555,.205,.52,materials.chrome,.006);
    frontOval(.526,.180,.52,materials.black,.010);
    for (let i = -6; i <= 6; i++) {
      const x = i * .069, h = .145 * Math.sqrt(1 - (x / .50) ** 2);
      const points=[];for(let p=0;p<=6;p++){const y=.525-h+2*h*p/6;points.push([x,y,surfaceZ(x,y)+.015]);}tube(points,.0045,materials.chrome);
    }
    const tz = half + .083;
    tube([[0, .425, tz], [0, .645, tz]], .010, materials.chrome);
    tube([[-.065, .615, tz], [-.052, .56, tz], [0, .537, tz], [.052, .56, tz], [.065, .615, tz]], .010, materials.chrome);
    tube([[-.054, .430, tz], [.054, .430, tz]], .010, materials.chrome);
    for (const s of [-1, 1]) {
      const outline=[[s*.47,2.23],[s*.60,1.94],[s*.82,2.035],[s*.775,2.27]];
      hoodDecal(outline,materials.lampHousing,.011);
      tube(outline.map(p=>[p[0],surfaceY(p[0],p[1])+.009,p[1]]),.003,materials.lampHousing,true);
      hoodLens(s*.655,2.092,.064);hoodLens(s*.727,2.155,.043);
      hoodDecal([[s*.785,2.075],[s*.81,2.078],[s*.776,2.19],[s*.76,2.182]],materials.amber,.017);
      ellipsoid(s * .738, .64, -2.191, .153, .065, .069, materials.taillight);
      tube([[s * .44, .30, half - .035], [s * .71, .32, half - .13]], .035, materials.black);
    }
  } else {
    // Tall swept-back triangular lamps give the coupe its distinctive 350Z face.
    for (const s of [-1, 1]) {
      const outline=[[s*.555,2.13],[s*.854,1.885],[s*.758,1.54],[s*.645,1.88]];
      hoodDecal(outline,materials.lampHousing,.011);
      tube(outline.map(p=>[p[0],surfaceY(p[0],p[1])+.009,p[1]]),.003,materials.lampHousing,true);
      hoodLens(s*.732,1.824,.064);hoodLens(s*.672,1.985,.049);
      hoodDecal([[s*.789,1.80],[s*.812,1.86],[s*.775,1.96],[s*.758,1.94]],materials.amber,.017);
      polygon([[s * .56, .758, -2.18], [s * .855, .831, -1.95], [s * .822, .65, -2.057]], materials.taillight);
    }
    frontDecal([-.51,.51,.365,.517],materials.black,.008);
    for (let i = -4; i <= 4; i++){const x=i*.102;const pts=[];for(let j=0;j<=5;j++){const y=.378+j*.026;pts.push([x,y,surfaceZ(x,y)+.012]);}tube(pts,.003,materials.paintDark);}
    ellipsoid(0, .714, half + .007, .034, .018, .009, materials.chrome);
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
  // Real coupe/GT height: retain round tyres while lowering the glasshouse and
  // waist from the earlier toy proportions. Geometry is baked before batching.
  group.updateMatrixWorld(true);
  const moving = new Set(wheels);
  for (const child of [...group.children]) {
    if (moving.has(child)) {
      child.scale.setScalar(.9); child.position.y = .342;
    } else {
      child.position.y *= .83; child.scale.y *= .83;
    }
  }
  if (group.userData.driverPosition) group.userData.driverPosition.y *= .83;
  // Batch the stationary shell and each wheel independently: animation remains
  // unchanged, while the convertible drops well below 200 draw calls.
  mergeStaticChildren(group, { preserve: wheels, dropUVs: true });
  for (const wheel of wheels) mergeStaticChildren(wheel, { dropUVs: true });
  return {
    group,
    wheels,
    animate(speed = 0, time = 0) {
      if (Math.abs(speed) > .001) for (const wheel of wheels) wheel.rotation.x = time * speed / .342;
    },
  };
}
