import * as THREE from 'three';

const materials = new Map();
export function mat(color,extra={}) { const key=color+JSON.stringify(extra);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.82,...extra}));return materials.get(key); }
export function box(parent,w,h,d,x,y,z,color,extra={}){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,extra));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function ball(parent,x,y,z,sx,sy,sz,color){const m=new THREE.Mesh(new THREE.SphereGeometry(1,12,9),mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function rod(parent,a,b,r,color){const dir=new THREE.Vector3().subVectors(b,a);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,dir.length(),8),mat(color));m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());parent.add(m);m.castShadow=true;return m;}
function roof(parent,x,y,z,width,depth,height){const sh=new THREE.Shape();sh.moveTo(-width/2,0);sh.lineTo(0,height);sh.lineTo(width/2,0);sh.closePath();const m=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:false}),mat('#616462'));m.position.set(x,y,z-depth/2);m.castShadow=true;parent.add(m);rod(parent,new THREE.Vector3(x-width/2,y,z+depth/2+.02),new THREE.Vector3(x,y+height,z+depth/2+.02),.08,'#ebe5d5');rod(parent,new THREE.Vector3(x,y+height,z+depth/2+.02),new THREE.Vector3(x+width/2,y,z+depth/2+.02),.08,'#ebe5d5');return m;}
function windowUnit(parent,x,y,z,w=1,h=1.6){box(parent,w+.2,h+.2,.15,x,y,z,'#eee7d7');box(parent,w,h,.17,x,y,z+.035,'#7c9da6',{roughness:.21,metalness:.24});box(parent,.05,h,.07,x,y,z+.14,'#fff7e6');box(parent,w,.055,.07,x,y,z+.14,'#fff7e6');box(parent,w+.28,.10,.24,x,y-h/2-.08,z+.09,'#f4eddd');box(parent,w*.28,h-.10,.025,x-w*.34,y,z+.13,'#dbe1d4');box(parent,w*.28,h-.10,.025,x+w*.34,y,z+.13,'#dbe1d4');}
let seed=23;function random(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
export function createHome(){
 const group=new THREE.Group();group.name='Home';
 box(group,180,.2,180,0,-.15,0,'#70a55b');
 box(group,80,.08,6,0,-.015,15.7,'#858c87');
 box(group,80,.09,1.4,0,.02,11.8,'#e1daca');
 box(group,7.2,.11,12,5.4,.025,5.4,'#d4d1c6');
 for(let z=.5;z<11;z+=2.4)box(group,7.2,.008,.018,5.4,.087,z,'#b8bbb2');
 box(group,.018,.008,12,5.4,.087,5.4,'#b8bbb2');
 box(group,5,.12,1.1,.7,.09,4.2,'#ded8c9');
 box(group,1.4,.11,7.3,-1.05,.035,7.45,'#ded8c9');
 box(group,8,6.15,5.0,-2,3.075,-.75,'#ad6047');
 box(group,5.3,2.85,5.5,4.65,1.425,-.5,'#af634c');
 // Subtle individual brick relief on the main facade, batched into one draw call.
 const bricks=[];for(let row=0;row<42;row++){for(let col=0;col<22;col++){const x=-5.88+col*.37+(row%2)*.185;if(x>1.89)continue;bricks.push([x,.075+row*.145,1.77]);}}
 const brickMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.35,.126,.045),mat('#b36c51'),bricks.length);const tmp=new THREE.Object3D();bricks.forEach((p,i)=>{tmp.position.set(...p);tmp.updateMatrix();brickMesh.setMatrixAt(i,tmp.matrix);brickMesh.setColorAt(i,new THREE.Color().setHSL(.035+random()*.015,.32+random()*.12,.39+random()*.15));});brickMesh.receiveShadow=true;group.add(brickMesh);
 box(group,8.4,.22,5.4,-2,6.11,-.7,'#e7dfcf');roof(group,-2,6.22,-.7,8.55,5.65,1.45);
 // Front-facing central gable over the doorway.
 const gable=new THREE.Shape();gable.moveTo(-1.58,0);gable.lineTo(0,1.62);gable.lineTo(1.58,0);gable.closePath();const gableMesh=new THREE.Mesh(new THREE.ExtrudeGeometry(gable,{depth:.25,bevelEnabled:false}),mat('#ae654c'));gableMesh.position.set(-1.05,6.05,1.6);group.add(gableMesh);
 rod(group,new THREE.Vector3(-2.7,6.08,1.97),new THREE.Vector3(-1.05,7.79,1.97),.095,'#eee7d7');rod(group,new THREE.Vector3(-1.05,7.79,1.97),new THREE.Vector3(.6,6.08,1.97),.095,'#eee7d7');
 roof(group,4.65,2.9,-.45,5.7,5.85,.62);box(group,5.65,.16,.20,4.65,2.93,2.5,'#eee8da');
 for(const x of[-5.06,-3.42,-1.05,.88])windowUnit(group,x,4.8,1.88,x===-1.05?1.2:.9,1.48);
 for(const x of[-5.06,-3.42])windowUnit(group,x,1.77,1.88,.95,1.73);
 box(group,4.47,2.33,.2,4.65,1.23,2.34,'#f0eee3');
 for(let row=0;row<4;row++){for(let col=0;col<4;col++)box(group,.97,.44,.025,3.08+col*1.04,.40+row*.55,2.452,'#e3e1d8');}
 for(const x of[2.92,6.35]){box(group,.1,.14,.05,x,1.25,2.48,'#666d67');}
 box(group,1.7,2.45,.23,-1.05,1.84,1.89,'#f3ecdc');box(group,1.15,2.24,.1,-1.05,1.75,2.06,'#203d37');
 for(const x of[-1.78,-.32]){box(group,.18,2.1,.04,x,1.79,2.045,'#9daea5');for(let y=.95;y<2.7;y+=.35)box(group,.2,.025,.05,x,y,2.075,'#f7f0dc');}
 const doorPivot=new THREE.Group();doorPivot.position.set(-1.635,.63,2.11);group.add(doorPivot);
 box(doorPivot,1.17,2.25,.1,.585,1.125,0,'#24473e');for(let y=.58;y<2.2;y+=.75)box(doorPivot,.78,.56,.03,.585,y,.065,'#2d5145');ball(doorPivot,1,1.05,.11,.055,.055,.055,'#d6be79');
 const doorwayGlow=new THREE.PointLight('#ffdd76',0,4);doorwayGlow.position.set(-1.05,2.1,2.8);group.add(doorwayGlow);
 box(group,2.24,.62,1.35,-1.05,.31,2.61,'#d1c8b5');box(group,1.55,.21,2.42,-1.05,.10,3.05,'#e8e0cf');box(group,1.55,.21,1.91,-1.05,.30,2.89,'#ddd4c2');box(group,1.55,.21,1.43,-1.05,.50,2.66,'#eee5d2');
 for(const x of[-2.12,.02]){for(let z=2.1;z<3.3;z+=.28)box(group,.035,.84,.035,x,1.03,z,'#555e54');rod(group,new THREE.Vector3(x,1.47,2.08),new THREE.Vector3(x,1.47,3.31),.045,'#4b554c');}
 // Porch lantern, attached to the wall. No street light pole.
 box(group,.16,.28,.15,.11,2.33,2.04,'#283c32');box(group,.1,.17,.16,.11,2.33,2.1,'#f5da8f',{emissive:'#ffda78',emissiveIntensity:.3});
 for(const x of[-5.5,-4.5,-3.4,.65,1.45]){ball(group,x,.4,2.2,.55,.44,.46,'#427443');ball(group,x+.2,.56,2.15,.38,.35,.33,'#53854a');}
 for(let i=0;i<28;i++){const x=-5.7+random()*7.3;if(x>-2.6&&x<.25)continue;ball(group,x,.23,2.45+random()*.25,.09,.13,.09,['#f2ce65','#df9177','#e9e4bd'][i%3]);}
 for(const x of[2.3,7.35]){ball(group,x,1.05,1.8,.36,1.05,.4,'#467444');}
 // The familiar mailbox stays by the curb.
 box(group,.13,1.34,.13,1.48,.67,10.82,'#3f5148');box(group,.52,.42,.69,1.48,1.5,10.82,'#34473e');box(group,.57,.06,.73,1.48,1.72,10.82,'#40544a');box(group,.04,.16,.07,1.8,1.53,10.8,'#a0543a');
 const trees=[];
 function tree(x,z,size=1){const t=new THREE.Group();t.position.set(x,0,z);t.scale.setScalar(size);group.add(t);box(t,.27,3.4,.28,0,1.7,0,'#6d6650');for(let i=0;i<5;i++){const a=i*2.4;ball(t,Math.sin(a)*.68,3.3+(i%2)*.65,Math.cos(a)*.65,1.2,1.5,1.2,['#507e51','#629254','#729e5b'][i%3]);}trees.push(t);}
 for(let i=0;i<18;i++)tree(-18+i*2.3,-6-random()*4,.9+random()*.6);tree(-8.8,2,1.18);tree(10.9,1.5,1.1);tree(-13,7,.9);tree(14,7,1.2);
 // Soft neighborhood silhouettes, kept outside the main home.
 for(const x of[-16,17]){box(group,6,5,6,x,2.5,-2,'#d6d6bf');roof(group,x,5,-2,6.4,6.4,1.5);for(const wx of[x-1.7,x,x+1.7])windowUnit(group,wx,3.6,1.06,.7,1.2);}
 const clouds=[];for(let i=0;i<7;i++){const c=new THREE.Group();c.position.set(-25+i*9,13+random()*5,-19-random()*10);for(let j=0;j<4;j++)ball(c,j*1.15,Math.sin(j)*.35,0,1.7,.65,.7,'#f4f3e8');group.add(c);clouds.push(c);}
 return {group,doorPivot,doorwayGlow,trees,clouds};
}
