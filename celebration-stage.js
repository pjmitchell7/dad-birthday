import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function seeded(seed){return()=>{seed+=0x6D2B79F5;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}

/** World-coordinate party stage; reveal group when the garage door opens. */
export function createCelebrationStage(){
  const group=new THREE.Group();group.name='Garage birthday celebration';group.visible=false;
  const random=seeded(70744),floorY=.15;
  const dark=new THREE.MeshStandardMaterial({color:0x1d2428,roughness:.79});
  const metal=new THREE.MeshStandardMaterial({color:0x78818a,metalness:.78,roughness:.29});
  const rubber=new THREE.MeshStandardMaterial({color:0x12181b,roughness:.96});
  const cabinet=new THREE.MeshStandardMaterial({color:0x232d33,roughness:.76});
  const mirrorMaterial=new THREE.MeshStandardMaterial({color:0xe2e8ec,metalness:.88,roughness:.12,envMapIntensity:1.65,emissive:0x829fc4,emissiveIntensity:.42});
  const palette=[0xff38b9,0x35c7ff,0xffb33f,0x9970ff];
  const lights=[];
  function mesh(geometry,material,parent=group){const o=new THREE.Mesh(geometry,material);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function rounded(w,h,d,x,y,z,material,r=.035,parent=group){const o=mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)),material,parent);o.position.set(x,y,z);return o;}
  function cylinder(rt,rb,h,x,y,z,material,parent=group){const o=mesh(new THREE.CylinderGeometry(rt,rb,h,24),material,parent);o.position.set(x,y,z);return o;}
  function ring(radius,tube,x,y,z,material,rotation=[0,0,0],parent=group){const o=mesh(new THREE.TorusGeometry(radius,tube,6,28),material,parent);o.position.set(x,y,z);o.rotation.set(...rotation);return o;}

  const floorMat=new THREE.MeshStandardMaterial({color:0x353c43,roughness:.48,metalness:.12});
  rounded(4.37,.08,3.74,4.65,.11,.22,floorMat,.035);
  // Recessed floor seams are understated so the dancing actor remains the focus.
  for(const x of[3.20,4.65,6.10])rounded(.009,.004,3.54,x,.153,.22,dark,.001);
  const ledMaterials=palette.map(color=>new THREE.MeshBasicMaterial({color,toneMapped:false}));
  for(let i=0;i<4;i++)rounded(.93,.027,.035,3.16+i*.99,.176,2.087,ledMaterials[i],.008);
  for(const x of[2.53,6.77])rounded(.027,.026,2.72,x,.177,.22,ledMaterials[x<4?1:0],.007);
  // Speakers stay behind the clear right-to-left dance route.
  for(const x of[2.80,6.51]){
    rounded(.49,1.05,.43,x,.72,-.56,cabinet,.055);
    for(const [y,r] of[[.52,.166],[.95,.095]]){
      const cone=mesh(new THREE.CylinderGeometry(r,r*.92,.030,32),rubber);cone.rotation.x=Math.PI/2;cone.position.set(x,y,-.326);
      ring(r,.012,x,y,-.305,metal);const centre=mesh(new THREE.SphereGeometry(r*.39,16,8),dark);centre.scale.z=.28;centre.position.set(x,y,-.295);
    }
  }

  // A true array of small flat mirror tiles catches the environment separately.
  const mirrorBall=new THREE.Group();mirrorBall.name='Spinning mirror ball';mirrorBall.position.set(4.65,1.70,.65);group.add(mirrorBall);
  const ballRadius=.28,core=mesh(new THREE.SphereGeometry(.273,32,20),dark,mirrorBall);
  const rows=14,columns=32,tileGeometry=new THREE.PlaneGeometry(1,1),tiles=new THREE.InstancedMesh(tileGeometry,mirrorMaterial,rows*columns);
  const dummy=new THREE.Object3D(),normal=new THREE.Vector3(),forward=new THREE.Vector3(0,0,1),tileColor=new THREE.Color();
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
    const theta=(row+.5)*Math.PI/rows,phi=column*Math.PI*2/columns+(row%2)*Math.PI/columns;
    normal.set(Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi));
    dummy.position.copy(normal).multiplyScalar(ballRadius);dummy.quaternion.setFromUnitVectors(forward,normal);
    dummy.scale.set(2*Math.PI*ballRadius*Math.sin(theta)/columns*.92,Math.PI*ballRadius/rows*.91,1);dummy.updateMatrix();tiles.setMatrixAt(row*columns+column,dummy.matrix);
    const brightness=.81+random()*.19;tileColor.setRGB(brightness,brightness*(.985+random()*.025),brightness);tiles.setColorAt(row*columns+column,tileColor);
  }
  tiles.castShadow=false;tiles.receiveShadow=true;mirrorBall.add(tiles);
  cylinder(.009,.009,.855,4.65,2.4075,.65,metal);
  cylinder(.052,.070,.033,4.65,2.839,.65,metal);

  // A few changing star glints keep the mirror readable when the outdoor HDR dims.
  const starSize=64,starData=new Uint8Array(starSize*starSize*4);
  for(let y=0;y<starSize;y++)for(let x=0;x<starSize;x++){
    const dx=Math.abs((x+.5-starSize/2)/(starSize/2)),dy=Math.abs((y+.5-starSize/2)/(starSize/2)),r=Math.hypot(dx,dy),k=(y*starSize+x)*4;
    const cross=Math.exp(-Math.min(dx,dy)*35)*Math.pow(Math.max(0,1-Math.max(dx,dy)),1.3),centre=Math.pow(Math.max(0,1-r*3.3),2);
    starData[k]=starData[k+1]=starData[k+2]=255;starData[k+3]=Math.round(Math.min(1,cross+centre)*255);
  }
  const starMap=new THREE.DataTexture(starData,starSize,starSize,THREE.RGBAFormat);starMap.needsUpdate=true;starMap.magFilter=THREE.LinearFilter;starMap.minFilter=THREE.LinearFilter;
  const ballGlints=[];
  for(let i=0;i<12;i++){
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:starMap,color:i%3===0?0xcceaff:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
    const y=1-2*(i+.5)/12,r=Math.sqrt(1-y*y),angle=i*2.39996;sprite.position.set(Math.cos(angle)*r,y,Math.sin(angle)*r).multiplyScalar(.286);sprite.scale.setScalar(.13);mirrorBall.add(sprite);ballGlints.push(sprite);
  }

  // Colored sweeps with restrained translucent shafts; no extra shadow maps.
  const lightTargets=[],beams=[];
  for(let i=0;i<3;i++){
    const light=new THREE.SpotLight(palette[i],150,21,.25,.65,1.45);light.position.set(4.65+(i-1)*.32,2.12,1.37);
    const target=new THREE.Object3D();target.position.set((i-1)*4+3,0,6.5);group.add(target);light.target=target;light.castShadow=false;group.add(light);lights.push(light);lightTargets.push(target);
    const beamMaterial=new THREE.MeshBasicMaterial({color:palette[i],transparent:true,opacity:.045,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});
    const beam=mesh(new THREE.CylinderGeometry(.012,1,1,20,1,true),beamMaterial);beam.castShadow=beam.receiveShadow=false;beams.push(beam);
  }
  const ballLight=new THREE.PointLight(0xe9f1ff,12,3.4,2);ballLight.position.set(4.35,2.28,2.08);group.add(ballLight);lights.push(ballLight);
  // Soft front key illuminates the cameo's white V outfit throughout the route.
  const stageKey=new THREE.SpotLight(0xeae5ff,95,9,.80,.74,2);stageKey.position.set(4.65,2.55,3.72);stageKey.target.position.set(4.65,.90,.83);stageKey.castShadow=false;group.add(stageKey,stageKey.target);lights.push(stageKey);
  const stageFill=new THREE.PointLight(0x9b8dff,13,6,2);stageFill.position.set(3.12,1.55,.12);group.add(stageFill);lights.push(stageFill);
  const stageRim=new THREE.PointLight(0xff48b7,11,6,2);stageRim.position.set(6.18,1.55,.22);group.add(stageRim);lights.push(stageRim);

  // Soft moving reflections supplement actual lights on the lawn and facade.
  const glowSize=32,glowData=new Uint8Array(glowSize*glowSize*4);
  for(let y=0;y<glowSize;y++)for(let x=0;x<glowSize;x++){const d=Math.hypot((x+.5-glowSize/2)/(glowSize/2),(y+.5-glowSize/2)/(glowSize/2)),k=(y*glowSize+x)*4;glowData[k]=glowData[k+1]=glowData[k+2]=255;glowData[k+3]=Math.round(Math.pow(Math.max(0,1-d),1.25)*180);}
  const glowMap=new THREE.DataTexture(glowData,glowSize,glowSize,THREE.RGBAFormat);glowMap.needsUpdate=true;glowMap.magFilter=THREE.LinearFilter;glowMap.minFilter=THREE.LinearFilter;
  const dotMaterials=palette.map(color=>new THREE.MeshBasicMaterial({color,map:glowMap,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide,opacity:.84}));
  const groundDots=[],wallDots=[],dotGeometry=new THREE.PlaneGeometry(1,1);
  for(let i=0;i<24;i++){
    const o=mesh(dotGeometry,dotMaterials[i%4]);o.rotation.x=-Math.PI/2;o.castShadow=o.receiveShadow=false;groundDots.push({mesh:o,phase:random()*Math.PI*2,size:.44+random()*.37});
  }
  for(let i=0;i<14;i++){
    const o=mesh(dotGeometry,dotMaterials[(i+1)%4]);o.castShadow=o.receiveShadow=false;wallDots.push({mesh:o,phase:random()*Math.PI*2,size:.29+random()*.29});
  }
  function lawnHeight(x,z){if(x>=1.8&&x<=9&&z<=11.4)return .091;if(x>=-1.8&&x<=3.2&&z>=3.65&&z<=4.75)return .157;if(x>=-1.75&&x<=-.35&&z>=3.8)return .099;return -.039;}

  // Right-side wheelie bin. The cameo starts behind it, not inside its geometry.
  const trashCan=new THREE.Group();trashCan.name='Right garage trash can';trashCan.position.set(6.45,.08,2.00);group.add(trashCan);
  const binMat=new THREE.MeshStandardMaterial({color:0x30383a,roughness:.74});
  const lidMat=new THREE.MeshStandardMaterial({color:0x242c2e,roughness:.69});
  const raisedMat=new THREE.MeshStandardMaterial({color:0x394244,roughness:.76});
  const binShape=new RoundedBoxGeometry(.62,1.01,.60,3,.066),binVertices=binShape.attributes.position;
  for(let i=0;i<binVertices.count;i++){
    const y=binVertices.getY(i),t=(y+.505)/1.01,taper=.79+.21*t;
    binVertices.setXYZ(i,binVertices.getX(i)*taper,y+.625,binVertices.getZ(i)*taper);
  }
  binShape.computeVertexNormals();mesh(binShape,binMat,trashCan);
  // A narrow dark lid seam separates the rounded body from the fitted cover.
  rounded(.625,.025,.605,0,1.128,0,rubber,.016,trashCan);
  const lid=new THREE.Group();lid.position.set(0,1.162,0);lid.rotation.x=-.055;trashCan.add(lid);
  rounded(.65,.080,.64,0,0,0,lidMat,.036,lid);
  for(const x of[-.20,-.10,0,.10,.20])rounded(.014,.011,.40,x,.043,-.018,raisedMat,.005,lid);
  rounded(.285,.034,.066,0,.015,.304,lidMat,.013,lid);
  // Rear hinge, sturdy grip and two individual rubber wheels with inset hubs.
  for(const x of[-.215,.215]){const hinge=cylinder(.030,.030,.10,x,1.16,-.295,lidMat,trashCan);hinge.rotation.z=Math.PI/2;}
  rounded(.36,.043,.052,0,1.215,-.309,lidMat,.018,trashCan);
  for(const x of[-.155,.155])rounded(.033,.074,.035,x,1.179,-.309,lidMat,.013,trashCan);
  for(const x of[-.270,.270]){
    const wheel=cylinder(.121,.121,.100,x,.121,-.228,rubber,trashCan);wheel.rotation.z=Math.PI/2;
    const hub=cylinder(.057,.057,.106,x,.121,-.228,metal,trashCan);hub.rotation.z=Math.PI/2;
    ring(.090,.008,x+Math.sign(x)*.051,.121,-.228,lidMat,[0,Math.PI/2,0],trashCan);
  }
  // Molded front channels follow the taper, plus a shallow embossed panel.
  for(const x of[-.204,.204]){const rib=rounded(.018,.72,.014,x,.66,.270,raisedMat,.006,trashCan);rib.rotation.x=.062;rib.rotation.z=-Math.sign(x)*.045;}
  rounded(.19,.13,.008,0,.827,.282,raisedMat,.024,trashCan);
  for(const y of[.810,.839])rounded(.098,.006,.005,0,y,.289,binMat,.002,trashCan);
  rounded(.225,.040,.083,0,.119,.246,lidMat,.012,trashCan);

  const cameoPath=[new THREE.Vector3(6.35,floorY,1.12),new THREE.Vector3(3.0,floorY,1.35),new THREE.Vector3(6.35,floorY,1.12)];
  const beamDirection=new THREE.Vector3(),beamUp=new THREE.Vector3(0,1,0);
  function update(time){
    if(!group.visible)return;
    mirrorBall.rotation.y=time*.58;mirrorBall.rotation.z=Math.sin(time*.37)*.018;
    ballGlints.forEach((s,i)=>{const brightness=Math.pow(Math.max(0,Math.sin(time*2.5+i*1.83)),5);s.material.opacity=.13+brightness*.87;s.scale.setScalar(.065+brightness*.15);});
    for(let i=0;i<3;i++){
      const p=time*(.19+i*.031)+i*2.1;lightTargets[i].position.set(3.4+Math.sin(p)*6.0,.12,6.6+Math.cos(p*.73+i)*3.0);lights[i].intensity=150+Math.sin(time*1.3+i*2)*30;
      beamDirection.subVectors(lights[i].position,lightTargets[i].position);const length=beamDirection.length();beams[i].position.addVectors(lights[i].position,lightTargets[i].position).multiplyScalar(.5);beams[i].quaternion.setFromUnitVectors(beamUp,beamDirection.normalize());const radius=length*Math.tan(.20);beams[i].scale.set(radius,length,radius);
    }
    groundDots.forEach(({mesh:o,phase,size},i)=>{const p=time*.24+phase,x=3.0+Math.sin(p+i*.73)*6.4,z=6.4+Math.cos(p*.81+i*.39)*3.1;o.position.set(x,lawnHeight(x,z),z);const scale=size*(.78+.22*Math.sin(time*.73+phase));o.scale.set(scale,scale,1);});
    wallDots.forEach(({mesh:o,phase,size},i)=>{const p=time*.18+phase;o.position.set(-2.15+Math.sin(p+i*.22)*3.42,3.24+Math.cos(p*.87+i*.4)*2.48,1.979);o.scale.setScalar(size*(.85+.15*Math.sin(time*.65+phase)));});
  }
  group.userData.stageFloorY=floorY;group.userData.cameoHiddenPosition=cameoPath[0].clone();
  return {group,update,mirrorBall,lights,lightTargets,beams,ballGlints,groundDots:groundDots.map(p=>p.mesh),wallDots:wallDots.map(p=>p.mesh),trashCan,stageFloorY:floorY,cameoPath,cameoHiddenPosition:cameoPath[0].clone()};
}

