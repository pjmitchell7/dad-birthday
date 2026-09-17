import * as THREE from 'three';

// An asset-only replacement for foliage.js. Existing foundation shrubs keep
// their positions and leaf construction; the tree row is deliberately opened.
const UP = new THREE.Vector3(0, 1, 0);
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
function randomSource(seed) {
  return () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
}

function geometry(positions, indices, colors) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function leafSprayGeometry() {
  const p = [], ix = [], colors = [];
  // Five curved, overlapping leaf blades share one short branch. All growth
  // is attached to a crown, instead of randomly suspended inside a volume.
  for (let n = 0; n < 5; n++) {
    const a = (n - 2) * .47;
    const len = .34 - Math.abs(n - 2) * .024;
    const w = .083;
    const ca = Math.cos(a), sa = Math.sin(a), start = p.length / 3;
    const shape = [[0,0,0],[-w,.013,len*.29],[-w*.68,.037,len*.68],
      [0,.060,len],[w*.68,.037,len*.68],[w,.013,len*.29],[0,.054,len*.47]];
    for (let k = 0; k < shape.length; k++) {
      const [x,y,z] = shape[k];
      p.push(x*ca+z*sa, y, -x*sa+z*ca+(n%2)*.022);
      const tint = k === 0 ? .80 : k === 6 ? 1 : .94;
      colors.push(tint, tint, tint);
    }
    for (let k = 0; k < 6; k++) ix.push(start+6,start+k,start+(k+1)%6);
  }
  return geometry(p, ix, colors);
}

function chooseTrees(specs) {
  const available = specs.filter(s => !s.shrub);
  if (available.length <= 5) return available;
  const targets = [[-9,1.5],[-15,-8],[11,1.5],[16,-8],[23,-10]];
  const selected = [];
  for (const [tx,tz] of targets) {
    const candidates = available.filter(s => !selected.includes(s));
    candidates.sort((a,b) => (a.x-tx)**2+(a.z-tz)**2 - ((b.x-tx)**2+(b.z-tz)**2));
    selected.push(candidates[0]);
  }
  return selected.map(s => ({...s,size:clamp(s.size ?? 1,.93,1.18)}));
}

function addShrubs(root, specs) {
  if (!specs.length) return;
  const rng = randomSource(451);
  const g = geometry([0,0,.025,-.16,.15,0,-.12,.36,0,0,.53,0,.12,.36,0,.16,.15,0],
    [0,1,2,0,2,3,0,3,4,0,4,5]);
  const mat = new THREE.MeshStandardMaterial({color:'#7b9259',roughness:.95,side:THREE.DoubleSide});
  const leaves = new THREE.InstancedMesh(g,mat,specs.length*330);
  leaves.name = 'Preserved foundation shrubs';
  leaves.castShadow = leaves.receiveShadow = true;
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  let index = 0;
  for (const {x,z,size=1} of specs) {
    for (let i=0;i<330;i++) {
      const a=rng()*TAU,v=rng()*2-1,r=Math.cbrt(rng())*.48*size,h=Math.sqrt(1-v*v);
      dummy.position.set(x+Math.cos(a)*h*r,.38*size+v*r*.65,z+Math.sin(a)*h*r);
      dummy.rotation.set(rng()*Math.PI,rng()*TAU,rng()*TAU);
      dummy.scale.setScalar(.33*size*(.6+rng()*.8));
      dummy.updateMatrix(); leaves.setMatrixAt(index,dummy.matrix);
      leaves.setColorAt(index++,color.setHSL(.22+rng()*.055,.25+rng()*.25,.22+rng()*.16));
    }
  }
  leaves.instanceMatrix.needsUpdate = true;
  leaves.instanceColor.needsUpdate = true;
  root.add(leaves);
}

