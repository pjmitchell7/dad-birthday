import * as THREE from 'three';
import { createHome } from './house.js';
import { createCinema } from './cinema.js';
import { createParty } from './party.js';
import { createSongWheel } from './song-wheel.js';
import { createHighwayScene } from './highway-scene.js';
import { createGymScene } from './gym-scene.js';
import { createDad } from './assets/avatar-v2.js';
import { createCar } from './assets/cars-v3.js';
import { mergeStaticChildren } from './assets/mergeStaticChildren.js';
import { loadSurfaces, applySurfaces } from './surfaces.js';
import { setSky, createPipeline } from './rendering.js';

const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas=$('world');
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'}); }
catch(error){$('error').hidden=false;$('loading').style.display='none';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
const scene=new THREE.Scene();scene.background=new THREE.Color('#b9dfed');scene.fog=new THREE.Fog('#c7e1dd',37,95);
const outdoorSky=await setSky(scene,renderer);
const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.1,180);
scene.add(new THREE.HemisphereLight('#dbeaff','#647453',.45));
const portraitFill=new THREE.DirectionalLight('#e3efff',.8);portraitFill.position.set(2,5,12);scene.add(portraitFill);
const sun=new THREE.DirectionalLight('#fff0d9',2.5);sun.position.set(-12,17,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-18,right:18,top:17,bottom:-14,near:.5,far:65});sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;sun.shadow.radius=4;scene.add(sun);
const surfaces=await loadSurfaces();const home=createHome();applySurfaces(home.group,surfaces);mergeStaticChildren(home.group,{preserve:[home.doorPivot,home.entranceFrame,home.garageDoor,...home.clouds]});scene.add(home.group);
const dad=await createDad();dad.group.position.set(-1.05,.62,2.9);scene.add(dad.group);
const silver=createCar('silver'),blue=createCar('blue');silver.group.position.set(3.5,.1,6);blue.group.position.set(6.6,.1,6.25);scene.add(silver.group,blue.group);
const pipeline=createPipeline(scene,camera,renderer);
const parked={silver:silver.group.position.clone(),blue:blue.group.position.clone()};
const doorPoint=new THREE.Vector3(-1.05,1.7,2.7);
const anchors={movie:new THREE.Vector3(-3.65,3.65,3.25),gym:new THREE.Vector3(.5,4.5,3),drive:new THREE.Vector3(6.6,3.0,6.25),celebrate:new THREE.Vector3(4.65,4.35,2.5)};
const sparkles=new THREE.Group();scene.add(sparkles);for(let i=0;i<16;i++){const sp=new THREE.Mesh(new THREE.OctahedronGeometry(.047),new THREE.MeshBasicMaterial({color:i%2?'#fff6bd':'#f7cd57'}));sparkles.add(sp);}sparkles.visible=false;
let selected=null,phase='intro',phaseStart=0,globalTime=0,outfitStart=-100,activeCar=null,width=1,height=1;
let endingAt=0,lastFrameTime=0,start=0;
let unlockedAt=-100;const visited=new Set();try{for(const activity of JSON.parse(localStorage.getItem('dads-day-activities')||'[]'))if(['movie','gym','drive'].includes(activity))visited.add(activity);}catch{}
function syncUnlock(){const unlocked=visited.size===3;$('celebrate').classList.toggle('locked',!unlocked);$('celebrate').classList.toggle('unlocked',unlocked);$('celebrate').disabled=!unlocked;$('celebrate').setAttribute('aria-label',unlocked?'Celebrate, unlocked birthday surprise':`Celebrate, locked. ${visited.size} of 3 activities tried.`);$('celebrate-progress').textContent=unlocked?'':`${visited.size}/3`;}
function rememberActivity(mode){const previous=visited.size;visited.add(mode);try{localStorage.setItem('dads-day-activities',JSON.stringify([...visited]));}catch{}syncUnlock();if(previous<3&&visited.size===3)unlockedAt=globalTime;}
syncUnlock();
const baseDad=new THREE.Vector3(-1.05,.62,2.9),cameraTarget=new THREE.Vector3(1.1,2.3,2),widePosition=new THREE.Vector3(),wideTarget=new THREE.Vector3();
const clamp=THREE.MathUtils.clamp;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const info={movie:{hint:'Movie night it is. Tap the glowing doorway to head inside.',target:'Come on in',chapter:'MOVIE NIGHT'},gym:{hint:'Looking strong. Tap the silver Nissan when you’re ready.',target:'Let’s hit the gym',chapter:'HIT THE GYM'},drive:{hint:'Looking sharp. Tap the blue Maserati and let’s go.',target:'Let’s take a drive',chapter:'TAKE A DRIVE'}};
function placeActivityCamera(activity,pullback){camera.position.copy(activity.cameraPosition);if(camera.aspect<1.2)camera.position.addScaledVector(camera.position.clone().sub(activity.cameraTarget).normalize(),(1.2/camera.aspect-1)*pullback);camera.lookAt(activity.cameraTarget);}
function resize(){width=innerWidth;height=innerHeight;renderer.setSize(width,height,false);const aspect=width/height;camera.aspect=aspect;camera.updateProjectionMatrix();pipeline.resize(width,height);const distance=Math.max(18.5,17.4/(2*Math.tan(THREE.MathUtils.degToRad(19))*aspect));wideTarget.set(1.65,3.4,2.3);widePosition.set(1.8,4.5,2.3+distance);cameraTarget.copy(wideTarget);camera.position.copy(widePosition);camera.lookAt(cameraTarget);if(phase==='party'){camera.position.set(5,3.2,2.5+Math.max(10.8,8.4/(2*Math.tan(THREE.MathUtils.degToRad(19))*aspect)));cameraTarget.copy(party.cameraTarget);camera.lookAt(cameraTarget);}if((phase==='cinema'||phase==='ending')&&selected==='movie'){cinemaData.update(globalTime-phaseStart,aspect);camera.position.copy(cinemaData.cameraPosition);camera.lookAt(cinemaData.cameraTarget);}if(phase==='gym-scene'||phase==='ending'&&selected==='gym')placeActivityCamera(gymScene,4);if(phase==='highway'||phase==='ending'&&selected==='drive')placeActivityCamera(highway,5);layout();}
function project(point){const p=point.clone().project(camera);return {x:(p.x*.5+.5)*width,y:(-.5*p.y+.5)*height};}
function layout(){if(phase==='party'){const q=project(party.binPoint);$('bin-encore').style.left=`${clamp(q.x,76,width-76)}px`;$('bin-encore').style.top=`${clamp(q.y,120,height-120)}px`;}const focused=phase==='selected';$('app').classList.toggle('focused',focused);$('app').classList.toggle('indoors',selected==='movie'&&['cinema','ending'].includes(phase));for(const [name,p] of Object.entries(anchors)){const q=project(p);$(name).style.left=`${clamp(q.x,80,width-80)}px`;$(name).style.top=`${q.y}px`;}
 if(selected){const p=selected==='movie'?new THREE.Vector3(.03,1.2,3.4):(selected==='gym'?silver:blue).group.position.clone().add(new THREE.Vector3(0,1.1,1.2));const q=project(p);$('destination').style.left=`${focused&&selected!=='movie'?width*.76:q.x}px`;$('destination').style.top=`${focused&&selected!=='movie'?height*.70:q.y}px`;}}
