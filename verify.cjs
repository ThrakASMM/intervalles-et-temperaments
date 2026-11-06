const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=__dirname;
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const els=new Map();let frame;
function element(){
  return {value:'',textContent:'',hidden:false,attributes:{},dataset:{},children:[],listeners:{},parentElement:{hidden:false,addEventListener(){}},
    classList:{toggle(){}},style:{setProperty(k,v){this[k]=v}},clientWidth:600,clientHeight:160,
    setAttribute(k,v){this.attributes[k]=v},append(...nodes){this.children.push(...nodes)},replaceChildren(){this.children=[]},cloneNode(){return element()},
    addEventListener(k,fn){this.listeners[k]=fn},focus(){},blur(){},getContext(){return new Proxy({},{get:(o,k)=>o[k]||(()=>{})})},
    setPointerCapture(){},hasPointerCapture(){return true},
    async emit(k,value,details={}){if(value!==undefined)this.value=String(value);return this.listeners[k]?.({target:this,shiftKey:false,button:0,pointerId:1,detail:1,preventDefault(){},...details});}};
}
for(const match of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/id="([^"]+)"/g))els.set(match[1],element());
const audio=[];
const audioSessionMode=process.argv[2]||'supported';
assert(['supported','unsupported','rejected'].includes(audioSessionMode));
let sessionType='auto',sessionRequests=0;
const audioSession={get type(){return sessionType},set type(value){sessionRequests++;if(audioSessionMode==='rejected')throw new Error('Audio session unavailable');sessionType=value;}};
class Param{constructor(){this.value=0}cancelScheduledValues(){}setTargetAtTime(v){this.value=v}}
class Node{constructor(type){this.type=type;this.frequency=new Param();this.playbackRate=new Param();this.gain=new Param()}connect(){}start(){}stop(){this.stopped=true}disconnect(){}setPeriodicWave(w){this.wave=w}}
class Context{
  constructor(){if(audioSessionMode==='supported')assert.equal(sessionType,'playback','Choose music playback before creating the audio context');this.state='running';this.currentTime=0;this.sampleRate=48000;this.destination={};this.osc=[];this.gains=[];this.buffers=[];audio.push(this)}
  createOscillator(){const n=new Node('osc');this.osc.push(n);return n}
  createBufferSource(){const n=new Node('buffer');this.buffers.push(n);return n}
  async decodeAudioData(){return {duration:12}}
  createGain(){const n=new Node('gain');this.gains.push(n);return n}
  createAnalyser(){return {fftSize:2048,connect(){}}}
  createPeriodicWave(real,imag){return [...imag]}
  addEventListener(){}async resume(){this.state='running'}async suspend(){this.state='suspended'}
}
const documentEvents={},windowEvents={};
const midiA={id:'keyboard-a',name:'Clavier test A',state:'connected',async open(){},async close(){}};
const midiB={id:'keyboard-b',name:'Clavier test B',state:'connected',async open(){},async close(){}};
const midiAccess={inputs:new Map([['keyboard-a',midiA],['keyboard-b',midiB]])};
let midiRequests=0,fetches=0;
const box={async fetch(url){assert.match(url,/^piano-.*\.mp3$/);fetches++;return {ok:true,async arrayBuffer(){return new ArrayBuffer(16)}};},navigator:{async requestMIDIAccess(options){assert.equal(options.sysex,false);midiRequests++;return midiAccess;}},location:{hash:''},console,Float32Array,AudioContext:Context,devicePixelRatio:1,
  document:{getElementById:id=>{assert(els.has(id),'Missing DOM id: '+id);return els.get(id)},createElement:element,createElementNS:element,body:element(),activeElement:null,addEventListener(type,fn){documentEvents[type]=fn}},
  localStorage:{getItem:()=>JSON.stringify({thirdAdded:true,pianoSound:'sampled'}),setItem(){}},
  ResizeObserver:class{observe(){}},matchMedia:()=>({matches:false}),requestAnimationFrame(fn){frame=fn},setInterval:()=>1,clearInterval(){},setTimeout,addEventListener(type,fn){windowEvents[type]=fn}};