export function createFoliage(specs = []) {
  const root = new THREE.Group();
  root.name = 'Foliage - separated branch-supported crowns';
  addShrubs(root,specs.filter(s => s.shrub));
  const trees=chooseTrees(specs);
  const sprays=[], crowns=[];
  const woodP=[],woodI=[],woodC=[];
  const barkColor=new THREE.Color();

  function woodyCurve(points, r0, r1, seed) {
    const curve=new THREE.CatmullRomCurve3(points);
    const rings=10,sides=9,start=woodP.length/3;
    for(let j=0;j<=rings;j++) {
      const t=j/rings,c=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
      const rotation=new THREE.Quaternion().setFromUnitVectors(UP,tangent);
      const radius=THREE.MathUtils.lerp(r0,r1,t)*(j===0?1.13:1);
      for(let k=0;k<sides;k++) {
        const a=k/sides*TAU,r=radius*(1+.05*Math.sin(a*3+seed));
        const offset=new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r).applyQuaternion(rotation);
        woodP.push(c.x+offset.x,c.y+offset.y,c.z+offset.z);
        barkColor.set('#66513b').multiplyScalar(.86+.10*Math.sin(a+seed)+.12*t);
        woodC.push(barkColor.r,barkColor.g,barkColor.b);
      }
    }
    for(let j=0;j<rings;j++) for(let k=0;k<sides;k++) {
      const a=start+j*sides+k,b=start+j*sides+(k+1)%sides,c=a+sides,d=b+sides;
      woodI.push(a,c,b,b,c,d);
    }
  }

  // Closed, asymmetrical lobed growth envelopes remove the first revision's
  // umbrella shelves. Each one tilts independently and carries leaves over
  // its sides and underside as well as its upper surface.
  function crownSurface(c,rx,rz,rise,seed) {
    const tilt=new THREE.Quaternion().setFromEuler(new THREE.Euler(
      .20*Math.sin(seed*1.13),seed*.79,.27*Math.cos(seed*.83)));
    const point=(phi,a) => {
      const sin=Math.sin(phi),cos=Math.cos(phi);
      const edge=1+.14*Math.sin(3*a+seed)*sin+.09*Math.sin(5*a+phi*3-seed*.6)*sin;
      const local=new THREE.Vector3(
        Math.cos(a)*sin*edge*rx+.16*rx*sin*cos,
        cos*rise*(1+.12*Math.sin(a*3+seed)*sin)+.12*rise*Math.cos(a*2-seed)*sin,
        Math.sin(a)*sin*edge*rz);
      return local.applyQuaternion(tilt).add(c);
    };
    const p=[],ix=[],col=[];
    const sectors=40,rings=16;
    const lowerColor=new THREE.Color('#294b24');
    const upperColor=new THREE.Color(seed%3===0?'#527534':'#456a2c');
    for(let j=0;j<=rings;j++) for(let k=0;k<=sectors;k++) {
      const phi=clamp(j/rings*Math.PI,.0001,Math.PI-.0001),a=k/sectors*TAU,v=point(phi,a);
      p.push(v.x,v.y,v.z);
      const tint=lowerColor.clone().lerp(upperColor,(Math.cos(phi)+1)*.5);
      col.push(tint.r,tint.g,tint.b);
    }
    for(let j=0;j<rings;j++) for(let k=0;k<sectors;k++) {
      const a=j*(sectors+1)+k,b=a+1,c=a+sectors+1,d=c+1;
      ix.push(a,b,c,b,d,c);
    }
    crowns.push(geometry(p,ix,col));
    const rng=randomSource(seed*991+7241);
    const leafLow=new THREE.Color('#3c622a');
    const leafHigh=new THREE.Color(seed%3===0?'#739442':'#648b39');
    // Fibonacci placement covers the whole closed crown. Leaves remain
    // attached and overlap; their color changes by growth mass, not confetti.
    const count=340;
    for(let i=0;i<count;i++) {
      const vertical=1-2*(i+.5)/count,phi=Math.acos(vertical),a=i*2.399963+seed*.27;
      const pos=point(phi,a);
      const normal=new THREE.Vector3(Math.cos(a)*Math.sin(phi)/rx,Math.cos(phi)/rise,
        Math.sin(a)*Math.sin(phi)/rz).normalize().applyQuaternion(tilt);
      const q=new THREE.Quaternion().setFromUnitVectors(UP,normal);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(UP,a+(rng()-.5)*.7));
      const tint=leafLow.clone().lerp(leafHigh,(normal.y+1)*.5).multiplyScalar(.96+rng()*.08);
      sprays.push({pos:pos.addScaledVector(normal,.035),q,scale:1.09+(rng()-.5)*.24,tint});
    }
  }

  for(let n=0;n<trees.length;n++) {
    const {x,z,size=1}=trees[n],rng=randomSource(2147+n*113),s=size;
    const base=new THREE.Vector3(x,0,z),lean=(n%2?-.25:.22)*s;
    const fork=new THREE.Vector3(x+lean,3.1*s,z-.07*s);
    const top=new THREE.Vector3(x+lean*.7,6.15*s,z+.18*s);
    woodyCurve([base,new THREE.Vector3(x-.06*s,1.5*s,z),fork,top],.24*s,.045*s,n);
    // Asymmetry follows a main leader and six outward scaffold branches.
    for(let j=0;j<7;j++) {
      const a=j*2.39996+n*.61,high=j===6;
      const radius=(high?.25:1.14+rng()*.40)*s;
      const crownY=(high?5.98:4.62+j*.16+rng()*.28)*s;
      const tip=new THREE.Vector3(x+lean+Math.cos(a)*radius,crownY,z+Math.sin(a)*radius*.9);
      const branchStart=new THREE.Vector3(x+lean*.6,(2.6+(j%3)*.35)*s,z);
      const elbow=branchStart.clone().lerp(tip,.58);elbow.y-=.32*s;
      woodyCurve([branchStart,elbow,tip],.10*s,.021*s,j+n*7);
      for(let k=0;k<2;k++) {
        const aa=a+(k?1:-1)*.52;
        const twig=tip.clone().add(new THREE.Vector3(Math.cos(aa)*.68*s,.22*s,Math.sin(aa)*.56*s));
        woodyCurve([elbow.clone().lerp(tip,.55),tip,twig],.033*s,.008*s,j*5+k);
      }
      crownSurface(tip,(1.25+rng()*.24)*s,(1.00+rng()*.22)*s,
        (high?1.13:1.03+rng()*.15)*s,n*17+j+3);
    }
    // Root flare connects the tree to the ground instead of ending as a pole.
    for(let k=0;k<4;k++) {
      const a=k*Math.PI/2+n*.4;
      woodyCurve([new THREE.Vector3(x,.33*s,z),
        new THREE.Vector3(x+Math.cos(a)*.25*s,.12*s,z+Math.sin(a)*.25*s),
        new THREE.Vector3(x+Math.cos(a)*.48*s,.025,z+Math.sin(a)*.48*s)],.115*s,.022*s,k);
    }
  }
  if(woodP.length) {
    const bark=new THREE.Mesh(geometry(woodP,woodI,woodC),new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.96}));
    bark.name='Curved scaffold branches and root flares';bark.castShadow=bark.receiveShadow=true;root.add(bark);
  }
  const crownMat=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:1,side:THREE.DoubleSide});
  for(const g of crowns) {const mesh=new THREE.Mesh(g,crownMat);mesh.name='Closed irregular lobed growth mass';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}
  if(sprays.length) {
    const leaves=new THREE.InstancedMesh(leafSprayGeometry(),new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.89,side:THREE.DoubleSide}),sprays.length);
    leaves.name='Overlapping attached leaf sprays';leaves.castShadow=leaves.receiveShadow=true;
    const dummy=new THREE.Object3D();
    sprays.forEach(({pos,q,scale,tint},i)=>{dummy.position.copy(pos);dummy.quaternion.copy(q);dummy.scale.setScalar(scale);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,tint);});
    leaves.instanceMatrix.needsUpdate=true;leaves.instanceColor.needsUpdate=true;leaves.computeBoundingSphere();root.add(leaves);
  }
  root.userData.foliageRevision={revision:'volumetric-crowns-2',trees:trees.length,shrubs:specs.filter(s=>s.shrub).length,leafSprays:sprays.length};
  return root;
}
