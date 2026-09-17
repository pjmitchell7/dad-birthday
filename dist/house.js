import * as THREE from 'three';
import { createFoliage } from './foliage.js';
import { createGrass, createLawnGround, lawnHeight } from './grass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const materials = new Map();
export function mat(color,extra={}) { const key=color+JSON.stringify(extra);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.82,...extra}));return materials.get(key); }
export function box(parent,w,h,d,x,y,z,color,extra={}){const g=new RoundedBoxGeometry(w,h,d,2,Math.min(.045,w*.08,h*.08,d*.08)),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++){uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/2,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/2);}const m=new THREE.Mesh(g,mat(color,extra));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function ball(parent,x,y,z,sx,sy,sz,color){const m=new THREE.Mesh(new THREE.SphereGeometry(1,12,9),mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function rod(parent,a,b,r,color){const dir=new THREE.Vector3().subVectors(b,a);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,dir.length(),8),mat(color));m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());parent.add(m);m.castShadow=true;return m;}
function roof(parent,x,y,z,width,depth,height){const w=width/2,d=depth/2,r=w*.67;const points=[[-w,0,d],[w,0,d],[w,0,-d],[-w,0,-d],[-r,height,0],[r,height,0]];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,4,1,5,4,1,2,5,2,3,5,3,4,5,3,0,4]);g.setAttribute('uv',new THREE.Float32BufferAttribute(points.flatMap(p=>[p[0]/2,p[2]/2]),2));g.computeVertexNormals();const m=new THREE.Mesh(g.toNonIndexed(),mat('#616462',{side:THREE.DoubleSide}));m.geometry.computeVertexNormals();m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);box(parent,width,.13,.15,x,y,z+d,'#eee8dc');return m;}
function windowUnit(parent,x,y,z,w=1,h=1.6){box(parent,w+.2,h+.2,.15,x,y,z,'#eee7d7');box(parent,w,h,.17,x,y,z+.035,'#415b69',{roughness:.12,metalness:.68,envMapIntensity:1.8});box(parent,.05,h,.07,x,y,z+.14,'#fff7e6');box(parent,w,.055,.07,x,y,z+.14,'#fff7e6');box(parent,w+.28,.10,.24,x,y-h/2-.08,z+.09,'#f4eddd');box(parent,w*.19,h-.12,.025,x-w*.395,y,z+.125,'#a7b0ad');box(parent,w*.19,h-.12,.025,x+w*.395,y,z+.125,'#a7b0ad');}
let seed=23;function random(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
export function createHome(){
 const group=new THREE.Group();group.name='Home';
 group.add(createLawnGround(mat('#70a55b')));
 box(group,80,.08,6,0,-.015,15.7,'#858c87');
 box(group,80,.09,1.4,0,.02,11.8,'#e1daca');
 box(group,7.2,.11,12,5.4,.025,5.4,'#d4d1c6');
 for(let z=.5;z<11;z+=2.4)box(group,7.2,.008,.018,5.4,.087,z,'#b8bbb2');
 box(group,.018,.008,12,5.4,.087,5.4,'#b8bbb2');
 box(group,5,.12,1.1,.7,.09,4.2,'#ded8c9');
 box(group,1.4,.11,7.3,-1.05,.035,7.45,'#ded8c9');
 box(group,8,6.15,5.0,-2,3.075,-.75,'#ad6047');
 // A hollow garage lets the birthday surprise live behind its moving door.
 box(group,.35,2.85,5.5,2.175,1.425,-.5,'#af634c');box(group,.35,2.85,5.5,7.125,1.425,-.5,'#af634c');box(group,5.3,2.85,.28,4.65,1.425,-3.12,'#af634c');box(group,5.3,.4,.3,4.65,2.65,2.20,'#af634c');box(group,4.65,.08,5.1,4.65,.04,-.35,'#b1b5b1');
 // Subtle individual brick relief on the main facade, batched into one draw call.
 box(group,8.4,.16,5.4,-2,6.11,-.7,'#e7dfcf');roof(group,-2,6.22,-.7,8.55,5.65,1.04);
 // Front-facing central gable over the doorway.
 const gable=new THREE.Shape();gable.moveTo(-1.58,0);gable.lineTo(0,1.62);gable.lineTo(1.58,0);gable.closePath();const gableMesh=new THREE.Mesh(new THREE.ExtrudeGeometry(gable,{depth:.25,bevelEnabled:false}),mat('#ae654c'));gableMesh.position.set(-1.05,6.05,1.6);group.add(gableMesh);
 rod(group,new THREE.Vector3(-2.7,6.08,1.97),new THREE.Vector3(-1.05,7.79,1.97),.095,'#eee7d7');rod(group,new THREE.Vector3(-1.05,7.79,1.97),new THREE.Vector3(.6,6.08,1.97),.095,'#eee7d7');
 roof(group,4.65,2.9,-.45,5.7,5.85,.62);box(group,5.65,.16,.20,4.65,2.93,2.5,'#eee8da');
 for(const x of[-5.06,-3.42,-1.05,.88])windowUnit(group,x,4.8,1.88,x===-1.05?1.2:.9,1.48);
 for(const x of[-5.06,-3.42])windowUnit(group,x,1.77,1.88,.95,1.73);
 const garageDoor=new THREE.Group();garageDoor.name='Opening garage door';garageDoor.position.set(4.65,2.40,2.34);group.add(garageDoor);box(garageDoor,4.47,2.33,.2,0,-1.17,0,'#c6ccc6');
 for(let row=0;row<4;row++){for(let col=0;col<4;col++){const x=3.08+col*1.04-4.65,y=.40+row*.55-2.40;box(garageDoor,.97,.44,.048,x,y,.122,'#b5bcb7');box(garageDoor,.88,.35,.05,x,y,.142,'#d8dcd5');}}
 for(const x of[2.92,6.35]){box(garageDoor,.1,.14,.05,x-4.65,-1.15,.14,'#666d67');}
 const entrance=new THREE.Shape();entrance.moveTo(-.92,0);entrance.lineTo(-.92,2.04);entrance.quadraticCurveTo(-.92,2.5,0,2.5);entrance.quadraticCurveTo(.92,2.5,.92,2.04);entrance.lineTo(.92,0);entrance.closePath();const opening=new THREE.Path();opening.moveTo(-.76,0);opening.lineTo(.76,0);opening.lineTo(.76,2.03);opening.quadraticCurveTo(.76,2.34,0,2.34);opening.quadraticCurveTo(-.76,2.34,-.76,2.03);opening.closePath();entrance.holes.push(opening);const entranceFrame=new THREE.Mesh(new THREE.ExtrudeGeometry(entrance,{depth:.15,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.018,bevelThickness:.018,curveSegments:20}),mat('#f3ecdc'));entranceFrame.position.set(-1.05,.62,1.99);entranceFrame.castShadow=true;entranceFrame.receiveShadow=true;group.add(entranceFrame);box(group,1.15,2.24,.1,-1.05,1.75,2.06,'#203d37');
 for(const x of[-1.78,-.32]){box(group,.18,2.1,.04,x,1.79,2.045,'#9daea5');for(let y=.95;y<2.7;y+=.35)box(group,.2,.025,.05,x,y,2.075,'#f7f0dc');}
 const doorPivot=new THREE.Group();doorPivot.position.set(-1.635,.63,2.11);group.add(doorPivot);
 box(doorPivot,1.17,2.25,.1,.585,1.125,0,'#24473e');for(let y=.58;y<2.2;y+=.75)box(doorPivot,.78,.56,.03,.585,y,.065,'#2d5145');ball(doorPivot,1,1.05,.11,.055,.055,.055,'#d6be79');
 const doorwayGlow=new THREE.PointLight('#ffdd76',0,4);doorwayGlow.position.set(-1.05,2.1,2.8);group.add(doorwayGlow);
 box(group,2.24,.62,1.35,-1.05,.31,2.61,'#d1c8b5');box(group,1.55,.21,2.42,-1.05,.10,3.05,'#e8e0cf');box(group,1.55,.21,1.91,-1.05,.30,2.89,'#ddd4c2');box(group,1.55,.21,1.43,-1.05,.50,2.66,'#eee5d2');
 for(const x of[-2.12,.02]){for(let z=2.1;z<3.3;z+=.28)box(group,.035,.84,.035,x,1.03,z,'#555e54');rod(group,new THREE.Vector3(x,1.47,2.08),new THREE.Vector3(x,1.47,3.31),.045,'#4b554c');}
 // Porch lantern, attached to the wall. No street light pole.
 box(group,.16,.28,.15,.11,2.33,2.04,'#283c32');box(group,.1,.17,.16,.11,2.33,2.1,'#f5da8f',{emissive:'#ffda78',emissiveIntensity:.3});
 const foliageSpecs=[];for(const x of[-5.5,-4.5,-3.4,.95])foliageSpecs.push({x,z:2.72,size:1.2,shrub:true});
 for(let i=0;i<28;i++){const x=-5.7+random()*7.3;if(x>-2.6&&x<.25)continue;const z=2.65+random()*.25,h=.23+random()*.17;rod(group,new THREE.Vector3(x,0,z),new THREE.Vector3(x,h,z),.009,'#4f783b');for(let petal=0;petal<6;petal++){const a=petal*Math.PI/3;const m=ball(group,x+Math.cos(a)*.048,h,z+Math.sin(a)*.048,.045,.018,.03,['#f4ca56','#e1a09b','#f4efe0'][i%3]);m.rotation.y=-a;}ball(group,x,h+.014,z,.021,.017,.021,'#bb8132');}
 // The right-side planting bed is wholly outside the garage wall/opening.
 box(group,1.45,.03,1.85,8.2,.102,1.5,'#645341');foliageSpecs.push({x:8.2,z:1.5,size:1,shrub:true});
 // The familiar mailbox stays by the curb.
 box(group,.13,1.34,.13,1.48,.67,10.82,'#3f5148');box(group,.52,.42,.69,1.48,1.5,10.82,'#34473e');box(group,.57,.06,.73,1.48,1.72,10.82,'#40544a');box(group,.04,.16,.07,1.8,1.53,10.8,'#a0543a');
 const trees=[];
 function tree(x,z,size=1){foliageSpecs.push({x,z,size});}
 for(let i=0;i<18;i++)tree(-18+i*2.3,-6-random()*4,.9+random()*.6);tree(-8.8,2,1.18);tree(10.9,1.5,1.1);tree(-13,7,.9);tree(14,7,1.2);
 // Soft neighborhood silhouettes, kept outside the main home.
 for(const x of[17]){box(group,6,5,6,x,2.5,-2,'#d6d6bf');roof(group,x,5,-2,6.4,6.4,1.5);for(const wx of[x-1.7,x,x+1.7])windowUnit(group,wx,3.6,1.06,.7,1.2);}
 const foliage=createFoliage(foliageSpecs);
 // Keep the current crowns and shrubs. Translate each left tree onto the hill
 // as a rigid tree, including its already-batched branches and attached leaves.
 const available=foliageSpecs.filter(s=>!s.shrub),selected=[];
 for(const [tx,tz] of [[-9,1.5],[-15,-8],[11,1.5],[16,-8],[23,-10]]){
   const candidates=available.filter(s=>!selected.includes(s));candidates.sort((a,b)=>(a.x-tx)**2+(a.z-tz)**2-((b.x-tx)**2+(b.z-tz)**2));if(candidates[0])selected.push(candidates[0]);
 }
 const offsetAt=(x,z)=>{let nearest=selected[0],distance=Infinity;for(const tree of selected){const d=(x-tree.x)**2+(z-tree.z)**2;if(d<distance){nearest=tree;distance=d;}}return nearest?lawnHeight(nearest.x,nearest.z)+.05:0;};
 const foliageMatrix=new THREE.Matrix4(),foliagePoint=new THREE.Vector3();
 foliage.traverse(object=>{
   if(!object.isMesh||object.name==='Preserved foundation shrubs')return;
   if(object.isInstancedMesh){for(let i=0;i<object.count;i++){object.getMatrixAt(i,foliageMatrix);foliagePoint.setFromMatrixPosition(foliageMatrix);foliageMatrix.elements[13]+=offsetAt(foliagePoint.x,foliagePoint.z);object.setMatrixAt(i,foliageMatrix);}object.instanceMatrix.needsUpdate=true;object.computeBoundingBox();object.computeBoundingSphere();}
   else{const p=object.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+offsetAt(p.getX(i),p.getZ(i)));p.needsUpdate=true;object.geometry.computeBoundingBox();object.geometry.computeBoundingSphere();}
 });
 foliage.userData.hillTreeOffsets=selected.map(({x,z})=>({x,z,offset:lawnHeight(x,z)+.05}));
 group.add(foliage);group.add(createGrass());const clouds=[];
 return {group,doorPivot,doorwayGlow,entranceFrame,garageDoor,trees,clouds};
}
