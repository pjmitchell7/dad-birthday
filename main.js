import * as THREE from 'three';
import { createHome, box, ball } from './house.js';
import { createDad } from './assets/avatar.js';
import { createCar } from './assets/cars.js';
import { mergeStaticChildren } from './assets/mergeStaticChildren.js';

const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas=$('world');
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'}); }
catch(error){$('error').hidden=false;$('loading').style.display='none';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
const scene=new THREE.Scene();scene.background=new THREE.Color('#b9dfed');scene.fog=new THREE.Fog('#c7e1dd',37,95);
const lightPixels=new Uint8Array(64*32*4);for(let y=0;y<32;y++)for(let x=0;x<64;x++){const c=new THREE.Color(y<16?'#d5e8f2':'#9baf80');if(y>11&&y<17)c.set('#faf5dc');const i=(y*64+x)*4;lightPixels[i]=Math.round(c.r*255);lightPixels[i+1]=Math.round(c.g*255);lightPixels[i+2]=Math.round(c.b*255);lightPixels[i+3]=255;}const environment=new THREE.DataTexture(lightPixels,64,32);environment.mapping=THREE.EquirectangularReflectionMapping;environment.needsUpdate=true;scene.environment=environment;scene.environmentIntensity=.65;
const camera=new THREE.OrthographicCamera(-10,10,6,-6,.1,150);
scene.add(new THREE.HemisphereLight('#e2f2ff','#879060',2.35));
const sun=new THREE.DirectionalLight('#fff0ce',3.3);sun.position.set(-9,16,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-18,right:18,top:17,bottom:-14,near:.5,far:55});sun.shadow.bias=-.0005;sun.shadow.normalBias=.035;sun.shadow.radius=3;scene.add(sun);
const home=createHome();mergeStaticChildren(home.group,{preserve:[home.doorPivot,...home.clouds],dropUVs:true});scene.add(home.group);
const dad=createDad();dad.group.position.set(-1.05,.62,2.9);scene.add(dad.group);
const silver=createCar('silver'),blue=createCar('blue');silver.group.position.set(3.5,.1,6);blue.group.position.set(6.6,.1,6.25);scene.add(silver.group,blue.group);
const parked={silver:silver.group.position.clone(),blue:blue.group.position.clone()};
const doorPoint=new THREE.Vector3(-1.05,1.7,2.7);
const anchors={movie:new THREE.Vector3(-3.65,3.65,3.25),gym:new THREE.Vector3(.5,4.5,3),drive:new THREE.Vector3(6.6,3.0,6.25)};
const sparkles=new THREE.Group();scene.add(sparkles);for(let i=0;i<16;i++){const sp=new THREE.Mesh(new THREE.OctahedronGeometry(.047),new THREE.MeshBasicMaterial({color:i%2?'#fff6bd':'#f7cd57'}));sparkles.add(sp);}sparkles.visible=false;
let selected=null,phase='intro',phaseStart=0,globalTime=0,outfitStart=-100,activeCar=null,width=1,height=1;
let endingAt=0;const start=performance.now();
const baseDad=new THREE.Vector3(-1.05,.62,2.9),cameraTarget=new THREE.Vector3(1.1,2.3,2);
const clamp=THREE.MathUtils.clamp;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const info={movie:{hint:'Movie night it is. Tap the glowing doorway to head inside.',target:'Come on in',chapter:'MOVIE NIGHT'},gym:{hint:'Looking strong. Tap the silver Nissan when you’re ready.',target:'Let’s hit the gym',chapter:'HIT THE GYM'},drive:{hint:'Looking sharp. Tap the blue Maserati and let’s go.',target:'Let’s take a drive',chapter:'TAKE A DRIVE'}};
function resize(){width=innerWidth;height=innerHeight;renderer.setSize(width,height,false);const aspect=width/height;let viewH=aspect<.85?22/aspect:Math.max(11.6,21.8/aspect);camera.left=-viewH*aspect/2;camera.right=viewH*aspect/2;camera.top=viewH/2;camera.bottom=-viewH/2;camera.updateProjectionMatrix();if(aspect<.85)cameraTarget.set(1.1,3.2,2);else cameraTarget.set(1.1,2.45,2);camera.position.set(1.1,9.1,26);camera.lookAt(cameraTarget);layout();}
function project(point){const p=point.clone().project(camera);return {x:(p.x*.5+.5)*width,y:(-.5*p.y+.5)*height};}
function layout(){for(const [name,p] of Object.entries(anchors)){const q=project(p);$(name).style.left=`${clamp(q.x,90,width-90)}px`;$(name).style.top=`${q.y}px`;}
 if(selected){const p=selected==='movie'?doorPoint:(selected==='gym'?silver:blue).group.position.clone().add(new THREE.Vector3(0,1.1,1.2));const q=project(p);$('destination').style.left=`${q.x}px`;$('destination').style.top=`${q.y}px`;}}
