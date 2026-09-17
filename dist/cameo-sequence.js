const clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;

// Times are relative to the party. An encore owns only the cameo clock.
export function createCameoSequence(){
  let cycleStart=7,readyAt=27.2,shakeAt=-Infinity;
  function reset(){cycleStart=7;readyAt=27.2;shakeAt=-Infinity;}
  function shake(time){
    if(time<readyAt)return false;
    shakeAt=time;cycleStart=time+.85;readyAt=cycleStart+13.2+7;
    return true;
  }
  function sample(time){
    const t=time-cycleStart+7;
    let x=6.45,z=1.12,angle=0,crouch=1,phase='hidden';
    if(t>=7&&t<8.6){phase='standing';crouch=1-ease((t-7)/1.6);}
    else if(t>=8.6&&t<9.3){phase='emerging';crouch=0;const p=ease((t-8.6)/.7);x=lerp(6.45,5.95,p);angle=Math.PI*.4*p;}
    else if(t>=9.3&&t<9.6){phase='emerging';crouch=0;x=5.95;z=lerp(1.12,1.55,ease((t-9.3)/.3));angle=Math.PI*.4;}
    else if(t>=9.6&&t<13.4){phase='moonwalk-left';crouch=0;z=1.55;x=lerp(5.95,3.05,(t-9.6)/3.8);angle=Math.PI*.4;}
    else if(t>=13.4&&t<13.8){phase='turning';crouch=0;x=3.05;z=1.55;angle=lerp(Math.PI*.4,-Math.PI*.4,ease((t-13.4)/.4));}
    else if(t>=13.8&&t<17.6){phase='moonwalk-right';crouch=0;z=1.55;x=lerp(3.05,5.95,(t-13.8)/3.8);angle=-Math.PI*.4;}
    else if(t>=17.6&&t<17.9){phase='returning';crouch=0;x=5.95;z=lerp(1.55,1.12,ease((t-17.6)/.3));angle=-Math.PI*.4;}
    else if(t>=17.9&&t<18.6){phase='returning';crouch=0;const p=ease((t-17.9)/.7);x=lerp(5.95,6.45,p);angle=-Math.PI*.4*(1-p);}
    else if(t>=18.6&&t<20.2){phase='crouching';crouch=ease((t-18.6)/1.6);}
    const shakeAge=time-shakeAt;
    const shakeAngle=shakeAge>=0&&shakeAge<.85?Math.sin(shakeAge*45)*.075*Math.pow(1-shakeAge/.85,1.2):0;
    return {x,z,angle,crouch,phase,visible:time>=2.8,ready:time>=readyAt,readyAge:Math.max(0,time-readyAt),shakeAngle,animationTime:Math.max(0,t)};
  }
  return {reset,shake,sample};
}
