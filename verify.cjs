const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=__dirname;
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const els=new Map();let frame;
function element(){
  return {value:'',textContent:'',hidden:false,attributes:{},dataset:{},children:[],listeners:{},parentElement:{hidden:false},
    classList:{toggle(){}},style:{setProperty(k,v){this[k]=v}},clientWidth:600,clientHeight:160,
    setAttribute(k,v){this.attributes[k]=v},append(...nodes){this.children.push(...nodes)},replaceChildren(){this.children=[]},cloneNode(){return element()},
    addEventListener(k,fn){this.listeners[k]=fn},focus(){},blur(){},getContext(){return new Proxy({},{get:(o,k)=>o[k]||(()=>{})})},
    setPointerCapture(){},
    async emit(k,value,details={}){if(value!==undefined)this.value=String(value);return this.listeners[k]?.({target:this,shiftKey:false,button:0,pointerId:1,detail:1,preventDefault(){},...details});}};
}
for(const match of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/id="([^"]+)"/g))els.set(match[1],element());
const audio=[];
class Param{constructor(){this.value=0}cancelScheduledValues(){}setTargetAtTime(v){this.value=v}}
class Node{constructor(type){this.type=type;this.frequency=new Param();this.gain=new Param()}connect(){}start(){}stop(){this.stopped=true}disconnect(){}setPeriodicWave(w){this.wave=w}}
class Context{
  constructor(){this.state='running';this.currentTime=0;this.sampleRate=48000;this.destination={};this.osc=[];this.gains=[];audio.push(this)}
  createOscillator(){const n=new Node('osc');this.osc.push(n);return n}
  createGain(){const n=new Node('gain');this.gains.push(n);return n}
  createAnalyser(){return {fftSize:2048,connect(){}}}
  createPeriodicWave(real,imag){return [...imag]}
  addEventListener(){}async resume(){this.state='running'}async suspend(){this.state='suspended'}
}
const documentEvents={},windowEvents={};
const box={console,Float32Array,AudioContext:Context,devicePixelRatio:1,
  document:{getElementById:id=>{assert(els.has(id),'Missing DOM id: '+id);return els.get(id)},createElement:element,body:element(),activeElement:null,addEventListener(type,fn){documentEvents[type]=fn}},
  localStorage:{getItem:()=>JSON.stringify({thirdAdded:true}),setItem(){}},
  ResizeObserver:class{observe(){}},matchMedia:()=>({matches:false}),requestAnimationFrame(fn){frame=fn},setInterval:()=>1,clearInterval(){},setTimeout,addEventListener(type,fn){windowEvents[type]=fn}};
