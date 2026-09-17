import * as THREE from 'three';

/** Self-contained gym vignette. Dad and the stage share an unscaled origin.
 * Call start(), then update(elapsed), then dad.animate(animationTime,pose).
 * The avatar's workoutSync hook aligns the bar to both palms after joint posing.
 */
export function createGymScene({dad,reduced=false}){
  const group=new THREE.Group();group.name='Another year stronger — gym';group.visible=false;
  const material=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const rubber=material('#26313b',.96),wall=material('#203346',.94),steel=material('#7d8c99',.32,.78),iron=material('#26303b',.6,.42),gold=material('#edbc52',.42,.38),wood=material('#9b7551',.7),ink=material('#121b27',.93);
  function mesh(geometry,mat,parent=group,p=[0,0,0]){const m=new THREE.Mesh(geometry,mat);m.position.set(...p);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const box=(w,h,d,mat,p,parent=group)=>mesh(new THREE.BoxGeometry(w,h,d),mat,parent,p);
  box(9,.12,8.6,rubber,[0,-.07,.05]);box(3.6,.025,3.35,wood,[0,-.003,-.20]);
  for(const x of [-2.45,2.45])box(1.25,.035,3.5,ink,[x,.002,-.2]);
  for(let x=-4;x<=4;x++)box(.009,.006,8.5,ink,[x,.002,.05]);
  for(let z=-4;z<=4;z++)box(9,.006,.009,ink,[0,.002,z]);
  box(9,4.1,.18,wall,[0,2.0,-3.1]);box(.18,4.1,4,wall,[-4.5,2,-1.1]);box(.18,4.1,4,wall,[4.5,2,-1.1]);
  const glow=new THREE.MeshBasicMaterial({color:'#efc666'}),cool=new THREE.MeshBasicMaterial({color:'#87c7db'});
  box(8.4,.025,.022,glow,[0,.25,-2.997]);box(8.4,.025,.022,cool,[0,3.85,-2.997]);
  for(const x of [-3.35,3.35]){
    box(.095,2.85,.12,steel,[x,1.425,-2.35]);box(.095,2.85,.12,steel,[x+(x<0?1.2:-1.2),1.425,-2.35]);
    box(1.3,.095,.12,steel,[x+(x<0?.6:-.6),2.82,-2.35]);box(1.65,.10,.70,ink,[x+(x<0?.6:-.6),.06,-2.35]);
    for(let y=.55;y<2.5;y+=.22)for(const dx of [0,x<0?1.2:-1.2])box(.016,.022,.004,ink,[x+dx,y,-2.282]);
    box(1.32,.07,.08,steel,[x+(x<0?.6:-.6),1.78,-2.15]);
    for(let j=0;j<3;j++){const p=mesh(new THREE.CylinderGeometry(.24,.24,.07,28),iron,group,[x+(x<0?.6:-.6),.4+j*.10,-2.1]);p.rotation.z=Math.PI/2;}
  }
  function sign(text,w,h,color='#fff5df',size=54){
    let canvas,texture,context;
    if(typeof document!=='undefined'){canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;context=canvas.getContext('2d');texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;}
    const mat=new THREE.MeshBasicMaterial({map:texture||null,transparent:!!texture,color:texture?'#ffffff':color,depthWrite:false});
    const m=mesh(new THREE.PlaneGeometry(w,h),mat);m.castShadow=false;m.receiveShadow=false;
    function set(value){m.userData.text=value;if(context){context.clearRect(0,0,1024,256);context.fillStyle=color;context.textAlign='center';context.textBaseline='middle';context.font=`700 ${size}px system-ui, sans-serif`;context.fillText(value,512,128);texture.needsUpdate=true;}}
    set(text);return {mesh:m,set};
  }
  const title=sign('ANOTHER YEAR STRONGER',5.5,.65,'#f7ecd6',58);title.mesh.position.set(0,3.26,-2.991);
  const subtitle=sign('DAD’S PERSONAL BEST',3.7,.38,'#a9c5d0',43);subtitle.mesh.position.set(0,2.88,-2.982);
  const reps=sign('READY, DAD?',2.2,.48,'#ffd064',62);reps.mesh.position.set(0,2.40,-2.98);
  const barbell=new THREE.Group();barbell.name='Absurdly heavy barbell';group.add(barbell);
  const shaft=mesh(new THREE.CylinderGeometry(.022,.022,2.72,20),steel,barbell);shaft.rotation.z=Math.PI/2;
  for(const side of [-1,1]){
    for(let i=0;i<6;i++){
      const plate=mesh(new THREE.CylinderGeometry(.37-(i%2)*.012,.37-(i%2)*.012,.066,36),i%2?iron:ink,barbell,[side*(.69+i*.073),0,0]);plate.rotation.z=Math.PI/2;
      const ring=mesh(new THREE.TorusGeometry(.327,.009,6,36),steel,barbell,[side*(.724+i*.073),0,0]);ring.rotation.y=Math.PI/2;
    }
    const collar=mesh(new THREE.CylinderGeometry(.065,.065,.10,20),gold,barbell,[side*1.165,0,0]);collar.rotation.z=Math.PI/2;
    const label=sign('100',.39,.18,'#f4c559',96);group.remove(label.mesh);barbell.add(label.mesh);label.mesh.position.set(side*1.089,0,0);label.mesh.rotation.y=side*Math.PI/2;
  }
  group.add(new THREE.HemisphereLight('#e9f4ff','#6b6358',1.75));
  const key=new THREE.DirectionalLight('#fff0dc',2.5);key.position.set(-3.5,6,4.5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-4,right:4,top:5,bottom:-3,near:.5,far:20});key.shadow.normalBias=.018;group.add(key);group.add(key.target);
  const fill=new THREE.DirectionalLight('#a9d9ff',1.2);fill.position.set(4,3.5,1);group.add(fill);
  const back=new THREE.PointLight('#edb45e',12,9,2);back.position.set(-2.4,3,-1.8);group.add(back);
  let active=false,elapsed=0,lastLabel='';
  const left=new THREE.Vector3(),right=new THREE.Vector3(),mid=new THREE.Vector3(),axis=new THREE.Vector3(),center=new THREE.Vector3(0,1.18,0),rotated=new THREE.Vector3();
  const api={group,cameraPosition:new THREE.Vector3(3.5,2.8,6.4),cameraTarget:new THREE.Vector3(0,1.48,-.05),duration:29,pose:'workout',animationTime:0,start,update,stop};
  function syncBarbell(){
    if(!active)return;
    const t=elapsed,held=t>=2.2&&t<6.2||t>=26.75;
    if(held){dad.getWorkoutGripPoints(left,right);group.worldToLocal(left);group.worldToLocal(right);barbell.position.copy(mid.copy(left).add(right).multiplyScalar(.5));axis.subVectors(left,right).normalize();barbell.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),axis);barbell.visible=true;return;}
    barbell.quaternion.identity();
    if(t<2.2){barbell.position.set(0,.39,.50);barbell.visible=true;}
    else if(t<7){const s=t-6.2;barbell.position.set(0,2.592+12*s-3*s*s,.484);barbell.rotation.x=reduced?0:s*.8;barbell.visible=true;}
    else if(t<26){barbell.visible=false;}
    else{const s=t-26;barbell.position.set(0,8.956-5*s-4.65*s*s,.484);barbell.rotation.x=reduced?0:(.75-s)*.8;barbell.visible=true;}
  }
  function start(){active=true;group.visible=true;dad.setOutfit('gym');dad.group.visible=true;dad.group.scale.setScalar(1);dad.group.position.set(0,0,0);dad.group.rotation.set(0,0,0);dad.group.userData.workoutSync=syncBarbell;update(0);}
  function update(time){
    elapsed=THREE.MathUtils.clamp(time,0,api.duration);api.animationTime=elapsed;api.pose='workout';
    dad.group.rotation.set(0,0,0);dad.group.position.set(0,0,0);
    if(elapsed>=21.3&&elapsed<22.8){const u=(elapsed-21.3)/1.5;dad.group.rotation.x=reduced?0:-Math.PI*2*(u*u*(3-2*u));rotated.copy(center).applyEuler(dad.group.rotation);dad.group.position.copy(center).sub(rotated);dad.group.position.y+=Math.sin(u*Math.PI)*(reduced?.16:1.50);}
    let label=elapsed<.7?'READY, DAD?':elapsed<6.2?'LIGHT WORK.':elapsed<10.2?'ANY SECOND NOW…':elapsed<12?'WHILE WE WAIT…':elapsed<20?`${Math.min(10,Math.floor((elapsed-12)/.8+1e-7))} / 10`:elapsed<21.3?'10 / 10':elapsed<23.35?'STILL GOT IT.':elapsed<25.8?'PLENTY OF TIME.':elapsed<27.55?'GOT IT.':'PERSONAL BEST.';
    if(label!==lastLabel){lastLabel=label;reps.set(label);}syncBarbell();
  }
  function stop(){active=false;group.visible=false;if(dad.group.userData.workoutSync===syncBarbell)delete dad.group.userData.workoutSync;dad.group.rotation.set(0,0,0);dad.group.position.set(0,0,0);}
  return api;
}
