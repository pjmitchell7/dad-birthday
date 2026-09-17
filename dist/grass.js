import * as THREE from 'three';

// Shared terrain triangles and exact height sampling keep turf and grass grounded.
const hillX=[-90,-35,-24,-20];
for(let x=-19.6;x< -6.2-1e-6;x+=.4)hillX.push(Number(x.toFixed(4)));
hillX.push(-6.2,-5,2,9,20,90);
const hillZ=[-90,-20,-10,0,5,7.6];
for(let z=7.6625;z<11.1-1e-6;z+=.0625)hillZ.push(Number(z.toFixed(4)));
hillZ.push(11.1,12.5,18.7,90);
const smoothHill=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
function designedHeight(x,z){return -.05-1.8*smoothHill((-6.2-x)/13.8)*(1-smoothHill((z-7.6)/3.5));}
function cellFor(axis,value){let lo=0,hi=axis.length-2;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(axis[mid]<=value)lo=mid;else hi=mid-1;}return lo;}
export function lawnHeight(x,z){
  const xi=cellFor(hillX,x),zi=cellFor(hillZ,z),x0=hillX[xi],x1=hillX[xi+1],z0=hillZ[zi],z1=hillZ[zi+1];
  const u=THREE.MathUtils.clamp((x-x0)/(x1-x0),0,1),v=THREE.MathUtils.clamp((z-z0)/(z1-z0),0,1);
  const h00=designedHeight(x0,z0),h10=designedHeight(x1,z0),h01=designedHeight(x0,z1),h11=designedHeight(x1,z1);
  return u+v<=1?h00+(h10-h00)*u+(h01-h00)*v:h11+(h01-h11)*(1-u)+(h10-h11)*(1-v);
}
export function createLawnGround(material){
  const positions=[],uv=[],indices=[];
  for(const z of hillZ)for(const x of hillX){positions.push(x,designedHeight(x,z),z);uv.push(x/2,z/2);}
  for(let z=0;z<hillZ.length-1;z++)for(let x=0;x<hillX.length-1;x++){
    const a=z*hillX.length+x,b=a+1,c=a+hillX.length,d=c+1;indices.push(a,c,b,b,c,d);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const ground=new THREE.Mesh(geometry,material);ground.name='Continuous lawn and left grassy hillside';ground.receiveShadow=true;ground.castShadow=false;
  ground.userData.terrain={leftEdge:-6.2,fall:1.8,levelAtSidewalk:11.1};return ground;
}

// Additive mown suburban turf for the existing Home layout. No external assets.
// The Home's ground box has its upper surface at -0.05 metres.
export function createGrass() {
  const group = new THREE.Group();
  group.name = 'Mown lawn with individual grass blades';
  const groundY = -.047;
  let state = 84173;
  const rand = () => {
    state += 0x6D2B79F5;
    let t = state; t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const excluded = [
    [1.8, 9, -.6, 11.4],             // Driveway.
    [-1.75, -.35, 3.8, 11.1],       // Front path.
    [-1.8, 3.2, 3.65, 4.75],        // Lateral front walk.
    [-90, 90, 11.1, 12.5],          // Sidewalk.
    [-90, 90, 12.7, 18.7],          // Road.
    [-6.10, 2.10, -3.35, 1.91],     // Main house.
    [1.90, 7.40, -3.35, 2.40],      // Garage.
    [-2.30, .20, 1.85, 3.38],       // Porch and rails.
    [-1.85, -.25, 2.00, 4.29],      // Porch steps.
    [13.90, 20.10, -5.10, 1.10],    // Neighbor on right.
  ];
  const trees = [[-8.8, 2, .29], [10.9, 1.5, .28], [-13, 7, .25], [14, 7, .31]];
  const shrubs = [[-5.5, 2.25, .43], [-4.5, 2.25, .43], [-3.4, 2.25, .43], [.65, 2.25, .43], [1.45, 2.25, .43], [2.3, 1.8, .53], [7.35, 1.8, .53]];
  function allowed(x, z, clearance = .052) {
    if (excluded.some(([x0,x1,z0,z1]) => x >= x0-clearance && x <= x1+clearance && z >= z0-clearance && z <= z1+clearance)) return false;
    if (trees.some(([tx,tz,r]) => Math.hypot(x-tx,z-tz) < r+clearance)) return false;
    if (shrubs.some(([tx,tz,r]) => Math.hypot(x-tx,z-tz) < r)) return false;
    return true;
  }
  function edgeDistance(x,z) {
    let d = Infinity;
    for (const [x0,x1,z0,z1] of excluded.slice(0,5)) d = Math.min(d, Math.hypot(Math.max(x0-x,0,x-x1),Math.max(z0-z,0,z-z1)));
    return d;
  }

  // Fine irregular grass strokes and mottling also read as turf at long range.
  const size = 128, pixels = new Uint8Array(size*size*4);
  for (let z=0;z<size;z++) for(let x=0;x<size;x++) {
    const i=(z*size+x)*4, grain=rand(), broad=Math.sin(x*.13+Math.sin(z*.11))*.035+Math.sin(z*.09)*.025;
    pixels[i]=70+Math.round(grain*28+broad*80);
    pixels[i+1]=98+Math.round(grain*31+broad*95);
    pixels[i+2]=39+Math.round(grain*18+broad*48);
    pixels[i+3]=255;
  }
  for(let i=0;i<2400;i++) {
    const x=Math.floor(rand()*size),z=Math.floor(rand()*size),length=2+Math.floor(rand()*7),bright=rand()>.42;
    for(let j=0;j<length;j++) {
      const xx=(x+Math.floor(j*.35))%size,zz=(z+j)%size,index=(zz*size+xx)*4;
      const delta=bright?8:-9;pixels[index]=THREE.MathUtils.clamp(pixels[index]+delta,0,255);pixels[index+1]=THREE.MathUtils.clamp(pixels[index+1]+delta,0,255);
    }
  }
  const texture = new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat);
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
  const turfMaterial = new THREE.MeshStandardMaterial({color:0xffffff,map:texture,bumpMap:texture,bumpScale:.009,roughness:1,metalness:0});
  const turfPositions=[],turfUV=[],tile=.24;
  const xMin=-12.5,xMax=12.1,zMin=-4.65,zMax=11.04;
  function addTurf(xMin,xMax,zMin,zMax,tile){
   for(let z=zMin;z<zMax;z+=tile)for(let x=xMin;x<xMax;x+=tile){
    const x1=Math.min(x+tile,xMax),z1=Math.min(z+tile,zMax);
    if(!allowed((x+x1)/2,(z+z1)/2,.008))continue;
    // Keep turf clear of hardscape even where a boundary cuts through a tile.
    if(![[x,z],[x1,z],[x,z1],[x1,z1]].every(p=>allowed(p[0],p[1],.006)))continue;
    const points=[[x,lawnHeight(x,z)+.003,z],[x,lawnHeight(x,z1)+.003,z1],[x1,lawnHeight(x1,z)+.003,z],[x1,lawnHeight(x1,z)+.003,z],[x,lawnHeight(x,z1)+.003,z1],[x1,lawnHeight(x1,z1)+.003,z1]];
    for(const p of points){turfPositions.push(...p);turfUV.push(p[0]/1.35,p[2]/1.35);}
   }
  }
  addTurf(xMin,xMax,zMin,zMax,tile);
  addTurf(-28,xMin,-10,zMax,.32);
  addTurf(xMin,-6.2,-10,zMin,.32);
  const turfGeometry=new THREE.BufferGeometry();
  turfGeometry.setAttribute('position',new THREE.Float32BufferAttribute(turfPositions,3));
  turfGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(turfUV,2));turfGeometry.computeVertexNormals();
  const turf=new THREE.Mesh(turfGeometry,turfMaterial);turf.name='Fine textured turf';turf.receiveShadow=true;turf.castShadow=false;group.add(turf);

  // Each clump has four crossed blades. Every blade bends at mid-height and
  // tapers to a point; 12 triangles per clump, with darker roots/lighter tips.
  const positions=[],colors=[],indices=[];
  // Pull the blade palette a quarter of the way toward the underlying turf.
  const rootColor=new THREE.Color('#3e5e27'),midColor=new THREE.Color('#5f8136'),tipColor=new THREE.Color('#81994b');
  for(let blade=0;blade<4;blade++) {
    const angle=blade*2.39996+.19,dx=Math.cos(angle),dz=Math.sin(angle),px=-dz,pz=dx;
    const h=.78+blade*.065,w=.074+(blade%2)*.017,bx=Math.sin(blade*3.1)*.16,bz=Math.cos(blade*2.6)*.16;
    const row=[
      [bx-px*w/2,0,bz-pz*w/2], [bx+px*w/2,0,bz+pz*w/2],
      [bx+dx*.07-px*w*.33,h*.55,bz+dz*.07-pz*w*.33],
      [bx+dx*.07+px*w*.33,h*.55,bz+dz*.07+pz*w*.33],
      [bx+dx*.29,h,bz+dz*.29],
    ];
    const offset=positions.length/3;row.forEach(p=>positions.push(...p));
    [rootColor,rootColor,midColor,midColor,tipColor].forEach(c=>colors.push(c.r,c.g,c.b));
    indices.push(offset,offset+1,offset+2,offset+1,offset+3,offset+2,offset+2,offset+3,offset+4);
  }
  const bladeGeometry=new THREE.BufferGeometry();bladeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));bladeGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));bladeGeometry.setIndex(indices);bladeGeometry.computeVertexNormals();
  const bladeMaterial=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,side:THREE.DoubleSide,roughness:.94,metalness:0});
  const clumps=[],trimmed=[];
  const step=.112;
  for(let z=zMin;z<zMax;z+=step)for(let x=xMin;x<xMax;x+=step){
    const xx=x+(rand()-.5)*step*.85,zz=z+(rand()-.5)*step*.85;
    if(!allowed(xx,zz))continue;
    const front=xx>=-8.2&&xx<=1.72&&zz>=3.45,edge=edgeDistance(xx,zz)<.29;
    // Broad, gentle variation prevents an evenly peppered carpet of clumps.
    const densityPatch=.5+.5*Math.sin(xx*.43+Math.sin(zz*.34))*Math.cos(zz*.31-xx*.12);
    const density=edge?.98:front?.88+densityPatch*.12:.39+densityPatch*.08;
    if(rand()>density)continue;
    const mowing=.5+.5*Math.sin((xx*.16+zz)*3.0),patch=.5+.5*Math.sin(xx*1.33+Math.sin(zz*.82));
    const height=edge?.046+rand()*.030:.051+rand()*.060+patch*.012;
    const entry={x:xx,z:zz,height,width:.082+rand()*.025,rotation:rand()*Math.PI*2,mowing,patch};
    (edge?trimmed:clumps).push(entry);
    if(edge&&rand()<.25){const ex=xx+(rand()-.5)*.05,ez=zz+(rand()-.5)*.05;if(allowed(ex,ez))trimmed.push({...entry,x:ex,z:ez,height:entry.height*.85,rotation:entry.rotation+1.1});}
    const pathEdge=zz>4.78&&zz<11.02&&(Math.abs(xx+1.75)<.125||Math.abs(xx+.35)<.125);
    if(pathEdge&&rand()<.18){const ex=xx+(xx< -1.75?.018:-.018),ez=zz+(rand()-.5)*.04;if(allowed(ex,ez))trimmed.push({...entry,x:ex,z:ez,height:.033+rand()*.013,width:entry.width*.88,rotation:entry.rotation+2.2});}
  }
  // Extend blades into the former neighboring lot without changing the main
  // lawn's existing random placement or color sequence.
  const hillClumps=[],savedState=state;state=117103;
  for(const [xa,xb,za,zb] of [[-28,xMin,-10,zMax],[xMin,-6.2,-10,zMin]]){
    for(let z=za;z<zb;z+=.218)for(let x=xa;x<xb;x+=.218){
      const xx=x+(rand()-.5)*.16,zz=z+(rand()-.5)*.16;
      if(xx<xa||xx>=xb||zz<za||zz>=zb||!allowed(xx,zz))continue;
      const patch=.5+.5*Math.sin(xx*.37+Math.sin(zz*.29));
      if(rand()>.58+patch*.20)continue;
      hillClumps.push({x:xx,z:zz,height:.052+rand()*.060,width:.082+rand()*.025,rotation:rand()*Math.PI*2,mowing:.5+.5*Math.sin(zz*2.6),patch});
    }
  }
  state=savedState;
  const dummy=new THREE.Object3D(),color=new THREE.Color(),up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3();
  function addInstances(entries,name){
    const instanced=new THREE.InstancedMesh(bladeGeometry,bladeMaterial,entries.length);instanced.name=name;
    for(let i=0;i<entries.length;i++){
      const p=entries[i],e=.002,dx=(lawnHeight(p.x+e,p.z)-lawnHeight(p.x-e,p.z))/(2*e),dz=(lawnHeight(p.x,p.z+e)-lawnHeight(p.x,p.z-e))/(2*e);
      dummy.position.set(p.x,lawnHeight(p.x,p.z)+.004,p.z);normal.set(-dx,1,-dz).normalize();dummy.quaternion.setFromUnitVectors(up,normal);dummy.rotateY(p.rotation);dummy.scale.set(p.width,p.height,p.width);dummy.updateMatrix();instanced.setMatrixAt(i,dummy.matrix);
      const shade=.85+rand()*.13+p.mowing*.06;
      color.setRGB(shade*(.93+p.patch*.08),shade,shade*(.91+rand()*.08));instanced.setColorAt(i,color);
    }
    instanced.instanceMatrix.needsUpdate=true;if(instanced.instanceColor)instanced.instanceColor.needsUpdate=true;
    instanced.castShadow=false;instanced.receiveShadow=true;instanced.computeBoundingBox();instanced.computeBoundingSphere();group.add(instanced);
  }
  addInstances(clumps,'Mown lawn clumps');addInstances(trimmed,'Closely trimmed pavement edges');
  addInstances(hillClumps,'Grass following the left hillside');
  group.userData.grassStats={clumps:clumps.length+trimmed.length+hillClumps.length,edgeClumps:trimmed.length,hillClumps:hillClumps.length,drawCalls:4,triangles:(clumps.length+trimmed.length+hillClumps.length)*12+turfPositions.length/9,groundY,heightRange:[.033,.123],externalAssets:0};
  // Positions retained as lightweight placement evidence for the scene QA pass.
  group.userData.grassPlacement=clumps.concat(trimmed,hillClumps).map(({x,z,height})=>({x,y:lawnHeight(x,z)+.004,z,height}));
  return group;
}