box.window=box;vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(root,'music.js'),'utf8'),box);
const M=box.IntervalleMusic,third=M.intervals.find(i=>i.id==='M3'),fifth=M.intervals.find(i=>i.id==='P5');
near(M.frequency(69),440);near(M.frequency(60),261.6255653005986);
assert.equal(M.intervalNoteName(60,M.intervals.find(i=>i.id==='m2')),'Ré♭₄');
assert.equal(M.intervalNoteName(61,third),'Mi♯₄');
assert.equal(M.intervalNoteName(59,M.intervals.find(i=>i.id==='P8')),'Si₄');
near(third.pure,386.3137138648348);near(M.transpose(200,third.pure),250);
near(M.relationship(200,third.pure,third).gap,0);
near(M.relationship(200,400,third).gap,7.936839915898527);
near(M.relationship(200,third.pure,third).upperCycles,5);
near(M.tunedInterval(third,'pythagorean').equal,407.8200034615497);
near(M.tunedInterval(fifth,'meantone').equal,696.5784284662087);
near(M.tunedInterval(third,'meantone').equal,third.pure);
near(M.beatDisplay(5,'auto').hz,5);near(M.beatDisplay(10,'auto').hz,2);
near(M.beatDisplay(10,'auto').scale,.2);near(M.beatDisplay(5,'slow').hz,.75);
assert(M.beatDisplay(10,'real').tooFast);near(M.beatDisplay(0,'auto').hz,0);
near(M.beatPhaseModel(0).envelope,1);assert(M.beatPhaseModel(0).aligned);
near(M.beatPhaseModel(.5).envelope,0);assert(M.beatPhaseModel(.5).opposed);
near(M.beatPhaseModel(.25).envelope,Math.SQRT1_2);
near(M.beatPhaseModel(-.25).power,M.beatPhaseModel(.25).power);
near(M.beatPhaseModel(1).envelope,1);
const closedStart=M.lissajousPoint(4,5,0,.1),closedEnd=M.lissajousPoint(4,5,1,.1);
near(closedStart.x,closedEnd.x);near(closedStart.y,closedEnd.y);
assert(Math.abs(M.lissajousPoint(4,5.04,1).y)>.1,'A detuned trace does not close in the pure reference window');
const extended=M.extendInterval(M.tunedInterval(third,'equal'),2,'equal');
near(extended.pure,2786.313713864835);near(extended.n/extended.d,5);
for(const mode of Object.keys(M.systems))for(const i of M.intervals){const t=M.tunedInterval(i,mode);assert(t.equal>=-1e-10&&t.equal<=1200);near(M.transpose(200,i.pure),200*i.n/i.d)}
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),box);
const el=id=>els.get(id);
(async()=>{
  assert(el('thirdPanel').hidden,'Always starts with two notes, even after a saved chord');
  await el('play').emit('click');
  const ctx=audio[0];assert.equal(ctx.osc.length,3);assert.equal(ctx.gains[3].gain.value,0);
  await el('addThird').emit('click');assert(!el('thirdPanel').hidden);assert(ctx.gains[3].gain.value>0);
  await el('thirdPure').emit('click');near(ctx.osc[2].frequency.value,ctx.osc[0].frequency.value*1.5);
  await el('purePreset').emit('click');near(ctx.osc[1].frequency.value,ctx.osc[0].frequency.value*1.25);
  const secondFrequency=ctx.osc[1].frequency.value,thirdFrequency=ctx.osc[2].frequency.value;
  await el('upperToggle').emit('click');assert.equal(ctx.gains[2].gain.value,0);assert(ctx.gains[1].gain.value>0);assert(ctx.gains[3].gain.value>0);
  assert.equal(el('upperToggle').attributes['aria-pressed'],'true');near(ctx.osc[1].frequency.value,secondFrequency);
  await el('thirdToggle').emit('click');assert.equal(ctx.gains[3].gain.value,0);near(ctx.osc[2].frequency.value,thirdFrequency);
  await el('droneToggle').emit('click');assert.equal(ctx.gains[1].gain.value,0);assert.equal(el('statusText').textContent,'Voix en sourdine');
  await el('upperToggle').emit('click');assert(ctx.gains[2].gain.value>0);
  await el('tuningSystem').emit('change','pythagorean');near(ctx.osc[1].frequency.value/ctx.osc[0].frequency.value,81/64);
  assert.equal(el('resultFormula').textContent,'1 200 × log₂(81/64) ≈');
  await el('tuningSystem').emit('change','meantone');near(ctx.osc[1].frequency.value/ctx.osc[0].frequency.value,5/4);
  await el('thirdToggle').emit('click');near(ctx.osc[2].frequency.value/ctx.osc[0].frequency.value,5**.25);
  await el('removeThird').emit('click');assert(el('thirdPanel').hidden);assert.equal(ctx.gains[3].gain.value,0);
  await el('upperTimbre').emit('change','sine');assert.match(el('harmonicNote').textContent,/pas présente/);
  await el('play').emit('click');for(const gain of ctx.gains.slice(1))assert.equal(gain.gain.value,0);
  await el('freeMode').emit('click');assert(!el('freePanel').hidden);assert(el('intervalSliderArea').hidden);
  await el('freeOctaves').emit('change','3');assert.equal(el('freeSlider').max,3600);
  const marker=el('freeRows').children[0].children[1].children.find(b=>b.attributes['aria-label'].startsWith('Mi₅, Juste'));
  assert(marker);await marker.emit('click');near(ctx.osc[1].frequency.value/ctx.osc[0].frequency.value,5);
  assert.match(el('resultFormula').textContent,/log₂\(5\/1\)/);
  await el('freeSlider').emit('input','3600');near(ctx.osc[1].frequency.value/ctx.osc[0].frequency.value,8);
  await el('freeOctaves').emit('change','1');near(ctx.osc[1].frequency.value/ctx.osc[0].frequency.value,2);
  el('showPyth').checked=true;await el('showPyth').emit('change');assert.equal(el('freeRows').children.length,3);
  await el('waveTighten').emit('click');assert.equal(Number(el('waveCycles').value),16);
  await el('waveWiden').emit('click');assert.equal(Number(el('waveCycles').value),8);
  await el('beatSpeed').emit('change','slow');await el('play').emit('click');frame(1000);frame(1100);
  assert(Number.isFinite(Number(el('beatLamp').style['--glow'])));
  await el('intervalMode').emit('click');assert(el('freePanel').hidden);assert(!el('intervalSliderArea').hidden);
  await el('droneToggle').emit('click');await el('upperTimbre').emit('change','organ');
  await el('interval').emit('change','M3');await el('tuningSystem').emit('change','equal');
  const fBeforeViewChange=ctx.osc[1].frequency.value;
  await el('viewLissajous').emit('click');assert(!el('lissajousView').hidden);assert(el('envelopeView').hidden);frame(1900);
  assert(el('lissajousPath').attributes.d.startsWith('M'));
  await el('viewPhase').emit('click');assert(!el('phaseView').hidden);assert(el('lissajousView').hidden);
  await el('viewEnvelope').emit('click');assert(!el('envelopeView').hidden);near(ctx.osc[1].frequency.value,fBeforeViewChange);
  frame(2000);const phaseBefore=el('phaseDot').attributes.cx;frame(2100);
  assert.notEqual(el('phaseDot').attributes.cx,phaseBefore,'Harmonic phase advances while the pair sounds');
  const pausedPhase=el('phaseDot').attributes.cx;
  await el('play').emit('click');
  frame(2200);near(el('phaseDot').attributes.cx,pausedPhase);near(Number(el('beatLamp').style['--glow']),.08);
  await el('purePreset').emit('click');frame(2300);
  near(el('phaseDot').attributes.cx,102);near(el('envelopeDot').attributes.cy,22);
  assert.equal(el('envelopeMiddleLabel').textContent,'Stable');

  // Polyphonic piano: real audio routing, independent releases and temperament changes.
  await el('freeMode').emit('click');
  await el('pianoSystem').emit('change','just');
  const keyEvent=(type,key,code,extra={})=>documentEvents[type]({key,code,target:{tagName:'BODY'},preventDefault(){},...extra});
  keyEvent('keydown','q','KeyQ');keyEvent('keydown','d','KeyD');keyEvent('keydown','g','KeyG');
  await new Promise(resolve=>setImmediate(resolve));
  const pianoChord=ctx.osc.slice(-3),chordGains=ctx.gains.slice(-3);
  near(pianoChord[0].frequency.value/ctx.osc[0].frequency.value,1);
  near(pianoChord[1].frequency.value/ctx.osc[0].frequency.value,5/4);
  near(pianoChord[2].frequency.value/ctx.osc[0].frequency.value,3/2);
  for(const gain of chordGains)assert(gain.gain.value>0,'Three simultaneous notes are audible');
  for(const gain of ctx.gains.slice(1,4))assert.equal(gain.gain.value,0,'Piano without drone silences the continuous voices');
  assert.match(el('pianoStatus').textContent,/Do₃.*Mi₃.*Sol₃.*sans bourdon/);
  await el('pianoSystem').emit('change','equal');
  near(pianoChord[1].frequency.value/ctx.osc[0].frequency.value,2**(4/12));
  keyEvent('keyup','d','KeyD');assert(pianoChord[1].stopped);assert.equal(chordGains[1].gain.value,0);
  assert(!pianoChord[0].stopped&&!pianoChord[2].stopped,'Releasing one note preserves the others');
  el('pianoDrone').checked=true;await el('pianoDrone').emit('change');assert(ctx.gains[1].gain.value>0);
  el('pianoDrone').checked=false;await el('pianoDrone').emit('change');assert.equal(ctx.gains[1].gain.value,0);
  el('pianoHold').checked=true;await el('pianoHold').emit('change');
  keyEvent('keyup','q','KeyQ');keyEvent('keyup','g','KeyG');
  assert(chordGains[0].gain.value>0&&chordGains[2].gain.value>0,'Sustain preserves released notes');
  el('pianoHold').checked=false;await el('pianoHold').emit('change');
  assert(pianoChord[0].stopped&&pianoChord[2].stopped,'Disabling sustain releases latched notes');
  const countBefore=ctx.osc.length;
  keyEvent('keydown','q','KeyQ',{target:{tagName:'INPUT'}});assert.equal(ctx.osc.length,countBefore,'Typing in fields never plays notes');
  await el('freeOctaves').emit('change','3');await el('pianoOctave').emit('change','2');
  keyEvent('keydown','k','KeyK');near(ctx.osc.at(-1).frequency.value/ctx.osc[0].frequency.value,8);
  windowEvents.blur();assert(ctx.osc.at(-1).stopped,'Losing focus cannot leave a held key sounding');
  await el('freeOctaves').emit('change','1');assert.equal(Number(el('pianoOctave').value),0);
  const touchKey=el('pianoKeys').children.find(b=>Number(b.dataset.semitone)===4);
  await touchKey.emit('pointerdown',undefined,{pointerId:7});assert(ctx.gains.at(-1).gain.value>0);
  await touchKey.emit('pointercancel',undefined,{pointerId:7});assert(ctx.osc.at(-1).stopped);
  await touchKey.emit('pointerdown',undefined,{pointerId:8});await el('pianoRelease').emit('click');assert(ctx.osc.at(-1).stopped);
  await el('play').emit('click');
  keyEvent('keydown','q','KeyQ');keyEvent('keydown','Escape','Escape');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(el('playLabel').textContent,'Écouter','Escape cancels an audio start still awaiting resume');
  for(const system of ['just',...Object.keys(M.systems)])for(let semi=0;semi<=36;semi++){
    const p=M.keyboardPitch(semi,system);assert(p.cents>=0&&p.cents<=3600);near(p.base.semitones+12*p.octaves,semi);
  }
  console.log('PASS — piano polyphonique, sans/avec bourdon, sustain, accordages, relâchement, clavier et touch.');
  console.log('PASS — accordages, audio/mute, frise, zoom, phase/enveloppe : maxima, opposition, animation, pause et fréquence commune.');
})().catch(error=>{console.error(error);process.exitCode=1});
