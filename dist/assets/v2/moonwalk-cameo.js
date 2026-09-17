import * as THREE from 'three';

/**
 * Brief, stylized Michael Jackson stage-costume cameo. The continuous human,
 * clothing proxies, fedora, eye textures and rig derive from the project's
 * existing MakeHuman Community CC0 assets; no MJ photograph, recording or
 * proprietary character model is embedded. Original costume/animation code.
 *
 * Keep this file beside runtime/: await createMoonwalkCameo() returns
 * {group, update(seconds, crouch=0)}. Crouch is numeric 0..1. Faces local +Z;
 * parent owns all outer transforms,
 * visibility and travel. Approximate standing height: 2.48 units.
 */
export async function createMoonwalkCameo(options={}) {
  const data=options.data || await fetch(new URL('./runtime/dad-human.json',import.meta.url)).then(r=>{
    if(!r.ok)throw Error('Cameo rig unavailable');return r.json();
  });
  const rawBuffer=options.buffer || await fetch(new URL('./runtime/dad-human.bin',import.meta.url)).then(r=>{
    if(!r.ok)throw Error('Cameo mesh unavailable');return r.arrayBuffer();
  });
  const types={Float32Array,Uint16Array,Uint32Array};
  const geoData={};
  for(const [name,def]of Object.entries(data.geo)){
    geoData[name]={};
    for(const [key,d]of Object.entries(def))geoData[name][key]=data.packed?new types[d.type](rawBuffer,d.byteOffset,d.length):d;
  }
  const slender=v=>new THREE.Vector3(v[0]*.73,v[1],v[2]*.80);
  const group=new THREE.Group();group.name='Brief moonwalk stage cameo';
  const model=new THREE.Group();group.add(model);
  const bones={},rest={};
  for(const def of data.bones){const bone=new THREE.Bone();bone.name=def.name;bones[def.name]=bone;rest[def.name]=slender(def.head);}
  for(const def of data.bones){const b=bones[def.name];b.position.copy(rest[def.name]);
    if(def.parent){b.position.sub(rest[def.parent]);bones[def.parent].add(b);}else model.add(b);
  }
  model.updateMatrixWorld(true);
  const skeleton=new THREE.Skeleton(data.bones.map(b=>bones[b.name]));skeleton.calculateInverses();
  const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.78,...extra});
  const skin=mat('#d5a17e',{roughness:.68});
  const ivory=mat('#f8f5e9',{roughness:.90});
  const black=mat('#101216',{roughness:.62});
  const jacket=new THREE.MeshPhysicalMaterial({color:'#111216',roughness:.43,metalness:.16,clearcoat:.30,clearcoatRoughness:.24,side:THREE.DoubleSide});
  jacket.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCameoCloth;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvCameoCloth=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vCameoCloth;')
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec3 cell=floor(vCameoCloth*230.0);
        float flake=fract(sin(dot(cell,vec3(12.9898,78.233,37.719)))*43758.5453);
        float sparkle=step(.979,flake)*.32;
        diffuseColor.rgb+=vec3(sparkle);`);
  };
  jacket.customProgramCacheKey=()=> 'moonwalk-sequin-cloth-v1';
  const loader=new THREE.TextureLoader();
  async function map(name){if(options.skipTextures)return null;const t=await loader.loadAsync(new URL('./runtime/'+name,import.meta.url).href);t.colorSpace=THREE.SRGBColorSpace;return t;}
  const [eyeMap,browMap]=await Promise.all([map('eyes.png'),map('brows.png')]);
  const eyeMat=mat('#ffffff',{map:eyeMap,roughness:.23,alphaTest:.1,transparent:true});
  const browMat=mat('#171415',{map:browMap,alphaTest:.25,transparent:true,side:THREE.DoubleSide});
  const bounds=(source,a,b,c)=>{
    const p=source.position;return [(p[a*3]+p[b*3]+p[c*3])/3,(p[a*3+1]+p[b*3+1]+p[c*3+1])/3,(p[a*3+2]+p[b*3+2]+p[c*3+2])/3];
  };
  function skinned(name,source,material,{filter=()=>true,offset=0,reshape=null,glove=false}={}){
    const g=new THREE.BufferGeometry(),p=[],ix=[],blackIndices=[],whiteIndices=[];
    for(let i=0;i<source.position.length;i+=3){
      let v=[source.position[i],source.position[i+1],source.position[i+2]];
      if(reshape)v=reshape(v);
      const q=slender(v);
      if(offset)q.add(new THREE.Vector3(source.normal[i]/.73,source.normal[i+1],source.normal[i+2]/.80).normalize().multiplyScalar(offset));
      p.push(q.x,q.y,q.z);
    }
    for(let i=0;i<source.index.length;i+=3){
      const a=source.index[i],b=source.index[i+1],c=source.index[i+2];
      if(!filter(bounds(source,a,b,c),[a,b,c]))continue;
      if(glove){let weight=0;for(const v of[a,b,c])for(let k=0;k<4;k++){
        const bn=data.bones[source.skinIndex[v*4+k]].name;
        if(bn==='wrist.R'||(bn.startsWith('finger')&&bn.endsWith('.R')))weight+=source.skinWeight[v*4+k]/3;
      }(weight>.45?whiteIndices:blackIndices).push(a,b,c);}else ix.push(a,b,c);
    }
    if(glove){ix.push(...blackIndices,...whiteIndices);g.addGroup(0,blackIndices.length,0);g.addGroup(blackIndices.length,whiteIndices.length,1);}
    g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(source.uv,2));
    g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(source.skinIndex,4));
    g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(source.skinWeight,4));
    g.setIndex(ix);g.computeVertexNormals();
    const mesh=new THREE.SkinnedMesh(g,material);mesh.name=name;mesh.bind(skeleton,new THREE.Matrix4());
    mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;model.add(mesh);return mesh;
  }
  const meshes={};
  meshes.body=skinned('Continuous cameo body and right glove',geoData.body,[skin,ivory],{glove:true});
  meshes.eyes=skinned('Cameo eyes',geoData.eyes,eyeMat);
  meshes.brows=skinned('Cameo eyebrows',geoData.brows,browMat);
  // The V is cut in actual cloth geometry. The open black jacket frames it.
  skinned('White V-neck stage undershirt',geoData.tee,ivory,{filter:([x,y,z])=>!(z>.075&&y>1.77&&Math.abs(x)<(y-1.77)*.48)});
  skinned('Open sequin jacket',geoData.tee,jacket,{offset:.024,filter:([x,y,z])=>{
    const opening=.115+.05*Math.max(0,1.80-y);
    return !(z>.055&&Math.abs(x)<opening&&y<1.98);
  }});
  // Continuous fitted sleeves share the body topology and skeleton. The
  // wrist/finger influence cutoff leaves the single white glove exposed.
  skinned('Long sequin jacket sleeves',geoData.body,jacket,{offset:.034,filter:([x,y,z],ids)=>{
    if(Math.abs(x)<.30||y>2.04)return false;
    let hand=0;for(const v of ids)for(let k=0;k<4;k++){
      const name=data.bones[geoData.body.skinIndex[v*4+k]].name;
      if(name.startsWith('wrist')||name.startsWith('finger'))hand+=geoData.body.skinWeight[v*4+k]/3;
    }return hand<.25;
  }});
  skinned('Straight cropped black trousers',geoData.pants,black,{filter:([x,y])=>y>.285,
    reshape:([x,y,z])=>{const sign=Math.sign(x)||1,axis=sign*(.16+(.28-.16)*Math.max(0,1-y/1.2));return[axis+(x-axis)*.82,y,z*.86];}});
  skinned('Visible white stage socks',geoData.cuffs,ivory,{reshape:([x,y,z])=>[x,.115+(y-.164032)/(.201726-.164032)*.198,z]});
  skinned('Polished black stage shoes',geoData.shoes,mat('#090b0e',{roughness:.27,metalness:.10}),{
    reshape:([x,y,z])=>[x,y>.085?.085+(y-.085)*.55:y,z]});
  meshes.hat=skinned('Black stage fedora',geoData.hat,mat('#111217',{roughness:.84}));
  // Swept curls are continuous curved strands beneath the real fedora mesh.
  const hair=new THREE.Group();hair.position.copy(rest.head).multiplyScalar(-1);bones.head.add(hair);
  const hairMat=mat('#131116',{roughness:.61});
  function curl(points,r=.010){const pts=points.map(p=>slender(p));const curve=new THREE.CatmullRomCurve3(pts);
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,24,r,6,false),hairMat);mesh.castShadow=true;hair.add(mesh);}
  for(let i=0;i<17;i++){
    const a=.55+i/(17-1)*(Math.PI*2-1.10),points=[];
    for(let k=0;k<9;k++){const t=k/8,twist=t*Math.PI*3+i*.6;
      points.push([Math.sin(a)*(.118+.010*Math.sin(twist)),2.35-t*(.22+.04*Math.sin(i)),
        .055+Math.cos(a)*(.134+.008*Math.cos(twist))]);}
    curl(points,.010);
  }
  curl([[-.092,2.35,.155],[-.064,2.31,.197],[-.035,2.29,.215],[-.020,2.26,.220],[-.043,2.245,.214]],.009);
  curl([[-.110,2.34,.120],[-.105,2.29,.159],[-.110,2.24,.177],[-.092,2.20,.167]],.009);

  const rootRest=bones.root.position.clone();
  const smooth=t=>t*t*(3-2*t);
  function poseLeg(side,phase,crouch,drop,back){
    const hip=bones['upperleg01.'+side],knee=bones['lowerleg01.'+side],foot=bones['foot.'+side];
    const H=rest['upperleg01.'+side],K=rest['lowerleg01.'+side],A=rest['foot.'+side];
    const raised=phase>=.5,t=raised?(phase-.5)*2:phase*2;
    const slide=(raised?THREE.MathUtils.lerp(-.23,.23,smooth(t)):THREE.MathUtils.lerp(.23,-.23,t))*(1-crouch);
    const lift=(raised?Math.sin(Math.PI*t)*.085:0)*(1-crouch);
    const heel=(raised?Math.sin(Math.PI*t)*.44:0)*(1-crouch);
    const hipY=H.y-drop,hipZ=H.z-back,ankleY=A.y+lift;
    const dz=A.z+slide-hipZ,down=hipY-ankleY;
    const l1=Math.hypot(K.y-H.y,K.z-H.z),l2=Math.hypot(A.y-K.y,A.z-K.z);
    const d=THREE.MathUtils.clamp(Math.hypot(down,dz),.05,l1+l2-.004);
    const heading=Math.atan2(dz,down),bend=Math.acos(THREE.MathUtils.clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1));
    const upper=heading+bend;
    const kneeY=hipY-Math.cos(upper)*l1,kneeZ=hipZ+Math.sin(upper)*l1;
    const lower=Math.atan2(A.z+slide-kneeZ,kneeY-ankleY);
    const restUpper=Math.atan2(K.z-H.z,H.y-K.y),restLower=Math.atan2(A.z-K.z,K.y-A.y);
    hip.rotation.set(restUpper-upper,0,0);
    knee.rotation.set(restLower-lower-hip.rotation.x,0,0);
    foot.rotation.set(-hip.rotation.x-knee.rotation.x+heel,0,0);
  }
  // Bring the hands near the bent knees without rigidly attaching them. The
  // solver uses actual joint positions, so the parent's yaw/scale are safe.
  function kneesideHands(side,amount){
    const wrist=bones['wrist.'+side],knee=bones['lowerleg01.'+side];
    model.updateMatrixWorld(true);
    const worldQ=model.getWorldQuaternion(new THREE.Quaternion());
    const worldScale=model.getWorldScale(new THREE.Vector3());
    const offset=new THREE.Vector3(side==='L'?.035:-.035,.09,.045).multiply(worldScale).applyQuaternion(worldQ);
    const target=knee.getWorldPosition(new THREE.Vector3()).add(offset);
    target.lerp(wrist.getWorldPosition(new THREE.Vector3()),1-amount);
    for(let pass=0;pass<7;pass++)for(const part of['lowerarm01','upperarm01']){
      const joint=bones[part+'.'+side];
      joint.updateWorldMatrix(true,true);
      const origin=joint.getWorldPosition(new THREE.Vector3());
      const current=wrist.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
      const desired=target.clone().sub(origin).normalize();
      const turn=new THREE.Quaternion().setFromUnitVectors(current,desired);
      const parentQ=joint.parent.getWorldQuaternion(new THREE.Quaternion());
      const local=parentQ.clone().invert().multiply(turn).multiply(parentQ);
      joint.quaternion.premultiply(local);joint.updateWorldMatrix(false,true);
    }
  }
  function update(time=0,crouch=0){
    const c=smooth(THREE.MathUtils.clamp(Number.isFinite(crouch)?crouch:0,0,1));
    const phase=((time/1.38)%1+1)%1;
    const drop=THREE.MathUtils.lerp(.055,.88,c),back=.24*c;
    bones.root.position.copy(rootRest);bones.root.position.y-=drop;bones.root.position.z-=back;
    poseLeg('L',phase,c,drop,back);poseLeg('R',(phase+.5)%1,c,drop,back);
    bones.spine05.rotation.set(.55*c,0,0);
    bones.spine02.rotation.set(.12*c,0,0);
    bones.spine01.rotation.set(THREE.MathUtils.lerp(.043,.08,c),Math.sin(time*2.28)*.022*(1-c),Math.sin(time*4.55)*.018*(1-c));
    bones.head.rotation.set(THREE.MathUtils.lerp(.085,-.23,c),Math.sin(time*1.2)*.035*(1-c),-.05*(1-c));
    for(const side of ['L','R']){
      const sign=side==='L'?1:-1,off=side==='L'?0:Math.PI;
      bones['upperarm01.'+side].rotation.set(.18+Math.sin(time*4.55+off)*.045,.05*sign,-.70*sign);
      bones['lowerarm01.'+side].rotation.set(.31+Math.sin(time*4.55+off)*.06,-.10*sign,.035*sign);
      bones['wrist.'+side].rotation.set(.44,.13*sign,.34*sign);
      for(let finger=2;finger<=5;finger++)for(let segment=2;segment<=3;segment++){
        const bone=bones[`finger${finger}-${segment}.${side}`];
        if(bone)bone.rotation.z=-sign*.17;
      }
    }
    model.position.y=.027;
    if(c>0){kneesideHands('L',c);kneesideHands('R',c);}
    model.updateMatrixWorld(true);
    group.userData.moonwalkPhase=phase;
    group.userData.crouch=c;
  }
  update(0);
  group.userData.assetLicense='MakeHuman base mesh, system assets and rig: CC0-1.0; original costume and animation adaptation.';
  group.userData.facing='+Z';
  return {group,update};
}