window.addEventListener('resize',resize);resize();
function setControls(enabled){for(const el of document.querySelectorAll('.choice'))el.disabled=!enabled;$('choices').style.opacity=enabled?'1':'0';$('choices').style.pointerEvents=enabled?'auto':'none';}
function select(mode){if(!['intro','idle','selected'].includes(phase))return;selected=mode;phase='selected';phaseStart=globalTime;dad.group.visible=true;dad.group.position.copy(baseDad);dad.group.rotation.set(0,0,0);dad.setOutfit(mode);outfitStart=globalTime;home.doorPivot.rotation.y=0;home.doorwayGlow.intensity=mode==='movie'?5:0;for(const el of document.querySelectorAll('.choice'))el.setAttribute('aria-pressed',String(el.dataset.mode===mode));$('hint-text').textContent=info[mode].hint;$('destination-label').textContent=info[mode].target;$('destination').hidden=false;$('chapter').textContent=info[mode].chapter;layout();}
for(const el of document.querySelectorAll('.choice'))el.addEventListener('click',()=>select(el.dataset.mode));
function confirm(){if(phase!=='selected')return;phase=selected==='movie'?'enter':'walk';phaseStart=globalTime;$('destination').hidden=true;setControls(false);$('hint-text').textContent=selected==='movie'?'Save me the seat next to you.':selected==='gym'?'Let’s get a good one in.':'Now that’s a birthday entrance.';if(selected!=='movie')activeCar=selected==='gym'?silver:blue;}
$('destination').addEventListener('click',confirm);
const raycaster=new THREE.Raycaster();canvas.addEventListener('pointerup',event=>{if(phase!=='selected')return;raycaster.setFromCamera(new THREE.Vector2(event.clientX/width*2-1,1-event.clientY/height*2),camera);const target=selected==='movie'?home.doorPivot:(selected==='gym'?silver:blue).group;if(raycaster.intersectObject(target,true).length)confirm();});
function reset(){selected=null;phase='idle';phaseStart=globalTime;activeCar=null;dad.group.visible=true;dad.group.scale.setScalar(1);dad.group.position.copy(baseDad);dad.group.rotation.set(0,0,0);dad.setOutfit('default');silver.group.position.copy(parked.silver);blue.group.position.copy(parked.blue);silver.group.rotation.y=blue.group.rotation.y=0;home.doorPivot.rotation.y=0;home.doorwayGlow.intensity=0;home.group.visible=true;silver.group.visible=blue.group.visible=true;scene.background.set('#b9dfed');scene.fog=new THREE.Fog('#c7e1dd',37,95);cinema.visible=false;sun.intensity=3.3;$('ending').hidden=true;$('curtain').classList.remove('closed');$('destination').hidden=true;$('hint').style.display='flex';$('hint-text').textContent='A whole day of your favorite things. Pick one.';$('chapter').textContent='HOME SWEET HOME';for(const el of document.querySelectorAll('.choice'))el.setAttribute('aria-pressed','false');setControls(true);resize();}
$('reset').addEventListener('click',reset);$('home').addEventListener('click',reset);
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();}else{await $('app').requestFullscreen();if(screen.orientation?.lock)await screen.orientation.lock('landscape').catch(()=>{});}}catch{$('hint-text').textContent='For a bigger view, turn your phone sideways.';}});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit full screen':'Full screen');resize();});
// A brief movie-night payoff, with the birthday message on the screen.
const cinema=new THREE.Group();cinema.visible=false;scene.add(cinema);
box(cinema,26,.2,20,0,-.1,1,'#202f36');box(cinema,25,10,.4,0,5,-5,'#344451');
box(cinema,10.9,5.9,.35,0,4.1,-4.7,'#111f2a');const screenMat=new THREE.MeshBasicMaterial({color:'#dfedcf'});const movieScreen=new THREE.Mesh(new THREE.PlaneGeometry(10.3,5.3),screenMat);movieScreen.position.set(0,4.1,-4.48);cinema.add(movieScreen);
const titleCanvas=document.createElement('canvas');titleCanvas.width=1024;titleCanvas.height=512;const titleCtx=titleCanvas.getContext('2d');titleCtx.fillStyle='#e4eddb';titleCtx.fillRect(0,0,1024,512);titleCtx.textAlign='center';titleCtx.fillStyle='#58715d';titleCtx.font='20px sans-serif';titleCtx.fillText('TONIGHT’S FEATURE',512,116);titleCtx.fillStyle='#253e33';titleCtx.font='bold 65px Georgia';titleCtx.fillText('A lifetime of',512,238);titleCtx.fillText('good memories.',512,320);titleCtx.font='22px sans-serif';titleCtx.fillStyle='#65806a';titleCtx.fillText('HAPPY BIRTHDAY, DAD',512,416);const titleTexture=new THREE.CanvasTexture(titleCanvas);titleTexture.colorSpace=THREE.SRGBColorSpace;screenMat.map=titleTexture;screenMat.color.set('#ffffff');
box(cinema,5.8,.8,1.8,0,.8,2,'#b87643');box(cinema,5.8,1.1,.45,0,1.37,1.2,'#c48951');for(const x of[-3.0,3.0])box(cinema,.45,1.25,2.05,x,1.06,1.9,'#c78c55');
box(cinema,3.6,.15,1.55,0,.68,4.4,'#845c39');for(const x of[-1.5,1.5])for(const z of[3.85,4.95])box(cinema,.1,.65,.1,x,.33,z,'#453e33');
const cinemaGlow=new THREE.PointLight('#c6e5ff',13,18);cinemaGlow.position.set(0,5,-2);cinema.add(cinemaGlow);
function showCinema(){home.group.visible=false;silver.group.visible=blue.group.visible=false;cinema.visible=true;scene.background.set('#263947');scene.fog=null;sun.intensity=.5;dad.group.visible=true;dad.group.position.set(-1.65,.05,2.65);dad.group.rotation.y=.13;camera.position.set(8,7,16);camera.lookAt(0,2.8,0);camera.updateMatrixWorld();$('hint').style.display='none';$('chapter').textContent='THE BEST SEAT IS NEXT TO YOU';}
function finish(){phase='ending';endingAt=globalTime;$('ending').hidden=false;$('hint').style.display='none';$('end-kicker').textContent=selected==='movie'?'MOVIE NIGHT':selected==='gym'?'ANOTHER YEAR STRONGER':'HERE’S TO THE NEXT ADVENTURE';$('end-title').textContent=selected==='movie'?'The best seat? Next to you.':selected==='gym'?'My favorite teammate.':'More miles. More memories.';$('end-copy').innerHTML='The best days are the ones we spend together.<br>Happy birthday, Dad.';$('home').focus({preventScroll:true});}
function walkingPath(t,car){const from=baseDad;const step=new THREE.Vector3(-1.05,.1,4.25),corner=new THREE.Vector3(car.group.position.x-1.25,.1,4.25),end=new THREE.Vector3(car.group.position.x-1.25,.1,5.8);const points=[from,step,corner,end];const lengths=[from.distanceTo(step),step.distanceTo(corner),corner.distanceTo(end)];let d=clamp(t,0,1)*lengths.reduce((a,b)=>a+b,0);for(let i=0;i<3;i++){if(d<=lengths[i]||i===2){dad.group.position.lerpVectors(points[i],points[i+1],clamp(d/lengths[i],0,1));const delta=points[i+1].clone().sub(points[i]);dad.group.rotation.y=Math.atan2(delta.x,delta.z);return;}d-=lengths[i];}}
function tick(){globalTime=(performance.now()-start)/1000;const elapsed=globalTime-phaseStart;let pose='idle';
 if(phase==='intro'){if(globalTime<1.5){home.doorPivot.rotation.y=-smooth(globalTime/.7)*1.5;dad.group.position.z=1.94+smooth(globalTime/1.5)*.96;pose='walk';}else if(globalTime<5){pose='wave';home.doorPivot.rotation.y=-1.5*(1-smooth((globalTime-2)/1));}else{phase='idle';phaseStart=globalTime;}}
 if(phase==='selected')pose='selected';
 if(phase==='enter'){pose='walk';home.doorPivot.rotation.y=-smooth(elapsed/.65)*1.5;dad.group.rotation.y=Math.PI;dad.group.position.z=2.9-smooth(elapsed/1.65)*1.1;if(elapsed>1.5)$('curtain').classList.add('closed');if(elapsed>2.15){showCinema();phase='cinema';phaseStart=globalTime;$('curtain').classList.remove('closed');}}
 if(phase==='cinema'){pose='selected';if(elapsed>1.4)finish();}
 if(phase==='walk'){pose='walk';walkingPath(smooth(elapsed/3.4),activeCar);if(elapsed>3.45){dad.group.visible=false;phase='driving';phaseStart=globalTime;}}
 if(phase==='driving'){const car=activeCar.group,park=selected==='gym'?parked.silver:parked.blue;const d=elapsed*elapsed*.6;if(d<5.7){car.position.z=park.z+d;car.position.x=park.x;}else{const turn=clamp((d-5.7)/3.2,0,1);car.rotation.y=-turn*Math.PI/2;car.position.z=park.z+5.7+Math.sin(turn*Math.PI/2)*2;car.position.x=park.x-(1-Math.cos(turn*Math.PI/2))*2-Math.max(0,d-8.9)*1.7;}activeCar.animate(elapsed*4,globalTime);if(elapsed>5)finish();}
 if(!reduced){dad.animate(globalTime,pose);if(phase==='idle'){dad.group.rotation.y=Math.sin(globalTime*.43)*.1;}home.clouds.forEach((c,i)=>{c.position.x+=Math.sin(globalTime*.05+i)*.0008;});}else{dad.animate(0,phase==='selected'||phase==='cinema'||phase==='ending'?'selected':'idle');}
 if(selected==='movie'&&phase==='selected')home.doorwayGlow.intensity=4.5+(reduced?0:Math.sin(globalTime*3)*1.2);
 const sparkleAge=globalTime-outfitStart;sparkles.visible=!reduced&&sparkleAge<.8&&sparkleAge>=0;if(sparkles.visible){sparkles.children.forEach((s,i)=>{const a=i*2.4;s.position.set(baseDad.x+Math.cos(a)*(sparkleAge+.35),baseDad.y+.4+i/10+sparkleAge,baseDad.z+Math.sin(a)*.55);s.scale.setScalar(1-sparkleAge/.8);s.rotation.y=globalTime*2;});}
 camera.updateMatrixWorld();layout();renderer.render(scene,camera);requestAnimationFrame(tick);
}
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();$('error').hidden=false;});
tick();$('loading').style.opacity='0';setTimeout(()=>$('loading').remove(),600);
