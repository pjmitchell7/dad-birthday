import * as THREE from 'three';

/**
 * Continuous, UV-mapped MakeHuman character, fitted clothing and a 163-bone rig.
 * All MakeHuman geometry, targets and textures used here are CC0-1.0.
 * await createDad() -> { group, setOutfit(mode), animate(seconds,state),
 *                       getCannonWorldPosition(target?), getCannonWorldDirection(target?) }
 * Outfit modes: default / movie / gym / drive / party.
 * States: idle / wave / selected / walk / driving / disco.
 * Copy this file together with v2/runtime. No nude or partially loaded state is returned.
 */
export async function createDad(options = {}) {
  const assetURL=name=>new URL(name,options.assetBaseURL||new URL('./v2/runtime/',import.meta.url));
  const data = options.data || await fetch(assetURL('dad-human.json')).then(r => { if (!r.ok) throw new Error('Character data unavailable'); return r.json(); });
  if(data.packed){
    const buffer=options.buffer||await fetch(assetURL('dad-human.bin')).then(r=>{if(!r.ok)throw new Error('Character geometry unavailable');return r.arrayBuffer();});
    const types={Float32Array,Uint16Array,Uint32Array};
    for(const geo of Object.values(data.geo))for(const [key,d]of Object.entries(geo))geo[key]=new types[d.type](buffer,d.byteOffset,d.length);
    data.packed=false;
  }
  const loader = new THREE.TextureLoader();
  async function texture(name, color = true) {
    if (options.skipTextures) return null;
    const t = await loader.loadAsync(assetURL(name).href);
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 4; return t;
  }
  const [skinMap, eyeMap, browMap, shoeMap, clothesNormal, vacationNormal, hatMap] = await Promise.all([
    texture('skin.png'), texture('eyes.png'), texture('brows.png'), texture('shoes.png'),
    texture('clothes-normal.png',false), texture('vacation-normal.png',false), texture('hat.png')
  ]);
  const group = new THREE.Group(); group.name = 'Dad — continuous human mesh';
  const model = new THREE.Group(); group.add(model); model.position.y = .026;
  const boneMap = {}, rest = {};
  for (const def of data.bones) { const b = new THREE.Bone(); b.name = def.name; boneMap[def.name] = b; rest[def.name] = def; }
  for (const def of data.bones) {
    const b = boneMap[def.name]; b.position.fromArray(def.head);
    if (def.parent) { b.position.sub(new THREE.Vector3(...rest[def.parent].head)); boneMap[def.parent].add(b); }
    else model.add(b);
  }
  model.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(data.bones.map(b => boneMap[b.name]));
  skeleton.calculateInverses();
  // Inverses are expressed in the model's local coordinates before the grounding offset.
  model.position.y = 0; model.updateMatrixWorld(true); skeleton.calculateInverses();
  const materials = {
    skin: new THREE.MeshStandardMaterial({map:skinMap,color:skinMap?'#fff5eb':'#825b45',roughness:.74}),
    eyes: new THREE.MeshStandardMaterial({map:eyeMap,roughness:.24,color:'#ffffff',transparent:true,alphaTest:.1,depthWrite:false}),
    brows: new THREE.MeshStandardMaterial({map:browMap,alphaTest:.23,transparent:true,roughness:.97,side:THREE.DoubleSide,color:'#48382e'}),
    tank: new THREE.MeshStandardMaterial({color:'#efc33c',roughness:.98,side:THREE.DoubleSide}),
    tee: new THREE.MeshStandardMaterial({color:'#20272c',roughness:.98,normalMap:clothesNormal,normalScale:new THREE.Vector2(.45,.45),side:THREE.DoubleSide}),
    vacation: new THREE.MeshStandardMaterial({color:'#e6ad7c',roughness:.96,normalMap:vacationNormal,normalScale:new THREE.Vector2(.28,.28),side:THREE.DoubleSide}),
    pants: new THREE.MeshStandardMaterial({color:'#454a4e',roughness:1,side:THREE.DoubleSide}),
    cuffs: new THREE.MeshStandardMaterial({color:'#3b4045',roughness:1,side:THREE.DoubleSide}),
    shoes: new THREE.MeshStandardMaterial({map:shoeMap,color:'#bcc2c1',roughness:.9}),
    hat: new THREE.MeshStandardMaterial({map:hatMap,color:'#f3d596',roughness:1,side:THREE.DoubleSide})
  };
  // The CC0 skin photograph has painted short hair. Replace only its scalp
  // region with a hairless forehead-matched tone; the continuous mesh is bald.
  materials.skin.onBeforeCompile = shader => {
    shader.uniforms.dadScalpColor = {value:new THREE.Color('#69412b')};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vDadSkinPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvDadSkinPosition=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vDadSkinPosition;\nuniform vec3 dadScalpColor;').replace('#include <map_fragment>',`#include <map_fragment>
      float scalpFront=smoothstep(.065,.205,vDadSkinPosition.z);
      float scalpStart=mix(2.205,2.325,scalpFront);
      float scalpMask=smoothstep(scalpStart,scalpStart+.023,vDadSkinPosition.y);
      float scalpVariation=.985+.015*sin(vDadSkinPosition.x*73.0+vDadSkinPosition.z*51.0);
      diffuseColor.rgb=mix(diffuseColor.rgb,dadScalpColor*scalpVariation,scalpMask);`).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.49,scalpMask);');
  };
  materials.skin.customProgramCacheKey=()=> 'dad-hairless-scalp-v1';
  // Woven leaf pattern is shader detail on the actual tailored vacation shirt.
  materials.vacation.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vClothPosition;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvClothPosition=position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vClothPosition;').replace('#include <color_fragment>', `#include <color_fragment>
      vec2 cell=fract(vClothPosition.xy*19.0+vec2(step(0.5,fract(vClothPosition.y*9.5))*.5,0.0))-.5;
      float leaf=1.0-smoothstep(.85,1.0,pow((cell.x+cell.y*.36)*5.1,2.0)+pow(cell.y*2.2,2.0));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.13,.27,.21),leaf*.78);`);
  };
  const meshes = {};
  for (const [name, def] of Object.entries(data.geo)) {
    const geo = new THREE.BufferGeometry();
    for (const [key,size,Type] of [['position',3,THREE.Float32BufferAttribute],['normal',3,THREE.Float32BufferAttribute],['uv',2,THREE.Float32BufferAttribute],['skinIndex',4,THREE.Uint16BufferAttribute],['skinWeight',4,THREE.Float32BufferAttribute]])geo.setAttribute(key,new Type(def[key],size));
    geo.setIndex(new THREE.BufferAttribute(ArrayBuffer.isView(def.index)?def.index:new Uint16Array(def.index),1));
    const material = name === 'body' ? materials.skin : name === 'eyes' ? materials.eyes : materials[name];
    const m = new THREE.SkinnedMesh(geo,material); m.name = `Dad ${name}`; m.castShadow=true; m.receiveShadow=true; m.frustumCulled=false;
    m.bind(skeleton,new THREE.Matrix4()); model.add(m); meshes[name]=m;
  }
  model.position.y=.026;
  const M = (color, roughness=.75, extra={}) => new THREE.MeshStandardMaterial({color,roughness,...extra});
  const black=M('#171d20',.65),ivory=M('#fff2d6'),silver=M('#959b9b',.45,{metalness:.5}),red=M('#cf5942'),gold=M('#cbaa62',.33,{metalness:.65});
  function mesh(g,m,p,pos=[0,0,0]){const o=new THREE.Mesh(g,m);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  function ell(p,m,pos,s){const o=mesh(new THREE.SphereGeometry(1,14,10),m,p,pos);o.scale.set(...s);return o;}
  function line(p,m,points,r=.005){const c=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)));return mesh(new THREE.TubeGeometry(c,20,r,7,false),m,p);}
  function box(p,m,w,h,d,pos,r=.008){
    const s=new THREE.Shape();const x=-w/2,y=-h/2;
    s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:r*.3,bevelThickness:r*.3,bevelSegments:2,steps:1,curveSegments:6});g.translate(0,0,-d/2);return mesh(g,m,p,pos);
  }
  const head = boneMap.head;
  function headGroup(){const g=new THREE.Group();g.scale.setScalar(1.10);g.position.set(-rest.head.head[0],-rest.head.head[1]-.210,-rest.head.head[2]-.0055);head.add(g);return g;}
  const glasses3D=headGroup(), sunglasses=headGroup();
  function glasses(parent,frame,lensA,lensB){
    for(const s of [-1,1]){
      const x=s*.042;
      box(parent,frame,.071,.044,.007,[x,2.253,.215],.009);
      box(parent,s<0?lensA:lensB,.060,.032,.008,[x,2.253,.222],.006);
      line(parent,frame,[[s*.076,2.263,.214],[s*.098,2.264,.165],[s*.102,2.257,.095]],.004);
    }
    line(parent,frame,[[-.011,2.261,.218],[0,2.263,.221],[.011,2.261,.218]],.004);
  }
  glasses(glasses3D,ivory,M('#cc3d3d',.28,{transparent:true,opacity:.80}),M('#379ac6',.28,{transparent:true,opacity:.80}));
  glasses(sunglasses,black,M('#1c3637',.19,{metalness:.30}),M('#1c3637',.19,{metalness:.30}));
  for(const s of [-1,1])line(sunglasses,M('#789896',.22),[[s*.066,2.266,.228],[s*.036,2.266,.228]],.0015);
  const movie=new THREE.Group(),gym=new THREE.Group();model.add(movie,gym);
  const remote=new THREE.Group();remote.scale.setScalar(1.24);movie.add(remote);
  box(remote,black,.063,.165,.025,[0,0,0],.010);
  ell(remote,red,[0,.056,.017],[.009,.009,.005]);
  for(let i=0;i<8;i++)ell(remote,i===1?ivory:silver,[(i%2-.5)*.025,.022-Math.floor(i/2)*.022,.016],[.006,.005,.004]);
  const bucket=new THREE.Group();movie.add(bucket);
  mesh(new THREE.CylinderGeometry(.105,.076,.190,36),ivory,bucket,[0,-.035,0]);
  for(let i=0;i<10;i++)mesh(new THREE.CylinderGeometry(.106,.077,.188,4,1,true,i*Math.PI/5,.25),red,bucket,[0,-.035,0]);
  const rim=mesh(new THREE.TorusGeometry(.104,.006,8,36),ivory,bucket,[0,.061,0]);rim.rotation.x=Math.PI/2;
  for(let i=0;i<38;i++){const a=i*2.39996,r=.091*Math.sqrt((i+.4)/38);ell(bucket,M(i%3?'#fff0b4':'#efd489',.99),[Math.cos(a)*r,.073+(1-r/.1)*.020,Math.sin(a)*r],[.018,.017+(i%3)*.003,.016]);}
  const bag=new THREE.Group();gym.add(bag);const bagMat=M('#354b47',.98),strap=M('#23332f',1);
  box(bag,bagMat,.34,.19,.17,[0,-.22,0],.04);
  for(const s of [-1,1]){
    line(bag,strap,[[s*.085,-.15,-.055],[s*.07,-.026,-.045],[s*.07,-.01,.03],[s*.085,-.15,.067]],.008);
    line(bag,strap,[[s*.12,-.13,-.088],[s*.12,-.28,-.088],[s*.12,-.31,0],[s*.12,-.28,.088],[s*.12,-.13,.088]],.008);
  }
  line(bag,silver,[[-.13,-.12,0],[.13,-.12,0]],.002);
  box(bag,strap,.094,.041,.007,[0,-.22,.096],.005);
  // Birthday props are geometric and add no textures or runtime downloads.
  const partyHat=headGroup(),hatCone=new THREE.Group();partyHat.add(hatCone);
  hatCone.position.set(0,2.518,.047);hatCone.rotation.z=-.08;
  const partyPink=M('#ed4b9c',.39,{metalness:.12}),partyBlue=M('#20c7d3',.42),partyGold=M('#ffd450',.38,{metalness:.22});
  mesh(new THREE.ConeGeometry(.107,.24,32),partyPink,hatCone);
  for(let i=0;i<6;i++)mesh(new THREE.CylinderGeometry(0,.108,.24,3,1,true,i*Math.PI/3,.24),i%2?partyBlue:partyGold,hatCone);
  const hatBand=mesh(new THREE.TorusGeometry(.106,.008,8,32),partyGold,hatCone,[0,-.116,0]);hatBand.rotation.x=Math.PI/2;
  ell(hatCone,partyBlue,[0,.128,0],[.022,.022,.022]);
  const cannon=new THREE.Group();cannon.name='Birthday confetti cannon';model.add(cannon);
  mesh(new THREE.CylinderGeometry(.043,.039,.22,24),partyPink,cannon,[0,.035,0]);
  for(const y of [-.058,.017,.13])mesh(new THREE.CylinderGeometry(.044,.044,.019,24),y===.017?partyBlue:partyGold,cannon,[0,y,0]);
  const cannonMouth=mesh(new THREE.CircleGeometry(.037,24),black,cannon,[0,.146,0]);cannonMouth.rotation.x=-Math.PI/2;
  const cannonLip=mesh(new THREE.TorusGeometry(.041,.005,8,24),partyGold,cannon,[0,.148,0]);cannonLip.rotation.x=Math.PI/2;
  const star=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.012:.026;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?star.lineTo(x,y):star.moveTo(x,y);}star.closePath();
  mesh(new THREE.ShapeGeometry(star),ivory,cannon,[0,.068,.044]);
  const cannonMuzzle=new THREE.Object3D();cannonMuzzle.name='Confetti emission point';cannonMuzzle.position.y=.159;cannon.add(cannonMuzzle);
  // Small details follow wrists through the real skeleton.
  const watch = new THREE.Group();boneMap['wrist.L'].add(watch);watch.position.set(.012,-.01,.014);
  const watchBand=mesh(new THREE.TorusGeometry(.024,.005,8,24),black,watch);watchBand.rotation.x=Math.PI/2;
  box(watch,black,.032,.026,.010,[0,0,.023],.006);box(watch,M('#547774',.3),.024,.019,.005,[0,0,.031],.003);
  const wedding=mesh(new THREE.TorusGeometry(.009,.002,6,18),gold,boneMap['finger4-1.L'],[0,0,.01]);wedding.rotation.x=Math.PI/2;
  // A light beard is shaded into the actual jaw surface, preserving continuous anatomy.
  const skinGeo=meshes.body.geometry,colors=[];
  for(let i=0;i<skinGeo.attributes.position.count;i++){
    const x=skinGeo.attributes.position.getX(i),y=skinGeo.attributes.position.getY(i),z=skinGeo.attributes.position.getZ(i);
    const jawMask=THREE.MathUtils.smoothstep(z,.11,.18)*(1-THREE.MathUtils.smoothstep(y,2.142,2.169))*THREE.MathUtils.smoothstep(y,2.068,2.11);
    const grain=(Math.sin(x*518.5+y*719.3+z*324.3)*.5+.5)*.04;
    const shade=1-jawMask*(.10+grain);colors.push(shade,shade,shade);
  }
  skinGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));materials.skin.vertexColors=true;
  let mode='default',last=null,discoStartedAt=null,wasWorkout=false;
  const poses = data.poses || {};
  function setOutfit(next='default'){
    mode=['default','movie','gym','drive','party'].includes(next)?next:'default';
    meshes.tank.visible=mode==='default'||mode==='movie'||mode==='party';meshes.tee.visible=mode==='gym';meshes.vacation.visible=mode==='drive';
    meshes.hat.visible=mode==='drive';glasses3D.visible=mode==='movie';sunglasses.visible=mode==='gym'||mode==='drive';movie.visible=mode==='movie';gym.visible=mode==='gym';
    materials.pants.color.set(mode==='gym'?'#2d4358':mode==='drive'?'#3a4441':'#454a4e');
    materials.cuffs.color.copy(materials.pants.color).multiplyScalar(.80);
    partyHat.visible=mode==='party';cannon.visible=false;
    group.userData.outfit=mode;
  }
  const pos=new THREE.Vector3(),q=new THREE.Quaternion(),inv=new THREE.Matrix4();
  const workoutRest=Object.fromEntries(Object.entries(boneMap).map(([n,b])=>[n,b.position.clone()]));
  const eased=(t,a,b)=>THREE.MathUtils.smoothstep(t,a,b),mix=THREE.MathUtils.lerp;
  const workoutLocal=v=>new THREE.Vector3(...v).applyMatrix4(model.matrixWorld);
  function rotateWorld(b,delta){const parentQ=b.parent.getWorldQuaternion(new THREE.Quaternion());b.quaternion.premultiply(parentQ.clone().invert().multiply(delta).multiply(parentQ));b.updateWorldMatrix(true,true);}
  function worldOrientation(b,rotation){b.quaternion.copy(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));b.updateWorldMatrix(true,true);}
  function solveLimb(upper,lower,end,target,pole){
    const a=boneMap[upper],b=boneMap[lower],c=boneMap[end];
    const A=a.getWorldPosition(new THREE.Vector3()),B=b.getWorldPosition(new THREE.Vector3()),C=c.getWorldPosition(new THREE.Vector3()),goal=workoutLocal(target),P=workoutLocal(pole);
    const ab=A.distanceTo(B),bc=B.distanceTo(C),direction=goal.clone().sub(A),distance=THREE.MathUtils.clamp(direction.length(),Math.abs(ab-bc)+.001,ab+bc-.001);direction.normalize();
    const bend=P.sub(A).addScaledVector(direction,-P.dot(direction)).normalize();
    if(bend.lengthSq()<.01)bend.set(0,0,1).addScaledVector(direction,-direction.z).normalize();
    const along=(ab*ab+distance*distance-bc*bc)/(2*distance),height=Math.sqrt(Math.max(0,ab*ab-along*along)),elbow=A.clone().addScaledVector(direction,along).addScaledVector(bend,height);
    rotateWorld(a,new THREE.Quaternion().setFromUnitVectors(B.sub(A).normalize(),elbow.clone().sub(A).normalize()));
    const currentB=b.getWorldPosition(new THREE.Vector3()),currentC=c.getWorldPosition(new THREE.Vector3());
    rotateWorld(b,new THREE.Quaternion().setFromUnitVectors(currentC.sub(currentB).normalize(),goal.sub(currentB).normalize()));
  }
  function orientWorkoutHand(side,forward=[0,0,1],normal=[0,1,0]){
    const wrist=boneMap['wrist.'+side],sourceForward=new THREE.Vector3(...rest['finger3-1.'+side].head).sub(new THREE.Vector3(...rest['wrist.'+side].head)).normalize();
    const sourceRight=new THREE.Vector3(...rest['finger5-1.'+side].head).sub(new THREE.Vector3(...rest['finger2-1.'+side].head));sourceRight.addScaledVector(sourceForward,-sourceRight.dot(sourceForward)).normalize();
    const sourceNormal=new THREE.Vector3().crossVectors(sourceRight,sourceForward).normalize();
    const f=new THREE.Vector3(...forward).normalize(),n=new THREE.Vector3(...normal).normalize(),r=new THREE.Vector3().crossVectors(f,n).normalize();n.crossVectors(r,f).normalize();
    const source=new THREE.Matrix4().makeBasis(sourceRight,sourceForward,sourceNormal),target=new THREE.Matrix4().makeBasis(r,f,n);
    const rotation=new THREE.Quaternion().setFromRotationMatrix(target.multiply(source.invert()));
    rotation.premultiply(model.getWorldQuaternion(new THREE.Quaternion()));worldOrientation(wrist,rotation);
  }
  function animateWorkout(time){
    const t=THREE.MathUtils.clamp(time,0,29),toGrip=eased(t,.7,2.2),lift=eased(t,2.2,4),clean=eased(t,4,5.1),press=eased(t,5.1,6.2);
    const floorIn=eased(t,10.2,11.8),floorOut=eased(t,20,21.2),floorWeight=floorIn*(1-floorOut);
    const push=t>=12&&t<20?(1-Math.cos((t-12)/.8*Math.PI*2))*.5:0;
    const flip=t>=21.3&&t<22.8,flipU=THREE.MathUtils.clamp((t-21.3)/1.5,0,1),tuck=flip?Math.sin(flipU*Math.PI):0;
    const shrug=eased(t,8.7,9.05)*(1-eased(t,9.75,10.15)),watch=eased(t,23.35,23.65)*(1-eased(t,24.65,24.95));
    let hip=1.275-.68*toGrip*(1-lift),pitch=.60*toGrip*(1-lift);
    hip-=.085*Math.sin(clean*Math.PI);hip=mix(hip,.73-push*.29,floorWeight);pitch=mix(pitch,Math.PI/2,floorWeight);
    hip-=tuck*.18;hip-=.14*eased(t,22.75,22.95)*(1-eased(t,23.05,23.35));
    for(const [n,b]of Object.entries(boneMap)){b.position.copy(workoutRest[n]);b.quaternion.identity();}
    model.position.set(0,.026,0);boneMap.root.position.y=hip;boneMap.root.position.z=mix(-.0735-.14*toGrip*(1-lift),-.22,floorWeight);boneMap.root.rotation.x=pitch;
    for(const side of ['L','R'])boneMap['shoulder01.'+side].position.y+=shrug*.055;
    model.updateWorldMatrix(true,true);
    for(const side of ['L','R']){
      const sign=side==='L'?1:-1;
      const ankle=[mix(sign*.25,sign*.19,floorWeight),mix(.1116,.242,floorWeight),mix(.0179,-1.23,floorWeight)];
      if(flip){ankle[1]+=tuck*.70;ankle[2]+=tuck*.45;}
      solveLimb('upperleg01.'+side,'lowerleg01.'+side,'foot.'+side,ankle,[sign*.28,.56,mix(.58,-.50,floorWeight)+tuck*.3]);
      const footQ=model.getWorldQuaternion(new THREE.Quaternion());if(floorWeight>0)footQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),floorWeight*.65));worldOrientation(boneMap['foot.'+side],footQ);
    }
    let barHeight=mix(.352,1.23,lift);barHeight=mix(barHeight,1.83,clean);barHeight=mix(barHeight,2.61,press);
    const catchLift=eased(t,25.8,26.75),absorb=eased(t,26.75,27.55);if(t>=25.8)barHeight=mix(mix(1.83,2.61,catchLift),1.83,absorb);
    const held=t>=2.2&&t<6.2||t>=26.75;
    const release=eased(t,6.2,7),catchReady=eased(t,25.25,25.8);
    for(const side of ['L','R']){
      const sign=side==='L'?1:-1;
      let wrist=[sign*.32,mix(1.23,barHeight,toGrip),mix(.09,.38,toGrip)];
      if(t>=6.2&&t<25.25)wrist=[sign*mix(.32,.33,release),mix(2.61,1.23,release),mix(.38,.09,release)];
      if(t>=25.25)wrist=[sign*.32,mix(1.23,barHeight,catchReady),mix(.09,.38,catchReady)];
      wrist[0]=mix(wrist[0],sign*.48,shrug);wrist[1]=mix(wrist[1],1.68,shrug);wrist[2]=mix(wrist[2],.28,shrug);
      wrist=wrist.map((v,i)=>mix(v,[sign*.335,.088,.49][i],floorWeight));
      if(flip)wrist=wrist.map((v,i)=>mix(v,[sign*.24,1.29,.29][i],tuck));
      if(side==='L')wrist=wrist.map((v,i)=>mix(v,[.05,1.68,.41][i],watch));
      const pole=[sign*mix(.65,.61,floorWeight),mix(1.50,.42,floorWeight),mix(.57,.32,floorWeight)];
      solveLimb('upperarm01.'+side,'lowerarm01.'+side,'wrist.'+side,wrist,pole);
      orientWorkoutHand(side,[0,0,1],shrug>.5?[0,-1,0]:[0,1,0]);
      const curl=(1-floorWeight)*(held||toGrip>.8&&t<6.2||t>=25.8?.66:shrug>.2?.12:0);
      for(let finger=2;finger<=5;finger++)for(let segment=2;segment<=3;segment++)boneMap[`finger${finger}-${segment}.${side}`].quaternion.setFromAxisAngle(new THREE.Vector3(side==='L'?.38:-.38,-.44,-.81).normalize(),side==='L'?-curl:curl);
    }
    const lookUp=(eased(t,6.3,6.8)*(1-eased(t,8.45,8.75))+eased(t,24.85,25.25)*(1-eased(t,27.2,27.8)));
    boneMap.head.rotation.set(-.50*lookUp+.60*watch-.18*floorWeight,watch*.18,shrug*.075);
    for(const side of ['L','R'])boneMap['eye.'+side].rotation.x=.08*watch-.04*lookUp;
    movie.visible=gym.visible=cannon.visible=partyHat.visible=glasses3D.visible=sunglasses.visible=false;
    model.updateWorldMatrix(true,true);
    group.userData.animationState='workout';group.userData.cannonFiring=false;group.userData.cannonBurstId=0;
    group.userData.workout={elapsed:t,barHeld:held,barHeight,pushupCount:t<12?0:Math.min(10,Math.floor((Math.min(t,20)-12)/.8+1e-7)),phase:t<.7?'ready':t<4?'deadlift':t<5.1?'clean':t<6.2?'press':t<8.7?'wait':t<10.2?'shrug':t<12?'floor':t<20?'pushups':t<21.3?'stand':t<22.8?'flip':t<23.35?'land':t<24.85?'watch':t<26.75?'catch-ready':'caught'};
    if(typeof group.userData.workoutSync==='function')group.userData.workoutSync();
  }
  function getWorkoutGripPoints(left=new THREE.Vector3(),right=new THREE.Vector3()){
    model.updateWorldMatrix(true,true);for(const [side,target]of[['L',left],['R',right]]){boneMap['wrist.'+side].getWorldPosition(target);target.lerp(boneMap['finger3-1.'+side].getWorldPosition(new THREE.Vector3()),.70);}return {left,right};
  }
  function animateSeated(time){
    for(const[n,b]of Object.entries(boneMap)){b.position.copy(workoutRest[n]);b.quaternion.identity();}
    model.position.set(0,.026,0);
    boneMap.spine01.rotation.x=-.035+Math.sin(time*1.5)*.003;
    model.updateWorldMatrix(true,true);
    for(const side of ['L','R']){
      const sign=side==='L'?1:-1;
      // At the intended world hip height .99, these foot targets meet y=0.
      solveLimb('upperleg01.'+side,'lowerleg01.'+side,'foot.'+side,[sign*.21,.410,.64],[sign*.25,1.15,.85]);
      worldOrientation(boneMap['foot.'+side],model.getWorldQuaternion(new THREE.Quaternion()));
      const hand=side==='L'?[.22,1.40,.43]:[-.25,1.35,.43];
      solveLimb('upperarm01.'+side,'lowerarm01.'+side,'wrist.'+side,hand,[sign*.51,1.45,.11]);
      orientWorkoutHand(side);
      const curl=side==='R'?.56:-.22;
      for(let finger=2;finger<=5;finger++)for(let segment=2;segment<=3;segment++)boneMap[`finger${finger}-${segment}.${side}`].quaternion.setFromAxisAngle(new THREE.Vector3(side==='L'?.38:-.38,-.44,-.81).normalize(),curl);
    }
    boneMap.head.rotation.set(-.025,Math.sin(time*.27)*.018,0);
    model.updateWorldMatrix(true,true);inv.copy(model.matrixWorld).invert();
    boneMap['wrist.R'].getWorldPosition(pos).applyMatrix4(inv);
    const palm=boneMap['finger3-1.R'].getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
    remote.position.copy(pos).lerp(palm,.65).add(new THREE.Vector3(.012,.065,.022));remote.rotation.set(-.10,-.05,-.08);
    boneMap['wrist.L'].getWorldPosition(pos).applyMatrix4(inv);bucket.position.copy(pos).add(new THREE.Vector3(.016,-.025,.06));
    movie.visible=mode==='movie';gym.visible=cannon.visible=false;glasses3D.visible=mode==='movie';sunglasses.visible=mode==='gym'||mode==='drive';partyHat.visible=mode==='party';
    group.userData.animationState='seated';group.userData.cannonFiring=false;group.userData.cannonBurstId=0;
  }
  function animate(time=0,state='idle'){
    if(state==='workout'){wasWorkout=true;last=time;discoStartedAt=null;animateWorkout(time);return;}
    if(state==='seated'){wasWorkout=true;last=time;discoStartedAt=null;animateSeated(time);return;}
    if(wasWorkout){for(const[n,b]of Object.entries(boneMap)){b.position.copy(workoutRest[n]);b.quaternion.identity();}model.position.set(0,.026,0);sunglasses.visible=mode==='gym'||mode==='drive';partyHat.visible=mode==='party';glasses3D.visible=mode==='movie';wasWorkout=false;}
    const dt=last===null?1/60:Math.max(0,Math.min(1,time-last));last=time;
    const k=1-Math.exp(-9*dt),wave=state==='wave',walk=state==='walk',driving=state==='driving',disco=state==='disco',selected=state==='selected',think=state==='idle'&&mode==='default';
    if(disco&&discoStartedAt===null)discoStartedAt=time;if(!disco)discoStartedAt=null;
    const partyTime=disco?Math.max(0,time-discoStartedAt):0,cycle=partyTime%6,beat=partyTime*Math.PI*4/3;
    const firing=disco&&mode==='party'&&partyTime>=3.2-1e-8&&partyTime<3.55;
    const raised=disco?THREE.MathUtils.smoothstep(partyTime,2.65,3.15)*(1-THREE.MathUtils.smoothstep(partyTime,3.7,4.2)):0;
    const point=disco?(Math.sin(beat*.5)*.5+.5):0;
    const groove=disco?eased(partyTime,4.3,5):0,grooveTime=Math.max(0,partyTime-4.8),grooveCycle=grooveTime%6,grooveBeat=grooveTime*Math.PI*4/3;
    const pointL=eased(grooveCycle,1.6,2.2)*(1-eased(grooveCycle,3.5,4.1)),pointR=eased(grooveCycle,3.7,4.3)*(1-eased(grooveCycle,5.5,6));
    movie.visible=mode==='movie'&&!driving;gym.visible=mode==='gym'&&!driving;
    const cannonReveal=disco?eased(partyTime,.5,.9)*(1-eased(partyTime,4.0,4.8)):0;
    cannon.visible=mode==='party'&&cannonReveal>0;
    // Keep the hidden transform invertible for callers sampling the muzzle.
    cannon.scale.setScalar(Math.max(.0001,cannonReveal));
    const poseName=driving?'driving':wave?'wave':mode==='movie'?'movie':think?'thinking':'relaxed';
    const pose=poses[poseName]||{};
    for(const side of ['L','R'])for(const part of ['upperarm01','lowerarm01','wrist']){
      const name=part+'.'+side,b=boneMap[name];let target=pose[name]||[0,0,(part==='upperarm01'?(side==='L'?-.65:.65):0)];
      if(disco){const relaxed=poses.relaxed?.[name]||target,up=poses.wave?.[part+'.R']||target,mirror=side==='L'?[up[0],-up[1],-up[2]]:up;const lift=side==='R'?Math.max(raised,point*.86):(1-point)*.92*(1-raised*.65);target=relaxed.map((v,i)=>THREE.MathUtils.lerp(v,mirror[i],THREE.MathUtils.smoothstep(lift,.08,.92)));if(part==='upperarm01')target[0]+=Math.sin(beat)*.10;if(part==='wrist')target[2]+=Math.sin(beat*.5)*.08;}
      if(groove>0){const base=poses.movie?.[name]||target,up=poses.wave?.[part+'.R']||target,mirror=side==='L'?[up[0],-up[1],-up[2]]:up,pointWeight=side==='L'?pointL:pointR;const dance=base.map((v,i)=>mix(v,mirror[i],pointWeight));const pulse=Math.sin(grooveBeat*2+(side==='L'?0:Math.PI));if(part==='upperarm01'){dance[2]+=(side==='L'?-1:1)*(.10+pulse*.10)*(1-pointWeight);dance[0]+=pulse*.08;}if(part==='lowerarm01')dance[0]+=pulse*.20*(1-pointWeight);target=target.map((v,i)=>mix(v,dance[i],groove));}
      const stride=walk&&part==='upperarm01'?Math.sin(time*6.2+(side==='L'?0:Math.PI))*.17:0;
      b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,target[0]+stride,k);
      b.rotation.y=THREE.MathUtils.lerp(b.rotation.y,target[1],k);
      b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,target[2]+(wave&&side==='R'&&part==='wrist'?Math.sin(time*5.5)*.14:0),k);
    }
    boneMap.head.rotation.x=THREE.MathUtils.lerp(boneMap.head.rotation.x,disco?-.025+Math.sin(beat*2)*.025:driving?0:think?-.035:-.015,k);
    boneMap.head.rotation.y=THREE.MathUtils.lerp(boneMap.head.rotation.y,disco?Math.sin(beat*.5)*.13:driving?0:think?Math.sin(time*.42)*.14:selected?.04:Math.sin(time*.35)*.04,k);
    boneMap.head.rotation.z=THREE.MathUtils.lerp(boneMap.head.rotation.z,disco?Math.sin(beat)*.045:think?Math.sin(time*.48)*.025:0,k);
    boneMap.spine01.rotation.y=disco?mix(Math.sin(beat)*.09,Math.sin(grooveBeat)*.19,groove):driving?0:Math.sin(time*.8)*.007;
    boneMap.spine01.rotation.z=disco?mix(Math.sin(beat)*-.065,Math.sin(grooveBeat)*-.095,groove):0;
    boneMap.root.rotation.z=disco?mix(Math.sin(beat)*.048,Math.sin(grooveBeat)*.075,groove):0;
    boneMap.root.rotation.y=disco?Math.sin(beat*.5)*.045:0;
    for(const side of ['L','R']){
      boneMap['eye.'+side].rotation.y=think?Math.sin(time*.42)*.018:0;
      boneMap['eye.'+side].rotation.x=0;
      const stride=Math.sin(time*6.2+(side==='L'?0:Math.PI));
      for(const part of ['upperleg01','lowerleg01','foot']){
        const b=boneMap[part+'.'+side];let target=driving?(pose[b.name]||[0,0,0]):[walk?(part==='upperleg01'?stride*.27:part==='lowerleg01'?Math.max(0,-stride)*.31:0):0,0,0];
        if(disco){const bend=.08+.07*(.5+.5*Math.sin(beat*2+(side==='L'?0:Math.PI))),sign=side==='L'?1:-1;target=part==='upperleg01'?[-bend,sign*.03,Math.sin(beat)*-.028]:part==='lowerleg01'?[bend*1.7,0,0]:[-bend*.7,0,Math.sin(beat)*-.018];}
        b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,target[0],k);
        b.rotation.y=THREE.MathUtils.lerp(b.rotation.y,target[1],k);
        b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,target[2],k);
      }
    }
    const curlAxis=new THREE.Vector3(-.38,-.44,-.81).normalize();
    for(let finger=2;finger<=5;finger++)for(let segment=2;segment<=3;segment++){
      const b=boneMap[`finger${finger}-${segment}.R`];
      const curl=mode==='party'?(partyTime<4.8?.58:pointR>.5?(finger===2?0:.65):.25):think?(finger===2?.22:.46):driving?.32:mode==='movie'?.56:0;
      b.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(curlAxis,curl),k);
      boneMap[`finger${finger}-${segment}.L`].quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(.38,-.44,-.81).normalize(),disco?(groove>0?(pointL>.5?(finger===2?0:-.65):-.25):(finger===2?0:-.70)):driving?-.32:0),k);
    }
    model.position.x=disco?mix(Math.sin(beat)*.035,Math.sin(grooveBeat)*.14,groove):0;
    model.position.y=.026+(disco?mix(-.013+Math.cos(beat*2)*.007,-.023+Math.cos(grooveBeat*2)*.018,groove):driving?0:walk?Math.abs(Math.sin(time*6.2))*.012:Math.sin(time*1.65)*.004);
    if(groove>0){model.updateWorldMatrix(true,true);for(const side of ['L','R']){const sign=side==='L'?1:-1,step=Math.max(0,Math.sin(grooveBeat+(side==='L'?0:Math.PI))),lift=Math.sin(step*Math.PI)*.095;const a=boneMap['upperleg01.'+side],b=boneMap['lowerleg01.'+side],beforeA=a.quaternion.clone(),beforeB=b.quaternion.clone();a.quaternion.identity();b.quaternion.identity();model.updateWorldMatrix(true,true);solveLimb('upperleg01.'+side,'lowerleg01.'+side,'foot.'+side,[sign*(.25+.14*step)-model.position.x,.127+lift-model.position.y,.02+.075*step],[sign*.3,.6,.58]);a.quaternion.slerpQuaternions(beforeA,a.quaternion.clone(),groove);b.quaternion.slerpQuaternions(beforeB,b.quaternion.clone(),groove);worldOrientation(boneMap['foot.'+side],model.getWorldQuaternion(new THREE.Quaternion()));}}
    model.updateWorldMatrix(true,true);inv.copy(model.matrixWorld).invert();
    boneMap['wrist.R'].getWorldPosition(pos).applyMatrix4(inv);
    const palm=boneMap['finger3-1.R'].getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
    remote.position.copy(pos).lerp(palm,.65).add(new THREE.Vector3(.012,.065,.022));remote.rotation.set(-.10,-.05,-.08);
    cannon.position.copy(pos).lerp(palm,.80).add(new THREE.Vector3(.005,.019,.010));
    const cannonAim=new THREE.Vector3(disco?Math.sin(beat*.5)*.26*(1-raised):-.16,1,disco?.34-raised*.16:.22).normalize();
    cannon.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),cannonAim);
    boneMap['wrist.L'].getWorldPosition(pos).applyMatrix4(inv);bucket.position.copy(pos).add(new THREE.Vector3(.016,-.025,.06));bag.position.copy(pos).add(new THREE.Vector3(.015,-.075,0));bag.rotation.z=walk?Math.sin(time*6.2)*.06:.025;
    group.userData.animationState=state;
    group.userData.partyElapsed=partyTime;group.userData.cannonCyclePhase=cycle;
    group.userData.cannonFiring=firing;
    group.userData.cannonBurstId=disco&&mode==='party'&&partyTime>=3.2-1e-8?1:0;
  }
  function getCannonWorldPosition(target=new THREE.Vector3()){cannonMuzzle.updateWorldMatrix(true,false);return cannonMuzzle.getWorldPosition(target);}
  function getCannonWorldDirection(target=new THREE.Vector3()){cannon.updateWorldMatrix(true,false);cannon.getWorldQuaternion(q);return target.set(0,1,0).applyQuaternion(q).normalize();}
  setOutfit('default');animate(0,'idle');
  group.userData.assetLicense='CC0-1.0 — MakeHuman Community';
  // Group-local hip joint midpoint in the seated pose; no automatic seat translation.
  group.userData.drivingHipOffset=[0,1.307146,-.004381];
  group.userData.drivingGroundingYOffset=-.504227;
  group.userData.seatHipOffset=[0,1.307146,-.004381];
  group.userData.seatedGroundingYOffset=-.317146;
  return {group,setOutfit,animate,getCannonWorldPosition,getCannonWorldDirection,getWorkoutGripPoints,seatHipOffset:group.userData.seatHipOffset};
}