if(audioSessionMode!=='unsupported')box.navigator.audioSession=audioSession;
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
assert.equal(sessionRequests,0,'Opening the page does not take over the device audio session');
const el=id=>els.get(id);
(async()=>{
  await el('freeMode').emit('click');
  assert.equal(el('pianoTimbre').value,'organ','The piano always opens with a sustained tone, even after recorded piano was saved');
  await el('intervalMode').emit('click');
  assert(el('thirdPanel').hidden,'Always starts with two notes, even after a saved chord');
  await el('play').emit('click');
  assert.equal(el('playLabel').textContent,'Pause','Playback works with a supported, absent or rejected Audio Session API');
  assert.equal(sessionRequests,audioSessionMode==='unsupported'?0:1);
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
  await el('freeOctaves').emit('change','3');await el('pianoOctave').emit('change','5');
  keyEvent('keydown','k','KeyK');near(ctx.osc.at(-1).frequency.value/ctx.osc[0].frequency.value,8);
  windowEvents.blur();assert(ctx.osc.at(-1).stopped,'Losing focus cannot leave a held key sounding');
  await el('freeOctaves').emit('change','1');assert.equal(Number(el('pianoOctave').value),5);await el('pianoOctave').emit('change','3');
  const touchKey=el('pianoKeys').children.find(b=>Number(b.dataset.semitone)===4);
  await touchKey.emit('pointerdown',undefined,{pointerId:7});assert(ctx.gains.at(-1).gain.value>0);
  await touchKey.emit('pointercancel',undefined,{pointerId:7});assert(ctx.osc.at(-1).stopped);
  await touchKey.emit('pointerdown',undefined,{pointerId:8});await el('pianoRelease').emit('click');assert(ctx.osc.at(-1).stopped);
  await el('play').emit('click');
  keyEvent('keydown','q','KeyQ');keyEvent('keydown','Escape','Escape');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(el('playLabel').textContent,'Écouter','Escape cancels an audio start still awaiting resume');
  for(const system of ['just',...Object.keys(M.systems)])for(let semi=-60;semi<=79;semi++){
    const p=M.keyboardPitch(semi,system);assert(Number.isFinite(p.cents));assert(!M.intervalNoteName(48,p.base,p.octaves).includes('undefined'));near(p.base.semitones+12*p.octaves,semi);
  }

  // Harmonic series: exact integer multiples and independent, click-free gains.
  near(M.harmonic(69,7).frequency,3080);near(M.harmonic(69,7).offset,-31.17409353087553);
  near(M.harmonic(48,11).offset,-48.68205763524301);
  await el('harmonicsPlay').emit('click');await new Promise(resolve=>setImmediate(resolve));
  const seriesOsc=ctx.osc.slice(-16),seriesGains=ctx.gains.slice(-16);
  near(seriesGains[0].gain.value,.35);
  for(const gain of seriesGains.slice(1))near(gain.gain.value,0);
  for(const gain of ctx.gains.slice(1,4))near(gain.gain.value,0);
  await el('harmonicsGrid').children[6].emit('click');
  near(seriesOsc[6].frequency.value,7*ctx.osc[0].frequency.value);
  near(seriesGains[6].gain.value,.35);near(seriesGains[0].gain.value,0);
  await el('harmonicsTempered').emit('click');
  near(seriesOsc[6].frequency.value,ctx.osc[0].frequency.value*2**(34/12));
  near(seriesGains[6].gain.value,.35);
  assert.equal(el('harmonicsGrid').children[6].attributes['aria-pressed'],'true');
  await el('harmonicsNatural').emit('click');near(seriesOsc[6].frequency.value,7*ctx.osc[0].frequency.value);
  await el('harmonicsSum').emit('click');await el('harmonicsGrid').children[2].emit('click');
  near(seriesGains[2].gain.value/seriesGains[6].gain.value,7/3);
  near(seriesGains.reduce((sum,g)=>sum+g.gain.value,0),.35);
  await el('harmonicsProfile').emit('change','equal');near(seriesGains[2].gain.value,seriesGains[6].gain.value);
  await el('harmonicsOdd').emit('click');
  seriesGains.forEach((g,index)=>assert.equal(g.gain.value>0,index%2===0));
  await el('harmonicsRoot').emit('change','9');near(seriesOsc[0].frequency.value,220);near(seriesOsc[15].frequency.value,3520);
  await el('harmonicsPlay').emit('click');seriesGains.forEach(g=>near(g.gain.value,0));
  await el('intervalMode').emit('click');await el('play').emit('click');
  assert(ctx.gains[1].gain.value>0);seriesGains.forEach(g=>near(g.gain.value,0));
  await el('play').emit('click');
  // Independent octave and sustain: build a chord across registers without moving the drone.
  await el('rootNote').emit('change','0');await el('freeMode').emit('click');await el('pianoOctave').emit('change','3');
  await el('pianoSystem').emit('change','equal');
  el('pianoHold').checked=true;await el('pianoHold').emit('change');
  keyEvent('keydown','q','KeyQ');await new Promise(resolve=>setImmediate(resolve));keyEvent('keyup','q','KeyQ');
  const heldLow=ctx.osc.at(-1),droneHz=ctx.osc[0].frequency.value;
  await el('pianoOctaveUp').emit('click');assert.equal(Number(el('pianoOctave').value),4);assert(!heldLow.stopped);
  keyEvent('keydown','q','KeyQ');keyEvent('keyup','q','KeyQ');const heldHigh=ctx.osc.at(-1);
  near(heldHigh.frequency.value/heldLow.frequency.value,2);near(ctx.osc[0].frequency.value,droneHz);
  windowEvents.blur();assert(!heldHigh.stopped&&!heldLow.stopped,'Changing focus preserves the sustain pedal');
  el('pianoHold').checked=false;await el('pianoHold').emit('change');assert(heldHigh.stopped&&heldLow.stopped);
  await el('pianoOctave').emit('change','1');keyEvent('keydown','d','KeyD');
  near(ctx.osc.at(-1).frequency.value,M.frequency(28));assert.match(el('pianoStatus').textContent,/Mi₁/);
  assert.match(el('pianoGraphHint').textContent,/hors de la frise/);keyEvent('keyup','d','KeyD');
  await el('pianoOctave').emit('change','6');assert(el('pianoOctaveUp').disabled);await el('pianoOctave').emit('change','3');

  // MIDI permission is opt-in; physical notes, velocities, independent channels and pedals.
  assert.equal(midiRequests,0);await el('midiConnect').emit('click');assert.equal(midiRequests,1);
  assert.match(el('midiStatus').textContent,/Clavier test A/);
  const midi=(status,note,value)=>midiA.onmidimessage({data:[status,note,value]});
  midi(0x90,60,64);midi(0x90,64,127);await new Promise(resolve=>setImmediate(resolve));
  const midiC=ctx.osc.at(-2),midiE=ctx.osc.at(-1),midiCGain=ctx.gains.at(-2),midiEGain=ctx.gains.at(-1);
  near(midiC.frequency.value,M.frequency(60));near(midiE.frequency.value,M.frequency(64));near(midiCGain.gain.value/midiEGain.gain.value,64/127);
  midi(0x90,64,0);assert(midiE.stopped);assert(!midiC.stopped);
  midi(0xb0,64,127);midi(0x80,60,0);assert(!midiC.stopped);
  midi(0xb1,64,0);assert(!midiC.stopped,'Pedal release on another channel cannot cut the note');
  el('pianoHold').checked=true;await el('pianoHold').emit('change');midi(0xb0,64,0);assert(!midiC.stopped);
  el('pianoHold').checked=false;await el('pianoHold').emit('change');assert(midiC.stopped);
  midi(0x90,60,100);midi(0x91,60,100);const shared=ctx.osc.at(-1);midi(0x80,60,0);assert(!shared.stopped);midi(0x81,60,0);assert(shared.stopped);
  midi(0x90,36,127);near(ctx.osc.at(-1).frequency.value,M.frequency(36));
  midi(0xb0,120,0);assert(ctx.osc.at(-1).stopped,'All Sound Off clears a channel');
  midi(0x90,60,100);const disconnected=ctx.osc.at(-1);midiA.state='disconnected';midiAccess.onstatechange();assert(disconnected.stopped);assert.equal(midiA.onmidimessage,null);
  midiA.state='connected';midiAccess.onstatechange();assert.equal(typeof midiA.onmidimessage,'function');
  midi(0x90,60,100);const switched=ctx.osc.at(-1);await el('midiInput').emit('change','keyboard-b');assert(switched.stopped);assert.equal(midiA.onmidimessage,null);assert.equal(typeof midiB.onmidimessage,'function');
  await el('midiConnect').emit('click');assert.equal(midiB.onmidimessage,null);
  box.navigator.requestMIDIAccess=async()=>{throw Object.assign(new Error('blocked'),{name:'NotAllowedError'});};
  await el('midiConnect').emit('click');assert.match(el('midiStatus').textContent,/refusé/);assert(!el('midiConnect').disabled);

  // Independent fingers, glissando and cancellation on a touch keyboard.
  await el('pianoOctave').emit('change','3');
  const touchC=el('pianoKeys').children.find(b=>Number(b.dataset.semitone)===0),touchE=el('pianoKeys').children.find(b=>Number(b.dataset.semitone)===4),touchG=el('pianoKeys').children.find(b=>Number(b.dataset.semitone)===7);
  await touchC.emit('pointerdown',undefined,{pointerId:101});await touchE.emit('pointerdown',undefined,{pointerId:102});
  const fingerC=ctx.osc.at(-2),fingerE=ctx.osc.at(-1);assert(!fingerC.stopped&&!fingerE.stopped);
  touchG.parentElement=el('pianoKeys');box.document.elementFromPoint=()=>({closest:()=>touchG});
  await touchC.emit('pointermove',undefined,{pointerId:101,clientX:100,clientY:100});
  const fingerG=ctx.osc.at(-1);assert(fingerC.stopped&&!fingerE.stopped&&!fingerG.stopped);
  await touchC.emit('pointerup',undefined,{pointerId:101});assert(fingerG.stopped&&!fingerE.stopped);
  await touchE.emit('pointercancel',undefined,{pointerId:102});assert(fingerE.stopped);
  el('pianoHold').checked=true;await el('pianoHold').emit('change');
  await touchC.emit('pointerdown',undefined,{pointerId:201});await touchC.emit('pointerup',undefined,{pointerId:201});const latchedC=ctx.osc.at(-1);
  await touchE.emit('pointerdown',undefined,{pointerId:202});await touchE.emit('pointerup',undefined,{pointerId:202});const latchedE=ctx.osc.at(-1);
  await touchC.emit('pointerdown',undefined,{pointerId:203});await touchC.emit('pointerup',undefined,{pointerId:203});assert(latchedC.stopped&&!latchedE.stopped,'A new finger ID toggles only the chosen latched pitch');
  el('pianoHold').checked=false;await el('pianoHold').emit('change');
  await el('pianoExpand').emit('click');assert.equal(el('pianoExpand').attributes['aria-pressed'],'true');keyEvent('keydown','Escape','Escape');assert.equal(el('pianoExpand').attributes['aria-pressed'],'false');

  // Sample playback: real buffer sources, pitch mapping, held release and retrigger.
  await el('pianoTimbre').emit('change','sampled');assert.equal(fetches,30);
  el('pianoHold').checked=true;await el('pianoHold').emit('change');
  keyEvent('keydown','q','KeyQ');await new Promise(resolve=>setImmediate(resolve));keyEvent('keyup','q','KeyQ');const sample1=ctx.buffers.at(-1);
  assert(sample1.buffer);near(sample1.playbackRate.value,1);assert(!sample1.stopped);
  await el('pianoOctaveUp').emit('click');assert(!sample1.stopped);
  keyEvent('keydown','q','KeyQ');keyEvent('keyup','q','KeyQ');const sample2=ctx.buffers.at(-1);assert(sample2!==sample1);
  keyEvent('keydown','q','KeyQ');assert(sample2.stopped,'A repeated latched key toggles off');assert(!sample1.stopped,'Other octaves continue');keyEvent('keyup','q','KeyQ');keyEvent('keydown','q','KeyQ');keyEvent('keyup','q','KeyQ');assert(ctx.buffers.at(-1)!==sample2&&!ctx.buffers.at(-1).stopped,'A third press starts the note again');
  el('pianoHold').checked=false;await el('pianoHold').emit('change');assert(sample1.stopped&&ctx.buffers.at(-1).stopped);
  await el('pianoTimbre').emit('change','sine');

  // Clickable score, natural fractions and cents recalculated for each tuning.
  const scoreNote=n=>el('harmonicsScore').children.find(g=>g.attributes['data-harmonic']===n);
  await el('harmonicsSolo').emit('click');await scoreNote(7).emit('click');assert.match(el('harmonicsStatus').textContent,/H7/);
  for(const [tuning,expected] of [['natural',-31.17409353087553],['equal',0],['just',17.59628786593987],['pythagorean',-3.910001730774837],['meantone',6.843143067582787]]){
    await el('harmonicsTuning').emit('change',tuning);
    const ratio=seriesOsc[6].frequency.value/M.frequency(48);
    near(1200*Math.log2(ratio)-3400,expected);
    const text=scoreNote(7).children.find(c=>c.attributes.class==='score-cents').textContent;
    assert(tuning==='equal'?text==='0 ct':text.includes(expected>0?'↑':'↓'));
  }
  assert.equal(scoreNote(5).children.find(c=>c.attributes.class==='score-fraction').textContent,'5/1');
  assert.equal(scoreNote(5).children.find(c=>c.attributes.class==='score-reduced').textContent,'5/4');
  await el('harmonicsPlay').emit('click');
  console.log('PASS — audio session '+audioSessionMode+' ; octave indépendante, sustain entre octaves/focus, MIDI (notes, vélocité, pédales, canaux, connexion/refus), piano enregistré et portée interactive.');

  console.log('PASS — série H1 à H16 : fréquences, cents, solo, addition, amplitudes, impaires, fondamentale, arrêt et retour aux intervalles.');
  console.log('PASS — piano polyphonique, sans/avec bourdon, sustain, accordages, relâchement, clavier et touch.');
  console.log('PASS — accordages, audio/mute, frise, zoom, phase/enveloppe : maxima, opposition, animation, pause et fréquence commune.');
})().catch(error=>{console.error(error);process.exitCode=1});
