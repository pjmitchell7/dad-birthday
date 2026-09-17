import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// A small, cohesive movie-night living room. All artwork/textures are procedural.
export function createCinema({video}={}) {
  const group=new THREE.Group();group.name='Cozy birthday movie room';
  let seed=19074;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function texture(c,repeatX=1,repeatY=1){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeatX,repeatY);t.anisotropy=4;return t;}
  function woodTexture(){
    const c=canvas(512,1024),ctx=c.getContext('2d');
    const shades=['#79543b','#826047','#715039','#886147','#76543c','#805a40'];
    for(let p=0;p<8;p++){
      const x=p*64;ctx.fillStyle=shades[p%shades.length];ctx.fillRect(x,0,64,1024);
      for(let i=0;i<125;i++){const gx=x+random()*63;ctx.strokeStyle=`rgba(${random()>.5?'223,179,126':'38,24,16'},${.025+random()*.07})`;ctx.lineWidth=.5+random();ctx.beginPath();ctx.moveTo(gx,0);for(let y=0;y<=1024;y+=32)ctx.lineTo(gx+Math.sin(y*.012+p*4+i)*(.5+random()*2),y);ctx.stroke();}
      ctx.fillStyle='rgba(24,15,10,.28)';ctx.fillRect(x,0,1.5,1024);
      const seam=170+(p%3)*243;ctx.fillRect(x,seam,64,1.7);
    }
    return texture(c,3,2);
  }
  function weaveTexture(base,thread){
    const c=canvas(128,128),ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,128,128);
    for(let i=0;i<128;i+=3){ctx.strokeStyle=thread;ctx.globalAlpha=.14+random()*.07;ctx.lineWidth=.75;ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,128);ctx.stroke();ctx.globalAlpha=.07+random()*.08;ctx.beginPath();ctx.moveTo(0,i+1);ctx.lineTo(128,i+1);ctx.stroke();}ctx.globalAlpha=1;
    return texture(c,4,4);
  }
  function rugTexture(){
    const c=canvas(768,512),ctx=c.getContext('2d');ctx.fillStyle='#b7aa8a';ctx.fillRect(0,0,768,512);
    ctx.strokeStyle='#52665c';ctx.lineWidth=18;ctx.strokeRect(31,31,706,450);ctx.strokeStyle='#d8cdb1';ctx.lineWidth=3;ctx.strokeRect(52,52,664,408);
    for(let y=78;y<460;y+=43)for(let x=88;x<716;x+=56){ctx.fillStyle=(x+y)%3?'#8b9475':'#c7baa0';ctx.globalAlpha=.32;ctx.beginPath();ctx.moveTo(x,y-12);ctx.lineTo(x+10,y);ctx.lineTo(x,y+12);ctx.lineTo(x-10,y);ctx.closePath();ctx.fill();}
    ctx.globalAlpha=.18;for(let y=0;y<512;y+=3){ctx.strokeStyle=y%2?'#f0e5cb':'#594d39';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(768,y);ctx.stroke();}
    ctx.globalAlpha=.12;for(let x=0;x<768;x+=3){ctx.strokeStyle=x%2?'#f0e5cb':'#594d39';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke();}ctx.globalAlpha=1;return texture(c);
  }
  const carpetMap=weaveTexture('#e9e1d3','#afa590'),pillowMap=weaveTexture('#45645a','#c8d1b8');carpetMap.repeat.set(20,20);
  const leather=canvas(256,256),leatherCtx=leather.getContext('2d');leatherCtx.fillStyle='#888';leatherCtx.fillRect(0,0,256,256);
  for(let i=0;i<17000;i++){leatherCtx.fillStyle=`rgba(${random()>.5?'205,205,205':'48,48,48'},${.04+random()*.13})`;leatherCtx.fillRect(random()*256,random()*256,.5+random(),.5+random());}
  const leatherMap=texture(leather,3,3);
  const mats={
    floor:new THREE.MeshStandardMaterial({map:carpetMap,bumpMap:carpetMap,bumpScale:.018,roughness:1}),
    wood:new THREE.MeshStandardMaterial({color:0x75523a,roughness:.53}),
    fabric:new THREE.MeshPhysicalMaterial({color:0xb91420,bumpMap:leatherMap,bumpScale:.007,roughness:.36,clearcoat:.24,clearcoatRoughness:.34}),
    piping:new THREE.MeshStandardMaterial({color:0x79121a,roughness:.5}),
    chrome:new THREE.MeshStandardMaterial({color:0xced5de,metalness:.92,roughness:.21}),
    pillow:new THREE.MeshStandardMaterial({map:pillowMap,color:0xffffff,roughness:1}),
    cream:new THREE.MeshStandardMaterial({color:0xd9ccb2,roughness:.92}),
    wall:new THREE.MeshStandardMaterial({color:0xeee7d9,roughness:1}),
    accent:new THREE.MeshStandardMaterial({color:0xeee7d9,roughness:1}),
    trim:new THREE.MeshStandardMaterial({color:0xf9f5e9,roughness:.78}),
    brass:new THREE.MeshStandardMaterial({color:0xa88c57,metalness:.75,roughness:.34}),
    charcoal:new THREE.MeshStandardMaterial({color:0x1a2423,metalness:.2,roughness:.43}),
    paper:new THREE.MeshStandardMaterial({color:0xe7ddc6,roughness:.95}),
  };
  function mesh(g,m,parent=group){const o=new THREE.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function rounded(w,h,d,x,y,z,material,r=.06){const o=mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/3,h/3,d/3)),material);o.position.set(x,y,z);return o;}
  function cylinder(rt,rb,h,x,y,z,m,segments=28){const o=mesh(new THREE.CylinderGeometry(rt,rb,h,segments),m);o.position.set(x,y,z);return o;}
  function sphere(x,y,z,sx,sy,sz,m){const o=mesh(new THREE.SphereGeometry(1,20,12),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o;}
  function line(points,r,m){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*4),r,6,false),m);}

  // Cutaway room shell: the front and camera-side wall are intentionally open.
  const floor=mesh(new THREE.PlaneGeometry(14.4,14.2),mats.floor);floor.rotation.x=-Math.PI/2;floor.position.set(0,0,1.1);floor.castShadow=false;
  rounded(14.4,7.25,.22,0,3.60,-5.90,mats.wall,.025);
  rounded(.20,7.25,13,-7.10,3.60,.60,mats.wall,.025);
  rounded(.20,7.25,3.2,7.10,3.60,-4.2,mats.wall,.025);
  rounded(14.15,.16,.10,0,.12,-5.735,mats.trim,.018);
  rounded(.10,.16,12.8,-6.94,.12,.60,mats.trim,.018);
  rounded(8.8,6.8,.045,-.35,3.45,-5.747,mats.accent,.01);
  rounded(8.95,.10,.15,-.35,6.85,-5.68,mats.wood,.015);

  // Projection screen and restrained walnut media console.
  rounded(7.9,4.53,.16,-.35,3.96,-5.62,mats.charcoal,.08);
  rounded(7.64,4.30,.04,-.35,3.96,-5.519,mats.brass,.025);
  const blackScreen=mesh(new THREE.PlaneGeometry(7.45,4.19),new THREE.MeshBasicMaterial({color:0x020305}));blackScreen.position.set(-.35,3.96,-5.489);blackScreen.castShadow=false;blackScreen.receiveShadow=false;
  const screenMap=new THREE.VideoTexture(video);screenMap.colorSpace=THREE.SRGBColorSpace;
  const screen=mesh(new THREE.PlaneGeometry(7.45,7.45*534/1280),new THREE.MeshBasicMaterial({map:screenMap,toneMapped:false}));screen.position.set(-.35,3.96,-5.478);screen.castShadow=false;screen.receiveShadow=false;screen.visible=false;
  const powerLed=mesh(new THREE.SphereGeometry(.025,8,8),new THREE.MeshBasicMaterial({color:0xff415a}));powerLed.position.set(3.35,1.78,-5.5);
  rounded(7.4,.65,.75,-.35,.68,-5.1,mats.wood,.055);
  rounded(7.5,.095,.83,-.35,1.04,-5.08,mats.wood,.032);
  for(const x of[-3.78,-.35,3.08])rounded(.035,.44,.03,x,.7,-4.701,mats.brass,.008);
  for(const x of[-3.45,2.75]){rounded(.74,.52,.48,x,1.32,-5.08,mats.charcoal,.055);const front=mesh(new THREE.CircleGeometry(.15,24),mats.charcoal);front.position.set(x,1.33,-4.831);}

  // Red leather fold-down futon: three tufted panels, box arms and a chrome base.
  const sofaStart=group.children.length;
  for(const x of[-.72,4.12])for(const z of[2.52,4.19])rounded(.065,.42,.065,x,.23,z,mats.chrome,.012);
  for(const z of[2.52,4.19])rounded(4.91,.065,.065,1.70,.43,z,mats.chrome,.012);
  for(const x of[-.72,1.70,4.12])rounded(.065,.065,1.72,x,.43,3.35,mats.chrome,.012);
  rounded(5.15,.26,1.91,1.70,.59,3.38,mats.fabric,.08);
  for(const x of[.16,1.70,3.24]){
    rounded(1.50,.24,1.50,x,.82,3.19,mats.fabric,.085);
    line([[x-.70,.852,2.445],[x,.860,2.433],[x+.70,.852,2.445]],.009,mats.piping);
    const backGeometry=new RoundedBoxGeometry(1.50,1.09,.24,12,.06),v=backGeometry.attributes.position;
    for(let i=0;i<v.count;i++){const vx=v.getX(i),vy=v.getY(i),vz=v.getZ(i);if(vz<-.03){let dent=0;for(const bx of[-.45,0,.45])for(const by of[-.27,.16])dent+=.049*Math.exp(-((vx-bx)**2+(vy-by)**2)/.012);v.setZ(i,vz+dent);}}
    backGeometry.computeVertexNormals();const back=mesh(backGeometry,mats.fabric);back.position.set(x,1.36,4.05);back.rotation.x=-.12;
    for(const bx of[-.45,0,.45])for(const by of[-.27,.16]){const button=sphere(x+bx,1.36+by,3.992+by*.12,.023,.023,.013,mats.piping);button.rotation.x=-.12;}
    for(const y of[1.10,1.53])line([[x-.66,y,3.942+(y-1.36)*.12],[x,y,3.953+(y-1.36)*.12],[x+.66,y,3.942+(y-1.36)*.12]],.0045,mats.piping);
    for(const hx of[-.61,.61]){const hinge=cylinder(.052,.052,.05,x+hx,.89,4.10,mats.chrome,16);hinge.rotation.z=Math.PI/2;}
  }
  for(const x of[-.91,4.31])rounded(.32,.76,1.96,x,1.03,3.38,mats.fabric,.052);
  const sofa=new THREE.Group();group.children.slice(sofaStart).forEach(o=>{o.position.x-=1.70;o.position.z-=3.38;sofa.add(o);});sofa.position.set(-.35,0,3.38);group.add(sofa);

  // Medium brown sofa at the left window, retaining the original soft shape.
  const brown=new THREE.MeshStandardMaterial({color:0x7b543b,roughness:.83,bumpMap:leatherMap,bumpScale:.009}),brownStart=group.children.length;
  for(const x of[-1.36,1.36])for(const z of[-.60,.60])cylinder(.055,.06,.22,x,.12,z,mats.wood,12);
  rounded(3.25,.32,1.50,0,.40,0,brown,.12);rounded(3.08,.85,.30,0,1.0,.62,brown,.12);
  for(const x of[-.75,.75]){rounded(1.43,.24,1.1,x,.64,-.13,brown,.10);rounded(1.41,.68,.23,x,1.01,.43,brown,.10);}
  for(const x of[-1.61,1.61])rounded(.28,.67,1.51,x,.75,0,brown,.12);
  const brownSofa=new THREE.Group();group.children.slice(brownStart).forEach(o=>brownSofa.add(o));brownSofa.position.set(-5.3,0,-1.70);brownSofa.rotation.y=-Math.PI/2;group.add(brownSofa);

  // Woven rug: the design remains legible without excessive geometry.
  const rug=mesh(new THREE.PlaneGeometry(8.1,5.60),new THREE.MeshStandardMaterial({map:carpetMap,roughness:1,side:THREE.DoubleSide}));rug.rotation.x=-Math.PI/2; rug.position.set(.8,.008,2.40);rug.castShadow=false;
  const fringePositions=[];
  for(const z of[-.43,5.23])for(let x=-3.2;x<4.8;x+=.095){const end=z+(z<0?-.08:.08),w=.012;fringePositions.push(x,.019,z,x+w,.019,z,x,.019,end,x+w,.019,z,x+w,.019,end,x,.019,end);}
  // The room has continuous eggshell carpet, without a contrasting area rug.

  // Tan rectangular coffee table with a white open cubby and metal legs.
  const tan=new THREE.MeshStandardMaterial({color:0xcab28e,roughness:.62}),shelfWhite=new THREE.MeshStandardMaterial({color:0xf8f5ed,roughness:.64});
  rounded(3.45,.12,1.52,-.35,.76,1.10,tan,.025);
  rounded(3.37,.08,1.44,-.35,.37,1.10,tan,.02);
  rounded(3.19,.026,1.28,-.35,.424,1.10,shelfWhite,.008);
  rounded(3.18,.28,.045,-.35,.57,.408,shelfWhite,.01);
  for(const x of[-2,1.3]){rounded(.09,.32,1.42,x,.57,1.10,tan,.015);rounded(.014,.28,1.29,x+(x<0?.052:-.052),.57,1.10,shelfWhite,.004);}
  for(const x of[-1.85,1.15])for(const z of[.52,1.68])rounded(.058,.33,.058,x,.18,z,mats.chrome,.012);
  const snacksStart=group.children.length;
  const bookMat=new THREE.MeshStandardMaterial({color:0x46635c,roughness:.8});
  rounded(.76,.085,.56,-.30,.746,1.04,bookMat,.016);rounded(.70,.052,.53,-.30,.816,1.04,mats.paper,.012);
  const bowlProfile=[[0,0],[.25,.015],[.37,.10],[.43,.235],[.425,.267],[.39,.257],[.34,.12],[.23,.054],[0,.049]].map(p=>new THREE.Vector2(...p));
  const bowl=mesh(new THREE.LatheGeometry(bowlProfile,32),mats.cream);bowl.position.set(.90,.695,.96);
  const popcornGeo=new THREE.SphereGeometry(.055,8,6),popcorn=new THREE.InstancedMesh(popcornGeo,mats.paper,32),dummy=new THREE.Object3D();
  for(let i=0;i<32;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*.29;dummy.position.set(.90+Math.cos(a)*r,.928+random()*.035,.96+Math.sin(a)*r);dummy.scale.set(.8+random()*.5,.65+random()*.5,.8+random()*.5);dummy.updateMatrix();popcorn.setMatrixAt(i,dummy.matrix);}popcorn.castShadow=true;popcorn.receiveShadow=true;group.add(popcorn);
  cylinder(.12,.10,.24,1.79,.820,.70,mats.accent,24);const handle=mesh(new THREE.TorusGeometry(.09,.023,7,18),mats.accent);handle.position.set(1.92,.826,.70);handle.rotation.y=Math.PI/2;
  const snacks=new THREE.Group();group.children.slice(snacksStart).forEach(o=>snacks.add(o));snacks.position.set(-1.03,.145,.13);group.add(snacks);

  // Warm fabric-shaded floor lamp and a quiet curtain/window corner.
  cylinder(.35,.38,.065,-3.35,.055,3.40,mats.brass,32);
  cylinder(.027,.035,2.44,-3.35,1.31,3.40,mats.brass,16);
  const shadeMat=new THREE.MeshStandardMaterial({color:0xe8d8ad,roughness:.93,side:THREE.DoubleSide,emissive:0xffc977,emissiveIntensity:.16});
  const shade=mesh(new THREE.CylinderGeometry(.37,.54,.69,40,1,true),shadeMat);shade.position.set(-3.35,2.63,3.40);
  for(const [y,r] of[[2.285,.54],[2.975,.37]]){const ring=mesh(new THREE.TorusGeometry(r,.011,6,40),mats.cream);ring.rotation.x=Math.PI/2;ring.position.set(-3.35,y,3.40);}
  sphere(-3.35,2.60,3.40,.105,.12,.105,new THREE.MeshBasicMaterial({color:0xffdf91}));
  const lampGlow=new THREE.PointLight(0xffc985,22,10,2);lampGlow.position.set(-3.35,2.55,3.40);group.add(lampGlow);
  const glassMat=new THREE.MeshStandardMaterial({color:0x758c9e,roughness:.18,metalness:.3,emissive:0x384553,emissiveIntensity:.24});
  for(const x of[-5.55,5.05]){
    rounded(1.42,4.30,.09,x,3.30,-5.70,mats.trim,.025);
    rounded(1.22,4.06,.035,x,3.30,-5.641,glassMat,.01);
    rounded(.055,4.07,.046,x,3.30,-5.609,mats.trim,.008);
    rounded(1.24,.064,.046,x,3.30,-5.609,mats.trim,.008);
    rounded(1.55,.09,.20,x,1.10,-5.60,mats.trim,.018);
  }

  const screenGlow=new THREE.PointLight(0xcfe0ff,0,14,2);screenGlow.position.set(-.35,3.9,-4.6);group.add(screenGlow);
  const roomFill=new THREE.HemisphereLight(0xffead0,0x4a4238,.6);group.add(roomFill);
  group.userData.screenTexture=screenMap;
  group.userData.cinemaNotes='Red tufted leather futon with fold hinges and chrome frame; supplied Marvel video on the TV.';
  const cameraPosition=new THREE.Vector3(10,7,.6),cameraTarget=new THREE.Vector3(-.8,1.95,-.8);
  function update(time,aspect=16/9){const on=Math.max(0,Math.min(1,(time-.65)/.45));screen.visible=on>0;screen.scale.y=Math.max(.001,on);screenGlow.intensity=on*(8+Math.sin(time*1.7)*1.2);powerLed.material.color.set(on>0?0x77bbff:0xff415a);const zoom=Math.max(0,Math.min(1,(time-4)/3));const q=zoom*zoom*(3-2*zoom);cameraPosition.lerpVectors(new THREE.Vector3(10,7,.6),new THREE.Vector3(4.4,5.3,7.7),q);cameraTarget.lerpVectors(new THREE.Vector3(-.8,1.95,-.8),new THREE.Vector3(-.35,3.96,-5.48),q);if(aspect<1.2)cameraPosition.addScaledVector(cameraPosition.clone().sub(cameraTarget).normalize(),(1.2/aspect-1)*8);}
  function start(){screen.visible=false;screenGlow.intensity=0;powerLed.material.color.set(0xff415a);update(0);}
  function stop(){screen.visible=false;screenGlow.intensity=0;}
  return {group,screen,sofa,screenGlow,start,stop,update,dadPosition:new THREE.Vector3(-.70,.99-1.307146,3.25),cameraPosition,cameraTarget};
}
