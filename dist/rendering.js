import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

export async function setSky(scene,renderer){const sky=await new RGBELoader().loadAsync('./assets/afternoon-sky.hdr');sky.mapping=THREE.EquirectangularReflectionMapping;const pmrem=new THREE.PMREMGenerator(renderer);const lighting=pmrem.fromEquirectangular(sky).texture;scene.environment=lighting;scene.environmentIntensity=.6;scene.environmentRotation.y=1.85;pmrem.dispose();const canvas=document.createElement('canvas');canvas.width=16;canvas.height=512;const ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,512);gradient.addColorStop(0,'#7bbad6');gradient.addColorStop(.7,'#c6e3e9');gradient.addColorStop(1,'#e7e9cd');ctx.fillStyle=gradient;ctx.fillRect(0,0,16,512);const background=new THREE.CanvasTexture(canvas);background.colorSpace=THREE.SRGBColorSpace;scene.background=background;return background;}
export function createPipeline(scene,camera,renderer){const composer=new EffectComposer(renderer);composer.renderTarget1.samples=2;composer.renderTarget2.samples=2;composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,innerWidth,innerHeight,16);ao.kernelRadius=5;ao.minDistance=.001;ao.maxDistance=.08;composer.addPass(ao);composer.addPass(new OutputPass());return{render:()=>composer.render(),resize:(w,h)=>composer.setSize(w,h)};}