/** Fixed-step sky confetti plus discrete hand cannon bursts. World coordinates. */
export function createConfetti({count=1200,seed=33017,rate=145}={}){
  count=Math.max(1,Math.floor(count));let random=seeded(seed);const group=new THREE.Group();group.name='Birthday confetti';
  const geometry=new THREE.PlaneGeometry(1,1),material=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,toneMapped:false});
  const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(mesh);
  const colors=[0xffc94d,0xf964b6,0x69d8e7,0x9f87e8,0xf8ecd2,0x63b999],color=new THREE.Color(),dummy=new THREE.Object3D();
  const positions=new Float32Array(count*3),velocity=new Float32Array(count*3),life=new Float32Array(count),age=new Float32Array(count),spins=new Float32Array(count*3),sizes=new Float32Array(count*2);
  for(let i=0;i<count;i++){age[i]=999;life[i]=0;spins[i*3]=random()*6.28;spins[i*3+1]=random()*6.28;spins[i*3+2]=random()*6.28;sizes[i*2]=.024+random()*.033;sizes[i*2+1]=.045+random()*.049;color.setHex(colors[i%colors.length]);mesh.setColorAt(i,color);dummy.scale.setScalar(0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
  random=seeded(seed+1003);
  let next=0,accumulator=0,emission=0,simulationTime=0,enabled=true;
  const direction=new THREE.Vector3(),origin=new THREE.Vector3();
  function spawn(muzzle,forceHand=false){
    const i=next;next=(next+1)%count;const j=i*3,hand=Boolean(muzzle)&&(forceHand||random()<.48);
    if(hand){origin.copy(muzzle.position||muzzle);direction.copy(muzzle.direction||new THREE.Vector3(0,.7,1)).normalize();const speed=3.3+random()*2.4;positions[j]=origin.x+(random()-.5)*.035;positions[j+1]=origin.y;positions[j+2]=origin.z;velocity[j]=direction.x*speed+(random()-.5)*1.85;velocity[j+1]=direction.y*speed+1.2+random()*1.4;velocity[j+2]=direction.z*speed+(random()-.5)*1.45;}
    else{positions[j]=-6.8+random()*15.8;positions[j+1]=5.6+random()*2.4;positions[j+2]=2.0+random()*8.3;velocity[j]=(random()-.5)*.7;velocity[j+1]=-.15-random()*.4;velocity[j+2]=(random()-.5)*.5;}
    life[i]=4.5+random()*4.0;age[i]=0;
  }
  function integrate(dt){
    simulationTime+=dt;if(enabled){emission+=rate*dt;while(emission>=1){spawn(null);emission--;}}
    for(let i=0;i<count;i++){if(age[i]>=life[i])continue;const j=i*3;age[i]+=dt;velocity[j+1]-=1.55*dt;velocity[j]*=1-.24*dt;velocity[j+2]*=1-.24*dt;positions[j]+=velocity[j]*dt+Math.sin(simulationTime*1.7+spins[j])*dt*.13;positions[j+1]+=Math.max(velocity[j+1],-1.25)*dt;positions[j+2]+=velocity[j+2]*dt+Math.cos(simulationTime*1.3+spins[j+1])*dt*.10;if(positions[j+1]<-.03)age[i]=life[i];}
  }
  function update(delta=1/60,time=0){
    accumulator+=Math.min(.15,Math.max(0,delta));while(accumulator>=1/60){integrate(1/60);accumulator-=1/60;}
    for(let i=0;i<count;i++){const alive=age[i]<life[i],j=i*3;if(alive){const t=age[i],fade=Math.min(1,(life[i]-t)*3);dummy.position.set(positions[j],positions[j+1],positions[j+2]);dummy.rotation.set(spins[j]+t*3.4,spins[j+1]+t*2.25,spins[j+2]+t*2.9);dummy.scale.set(sizes[i*2]*fade,sizes[i*2+1]*fade,1);}else dummy.scale.setScalar(0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.instanceMatrix.needsUpdate=true;
  }
  function burst(position,direction=null,amount=105){const emitter={position,direction};for(let i=0;i<Math.min(count,Math.max(0,amount));i++)spawn(emitter,true);update(0,0);}
  function reset(){for(let i=0;i<count;i++){age[i]=999;life[i]=0;}next=0;accumulator=emission=simulationTime=0;random=seeded(seed+1003);update(0,0);}
  return {group,mesh,update,burst,reset,setEnabled(value){enabled=Boolean(value);},get activeCount(){let n=0;for(let i=0;i<count;i++)if(age[i]<life[i])n++;return n;}};
}