window.addEventListener('resize',resize);resize();
function setControls(enabled){for(const el of document.querySelectorAll('.choice'))el.disabled=!enabled||(el.id==='celebrate'&&visited.size<3);$('choices').style.opacity=enabled?'1':'0';$('choices').style.pointerEvents=enabled?'auto':'none';}
function select(mode){if(!['intro','idle','selected'].includes(phase))return;if(mode==='celebrate'){celebrate();return;}if(!info[mode])return;rememberActivity(mode);selected=mode;phase='selected';phaseStart=globalTime;dad.group.visible=true;dad.group.position.copy(baseDad);dad.group.rotation.set(0,0,0);dad.setOutfit(mode);outfitStart=globalTime;home.doorPivot.rotation.y=0;home.doorwayGlow.intensity=mode==='movie'?3:0;home.entranceFrame.material.emissive.set('#efbd43');home.entranceFrame.material.emissiveIntensity=mode==='movie'?.5:0;for(const el of document.querySelectorAll('.choice'))el.setAttribute('aria-pressed',String(el.dataset.mode===mode));$('hint-text').textContent=info[mode].hint;$('destination-label').textContent=info[mode].target;$('destination').hidden=false;$('chapter').textContent=info[mode].chapter;layout();}
for(const el of document.querySelectorAll('.choice'))el.addEventListener('click',()=>select(el.dataset.mode));
function confirm(){if(phase!=='selected')return;phase=selected==='movie'?'enter':'walk';phaseStart=globalTime;$('destination').hidden=true;setControls(false);$('hint-text').textContent=selected==='movie'?'Movie night.':selected==='gym'?'Time to work out.':'Let’s go.';if(selected!=='movie')activeCar=selected==='gym'?silver:blue;else primeMovie();}
$('destination').addEventListener('click',confirm);
const raycaster=new THREE.Raycaster();canvas.addEventListener('pointerup',event=>{if(phase!=='selected'&&phase!=='party')return;raycaster.setFromCamera(new THREE.Vector2(event.clientX/width*2-1,1-event.clientY/height*2),camera);if(phase==='party'){if(party.binReady&&raycaster.intersectObject(party.trashCan,true).length)shakeBin();return;}const targets=selected==='movie'?[home.doorPivot,home.entranceFrame]:[(selected==='gym'?silver:blue).group];if(raycaster.intersectObjects(targets,true).length)confirm();});
function shakeBin(){if(phase==='party'&&party.shakeBin(globalTime)){$('bin-encore').hidden=true;$('bin-encore').disabled=true;$('party-announcement').textContent='';}}
$('bin-encore').addEventListener('click',shakeBin);
function reset(){party.stop();songWheel.stop();stopMovie();highway.stop();gymScene.stop();scene.add(blue.group,silver.group);selected=null;phase='idle';phaseStart=globalTime;activeCar=null;scene.add(dad.group);dad.group.visible=true;dad.group.scale.setScalar(1);dad.group.position.copy(baseDad);dad.group.rotation.set(0,0,0);dad.setOutfit('default');silver.group.position.copy(parked.silver);blue.group.position.copy(parked.blue);silver.group.rotation.y=blue.group.rotation.y=0;home.doorPivot.rotation.y=0;home.doorwayGlow.intensity=0;home.entranceFrame.material.emissiveIntensity=0;home.group.visible=true;silver.group.visible=blue.group.visible=true;scene.background=outdoorSky;scene.fog=new THREE.Fog('#c7e1dd',37,95);cinema.visible=false;sun.intensity=2.5;scene.environmentIntensity=.6;$('ending').hidden=true;$('curtain').classList.remove('closed');$('destination').hidden=true;$('hint').style.display='flex';$('hint-text').textContent='A whole day of your favorite things. Pick one.';$('chapter').textContent='HOME SWEET HOME';for(const el of document.querySelectorAll('.choice'))el.setAttribute('aria-pressed','false');setControls(true);resize();}
$('reset').addEventListener('click',reset);$('home').addEventListener('click',reset);
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();}else{await $('app').requestFullscreen();if(screen.orientation?.lock)await screen.orientation.lock('landscape').catch(()=>{});}}catch{$('hint-text').textContent='For a bigger view, turn your phone sideways.';}});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit full screen':'Full screen');resize();});
const movieVideo=$('movie-video');movieVideo.volume=.55;let movieMuted=false,movieGeneration=0,movieStarted=false;
const cinemaData=createCinema({video:movieVideo});const cinema=cinemaData.group;mergeStaticChildren(cinema,{preserve:[cinemaData.screen]});cinema.visible=false;scene.add(cinema);
function primeMovie(){const generation=++movieGeneration;movieStarted=false;movieVideo.muted=true;movieVideo.currentTime=0;movieVideo.play().then(()=>{if(generation===movieGeneration&&phase==='enter'){movieVideo.pause();movieVideo.currentTime=0;}}).catch(()=>{});}
function playMovie(){const generation=++movieGeneration;movieStarted=true;movieVideo.muted=movieMuted;movieVideo.play().then(()=>{if(generation!==movieGeneration){if(!['cinema','enter'].includes(phase))movieVideo.pause();return;}$('movie-play').hidden=true;}).catch(()=>{if(generation===movieGeneration&&phase==='cinema'){$('movie-play').hidden=false;$('movie-play').textContent='Play intro';}});}
function stopMovie(){++movieGeneration;movieStarted=false;movieVideo.pause();movieVideo.currentTime=0;cinemaData.stop();$('movie-play').hidden=true;$('movie-mute').hidden=true;}
$('movie-play').addEventListener('click',playMovie);$('movie-mute').addEventListener('click',()=>{movieMuted=!movieMuted;movieVideo.muted=movieMuted;$('movie-mute').textContent=movieMuted?'Sound off':'Sound on';$('movie-mute').setAttribute('aria-label',movieMuted?'Unmute movie':'Mute movie');});
movieVideo.addEventListener('ended',()=>{if(phase==='cinema')finish();});
$('scene-home').addEventListener('click',reset);
const party=await createParty({scene,home,dad,silver,blue,sun,portraitFill,reduced});
const music=$('party-music');music.volume=.45;
const songWheel=createSongWheel({audio:music,onTrackChange:track=>{if(phase==='party')$('chapter').textContent=`${track.title.toUpperCase()} · BIRTHDAY EDITION`;}});
const highway=createHighwayScene({car:blue,dad,reduced});scene.add(highway.group);
const gymScene=createGymScene({dad,reduced});scene.add(gymScene.group);
function showGym(){scene.add(dad.group);home.group.visible=false;silver.group.visible=blue.group.visible=false;cinema.visible=false;gymScene.start();scene.background=new THREE.Color('#203346');scene.fog=null;sun.intensity=.15;scene.environmentIntensity=.3;camera.position.copy(gymScene.cameraPosition);camera.lookAt(gymScene.cameraTarget);$('hint').style.display='none';$('chapter').textContent='HIT THE GYM';}
function showHighway(){home.group.visible=false;silver.group.visible=false;cinema.visible=false;highway.start();scene.background=highway.backgroundColor;scene.fog=null;sun.intensity=2.5;scene.environmentIntensity=.6;camera.position.copy(highway.cameraPosition);camera.lookAt(highway.cameraTarget);$('hint').style.display='none';$('chapter').textContent='TAKE A DRIVE';}
function playMusic(){return songWheel.play();}
function celebrate(){if(visited.size<3)return;reset();selected='celebrate';phase='party';phaseStart=globalTime;party.start(globalTime);setControls(false);$('destination').hidden=true;$('hint').style.display='none';$('unlock-toast').hidden=true;$('party-controls').hidden=false;$('chapter').textContent=`${songWheel.selectedTrack.title.toUpperCase()} · BIRTHDAY EDITION`;playMusic();}
$('party-home').addEventListener('click',reset);
$('party-songs').addEventListener('click',event=>songWheel.open(event.currentTarget));
$('party-mute').addEventListener('click',()=>{if(music.paused){music.muted=false;playMusic();}else songWheel.toggleMute();});
function showCinema(){home.group.visible=false;silver.group.visible=blue.group.visible=false;cinema.visible=true;scene.background=new THREE.Color('#263947');scene.fog=null;sun.intensity=.5;scene.environmentIntensity=.2;dad.group.visible=true;dad.group.position.copy(cinemaData.dadPosition);dad.group.rotation.y=Math.PI;cinemaData.start();movieVideo.pause();movieVideo.currentTime=0;movieStarted=false;camera.position.copy(cinemaData.cameraPosition);camera.lookAt(cinemaData.cameraTarget);camera.updateMatrixWorld();$('hint').style.display='none';$('chapter').textContent='MOVIE NIGHT';$('movie-mute').hidden=false;}
function finish(){phase='ending';endingAt=globalTime;$('ending').hidden=false;$('hint').style.display='none';$('end-kicker').textContent='HAPPY BIRTHDAY, DAD';$('end-title').textContent=selected==='movie'?'Movie night.':selected==='gym'?'Workout complete.':'Nice drive.';$('end-copy').textContent='What’s next?';$('home').focus({preventScroll:true});}
function walkingPath(t,car){const from=baseDad;const step=new THREE.Vector3(-1.05,.1,4.25),corner=new THREE.Vector3(car.group.position.x-1.25,.1,4.25),end=new THREE.Vector3(car.group.position.x-1.25,.1,5.8);const points=[from,step,corner,end];const lengths=[from.distanceTo(step),step.distanceTo(corner),corner.distanceTo(end)];let d=clamp(t,0,1)*lengths.reduce((a,b)=>a+b,0);for(let i=0;i<3;i++){if(d<=lengths[i]||i===2){dad.group.position.lerpVectors(points[i],points[i+1],clamp(d/lengths[i],0,1));const delta=points[i+1].clone().sub(points[i]);dad.group.rotation.y=Math.atan2(delta.x,delta.z);return;}d-=lengths[i];}}
function tick(){globalTime=(performance.now()-start)/1000;const frameDelta=Math.min(1,Math.max(0,globalTime-lastFrameTime));lastFrameTime=globalTime;let elapsed=globalTime-phaseStart,pose='idle',animationTime=globalTime;
 if(phase==='intro'){if(globalTime<1.5){home.doorPivot.rotation.y=-smooth(globalTime/.7)*1.5;dad.group.position.z=1.94+smooth(globalTime/1.5)*.96;pose='walk';}else if(globalTime<5){dad.group.position.copy(baseDad);pose='wave';home.doorPivot.rotation.y=-1.5*(1-smooth((globalTime-2)/1));}else{dad.group.position.copy(baseDad);phase='idle';phaseStart=globalTime;}}
 if(phase==='selected')pose='selected';
 if(phase==='enter'){pose='walk';home.doorPivot.rotation.y=-smooth(elapsed/.65)*1.5;dad.group.rotation.y=Math.PI;dad.group.position.z=2.9-smooth(elapsed/1.65)*1.1;if(elapsed>1.5)$('curtain').classList.add('closed');if(elapsed>2.15){showCinema();phase='cinema';phaseStart=globalTime;elapsed=0;$('curtain').classList.remove('closed');}}
 if(phase==='cinema'){pose='seated';cinemaData.update(elapsed,camera.aspect);camera.position.copy(cinemaData.cameraPosition);camera.lookAt(cinemaData.cameraTarget);if(elapsed>1.15&&!movieStarted)playMovie();}
 if(phase==='walk'){pose='walk';walkingPath(smooth(elapsed/3.4),activeCar);if(elapsed>3.45){const scale=.66,seat=activeCar.group.userData.driverPosition?.clone()||new THREE.Vector3(-.4,.75,-.28);activeCar.group.add(dad.group);dad.group.scale.setScalar(scale);dad.group.position.copy(seat).sub(new THREE.Vector3(...dad.group.userData.drivingHipOffset).multiplyScalar(scale));dad.group.rotation.set(0,0,0);dad.group.visible=true;phase='driving';phaseStart=globalTime;elapsed=0;}}
 if(phase==='driving'){pose='driving';const car=activeCar.group,park=selected==='gym'?parked.silver:parked.blue;const d=elapsed*elapsed*.6;if(d<5.7){car.position.z=park.z+d;car.position.x=park.x;}else{const turn=clamp((d-5.7)/3.2,0,1);car.rotation.y=-turn*Math.PI/2;car.position.z=park.z+5.7+Math.sin(turn*Math.PI/2)*2;car.position.x=park.x-(1-Math.cos(turn*Math.PI/2))*2-Math.max(0,d-8.9)*1.7;}activeCar.animate(elapsed*4,globalTime);if(elapsed>4.7)$('curtain').classList.add('closed');if(elapsed>5.35){if(selected==='drive'){showHighway();phase='highway';}else{showGym();phase='gym-scene';}phaseStart=globalTime;elapsed=0;$('curtain').classList.remove('closed');}}
 if(phase==='gym-scene'){gymScene.update(elapsed);pose=gymScene.pose;animationTime=gymScene.animationTime;const position=gymScene.cameraPosition.clone();if(camera.aspect<1.2)position.addScaledVector(position.clone().sub(gymScene.cameraTarget).normalize(),(1.2/camera.aspect-1)*4);camera.position.copy(position);camera.lookAt(gymScene.cameraTarget);if(elapsed>=gymScene.duration)finish();}
 if(phase==='highway'){highway.update(elapsed);pose=highway.pose;animationTime=highway.animationTime;const position=highway.cameraPosition.clone();if(camera.aspect<1.2)position.addScaledVector(position.clone().sub(highway.cameraTarget).normalize(),(1.2/camera.aspect-1)*5);camera.position.copy(position);camera.lookAt(highway.cameraTarget);if(elapsed>=highway.duration)finish();}
 if(phase==='party'){party.update(globalTime,frameDelta,camera.aspect);pose=party.pose;animationTime=party.animationTime;}
 if(phase==='ending'&&selected==='gym'){pose='workout';animationTime=gymScene.duration;}if(phase==='ending'&&selected==='drive')pose='driving';if(phase==='ending'&&selected==='movie')pose='seated';
 if(!reduced||pose==='workout'||pose==='seated'){dad.animate(animationTime,pose);if(phase==='idle'){dad.group.rotation.y=Math.sin(globalTime*.43)*.1;}home.clouds.forEach((c,i)=>{c.position.x+=Math.sin(globalTime*.05+i)*.0008;});}else{dad.animate(0,pose==='driving'?'driving':phase==='party'?'disco':phase==='selected'||phase==='cinema'||phase==='ending'?'selected':'idle');}
 if(selected==='movie'&&phase==='selected')home.doorwayGlow.intensity=4.5+(reduced?0:Math.sin(globalTime*3)*1.2);
 const sparkleAge=globalTime-outfitStart;sparkles.visible=!reduced&&sparkleAge<.8&&sparkleAge>=0;if(sparkles.visible){sparkles.children.forEach((s,i)=>{const a=i*2.4;s.position.set(baseDad.x+Math.cos(a)*(sparkleAge+.35),baseDad.y+.4+i/10+sparkleAge,baseDad.z+Math.sin(a)*.55);s.scale.setScalar(1-sparkleAge/.8);s.rotation.y=globalTime*2;});}
 if(!['cinema','highway','gym-scene','ending'].includes(phase)){const close=phase==='selected';const target=phase==='party'?party.cameraTarget:close?new THREE.Vector3(-.7,2.05,2.9):wideTarget;const pos=phase==='party'?party.cameraPosition:close?new THREE.Vector3(-.25,2.5,2.9+Math.max(6.2,4.6/camera.aspect)):widePosition;const blend=reduced?1:1-Math.exp(-frameDelta*5);camera.position.lerp(pos,blend);cameraTarget.lerp(target,blend);camera.lookAt(cameraTarget);}
 const binReady=phase==='party'&&party.binReady;$('bin-encore').hidden=!binReady;$('bin-encore').disabled=!binReady;
 $('scene-controls').hidden=!['cinema','gym-scene','highway'].includes(phase);
 $('app').classList.toggle('partying',phase==='party');$('party-controls').hidden=phase!=='party';$('unlock-toast').hidden=phase==='party'||globalTime-unlockedAt>6;
 camera.updateMatrixWorld();layout();pipeline.render();requestAnimationFrame(tick);
}
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();$('error').hidden=false;});
await party.warmup(renderer,camera,()=>pipeline.render());
home.group.visible=silver.group.visible=blue.group.visible=false;
for(const [vignette,outfit]of[[cinemaData,'movie'],[gymScene,'gym'],[highway,'drive']]){vignette.group.visible=true;dad.setOutfit(outfit);camera.position.copy(vignette.cameraPosition);camera.lookAt(vignette.cameraTarget);await renderer.compileAsync(scene,camera);pipeline.render();vignette.group.visible=false;}
home.group.visible=silver.group.visible=blue.group.visible=true;dad.setOutfit('default');resize();start=performance.now();tick();$('loading').style.opacity='0';setTimeout(()=>$('loading').remove(),600);
