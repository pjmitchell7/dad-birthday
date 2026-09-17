import * as THREE from 'three';
import { createCelebrationStage, createConfetti } from './celebration-stage.js';
import { createMoonwalkCameo } from './assets/v2/moonwalk-cameo.js';
import { createCameoSequence } from './cameo-sequence.js';

const clamp=THREE.MathUtils.clamp;
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};

export async function createParty({scene,home,dad,silver,blue,sun,portraitFill,reduced}) {
  const stage=createCelebrationStage(),confetti=createConfetti(),cameo=await createMoonwalkCameo();
  scene.add(stage.group,confetti.group,cameo.group);
  cameo.group.scale.setScalar(.78);
  stage.group.visible=confetti.group.visible=cameo.group.visible=false;
  const clubFill=new THREE.AmbientLight('#c768ff',0);scene.add(clubFill);
  const dadKey=new THREE.PointLight('#fff1e7',0,9,1.4);dadKey.position.set(1.2,3.7,7.3);scene.add(dadKey);
  const initial={background:scene.background,fog:scene.fog,environmentIntensity:scene.environmentIntensity,sunColor:sun.color.clone(),sunIntensity:sun.intensity,fillIntensity:portraitFill.intensity};
  const parking=[silver.group.position.clone(),blue.group.position.clone()];
  const startPoint=new THREE.Vector3(-1.05,.62,2.9),stepPoint=new THREE.Vector3(-1.05,.1,4.25),dancePoint=new THREE.Vector3(1.65,.1,4.3);
  const cameraTarget=new THREE.Vector3(3.5,1.65,2.5),cameraPosition=new THREE.Vector3(5.0,3.2,13.3);
  const cameoSequence=createCameoSequence(),binPosition=stage.trashCan.position.clone();
  let active=false,startTime=0,lastBurst=0,burstAt=Infinity;
  const api={cameraTarget,cameraPosition,pose:'walk',animationTime:0,binReady:false,trashCan:stage.trashCan,binPoint:new THREE.Vector3(6.45,.75,2.3),start,stop,update,warmup,shakeBin};
  function shakeBin(time){if(!active||!cameoSequence.shake(time-startTime))return false;api.binReady=false;return true;}
  async function warmup(renderer,camera,render){stage.group.visible=confetti.group.visible=cameo.group.visible=true;dad.setOutfit('party');try{await renderer.compileAsync(scene,camera);render();}finally{stage.group.visible=confetti.group.visible=cameo.group.visible=false;dad.setOutfit('default');}await renderer.compileAsync(scene,camera);render();}
  function start(time){active=true;startTime=time;lastBurst=0;burstAt=Infinity;cameoSequence.reset();api.binReady=false;stage.trashCan.rotation.z=0;stage.trashCan.position.copy(binPosition);stage.group.visible=confetti.group.visible=true;cameo.group.visible=false;confetti.reset();scene.add(dad.group);dad.group.visible=true;dad.group.scale.setScalar(1);dad.group.position.copy(startPoint);dad.group.rotation.set(0,0,0);dad.setOutfit('party');scene.background=new THREE.Color('#11162b');scene.fog=new THREE.Fog('#15182c',28,70);home.entranceFrame.material.emissiveIntensity=0;home.doorwayGlow.intensity=0;}
  function stop(){if(!active)return;active=false;cameoSequence.reset();api.binReady=false;stage.trashCan.rotation.z=0;stage.trashCan.position.copy(binPosition);stage.group.visible=confetti.group.visible=cameo.group.visible=false;confetti.reset();clubFill.intensity=0;dadKey.intensity=0;home.garageDoor.rotation.x=0;home.garageDoor.position.set(4.65,2.4,2.34);scene.background=initial.background;scene.fog=initial.fog;scene.environmentIntensity=initial.environmentIntensity;sun.color.copy(initial.sunColor);sun.intensity=initial.sunIntensity;portraitFill.intensity=initial.fillIntensity;[silver,blue].forEach((car,i)=>{car.group.visible=true;car.group.position.copy(parking[i]);car.group.rotation.y=0;});}
  function update(time,delta,aspect){
    if(!active)return;const elapsed=Math.max(0,time-startTime),danceTime=Math.max(0,elapsed-3.5);
    api.pose=elapsed<3.5?'walk':'disco';api.animationTime=elapsed<3.5?elapsed:danceTime;
    cameraPosition.set(5,3.2,2.5+Math.max(10.8,8.4/(2*Math.tan(THREE.MathUtils.degToRad(19))*aspect)));
    const garageOpen=ease(elapsed/2.8);home.garageDoor.rotation.x=garageOpen*Math.PI/2;home.garageDoor.position.y=2.4+garageOpen*.25;home.garageDoor.position.z=2.34-garageOpen*.6;
    const night=ease(elapsed/2.5);sun.intensity=THREE.MathUtils.lerp(initial.sunIntensity,.12,night);portraitFill.intensity=THREE.MathUtils.lerp(initial.fillIntensity,.2,night);scene.environmentIntensity=THREE.MathUtils.lerp(initial.environmentIntensity,.08,night);
    clubFill.intensity=1.4*night;clubFill.color.setHSL(reduced?.76:(elapsed*.055)%1,.7,.56);dadKey.intensity=13*night;
    stage.update(reduced?0:elapsed);
    if(elapsed<1.15){dad.group.position.lerpVectors(startPoint,stepPoint,ease(elapsed/1.15));dad.group.rotation.y=0;}
    else if(elapsed<3.5){dad.group.position.lerpVectors(stepPoint,dancePoint,ease((elapsed-1.15)/2.35));dad.group.rotation.y=Math.PI/2;}
    else {dad.group.position.copy(dancePoint);dad.group.rotation.y=.12;}
    [silver,blue].forEach((car,i)=>{const t=Math.max(0,elapsed-i*.4),d=t*t*.8,park=parking[i];car.group.visible=t<5.2;if(d<5.7){car.group.position.set(park.x,park.y,park.z+d);car.group.rotation.y=0;}else{const turn=clamp((d-5.7)/3.2,0,1);car.group.rotation.y=-turn*Math.PI/2;car.group.position.set(park.x-(1-Math.cos(turn*Math.PI/2))*2-Math.max(0,d-8.9)*1.7,park.y,park.z+5.7+Math.sin(turn*Math.PI/2)*2);}car.animate(t*4,elapsed);});
    const burstId=dad.group.userData.cannonBurstId||0;if(!reduced&&elapsed>3.5&&burstId>0&&lastBurst===0){confetti.burst(dad.getCannonWorldPosition(),dad.getCannonWorldDirection(),240);lastBurst=1;burstAt=elapsed;}
    confetti.setEnabled(lastBurst>0&&elapsed-burstAt>1.2);
    if(!reduced)confetti.update(Math.min(delta,.1),elapsed);
    // The character stays on the floor: the rig crouches behind the physical bin.
    const cue=cameoSequence.sample(elapsed);api.binReady=cue.ready;
    const rattlePhase=cue.readyAge%6.5,rattle=cue.ready&&rattlePhase<.65?Math.sin(rattlePhase*30)*.026*(1-rattlePhase/.65):0;
    const binMotion=reduced?0:cue.shakeAngle+rattle;stage.trashCan.rotation.z=binMotion;stage.trashCan.position.x=binPosition.x+binMotion*.25;
    cameo.group.visible=cue.visible;
    if(cameo.group.visible){
      cameo.group.position.set(cue.x,.16,cue.z);cameo.group.rotation.y=cue.angle;cameo.update(reduced?0:cue.animationTime,cue.crouch);
    }
  }
  return api;
}
