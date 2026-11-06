(() => {
  'use strict';
  const M=globalThis.IntervalleMusic, $=id=>document.getElementById(id);
  const format=(n,d=2)=>n.toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});
  const defaults={mode:'interval',octaveSpan:1,refOctave:0,showJust:true,showEqual:true,showPyth:false,showMeantone:false,scienceView:'envelope',visualVersion:2,waveMode:'cycles',waveCycles:8,beatSpeed:'auto',system:'equal',root:0,octave:3,interval:'M3',cents:400,reference:440,droneTimbre:'organ',upperTimbre:'organ',droneVolume:65,upperVolume:65,masterVolume:55,droneEnabled:true,upperEnabled:true,zoom:'fine',thirdAdded:false,thirdEnabled:true,thirdInterval:'P5',thirdCents:700,thirdTimbre:'organ',thirdVolume:55};
  Object.assign(defaults,{pianoSound:'synth',pianoSystem:'just',pianoLayout:'azerty',pianoOctave:3,pianoVersion:2,pianoDrone:false,pianoHold:false});
  let state={...defaults};
  try {
    const saved=JSON.parse(localStorage.getItem('intervalle.v1')||'null');
    if(saved && typeof saved==='object'){
      for(const key of Object.keys(defaults)){
        const value=saved[key];
        if(typeof value===typeof defaults[key])state[key]=value;
      }
      if(saved.pianoVersion!==2)state.pianoOctave=Math.max(1,Math.min(6,state.octave+(saved.pianoOctave||0)));
      state.pianoVersion=2;
      if(saved.visualVersion!==2)state.waveMode='cycles';
      state.visualVersion=2;
    }
  } catch {}
  // An optional chord is always opt-in on each visit; retain only its settings.
  state.thirdAdded=false;
  state.pianoHold=false;
  // Always open with a sustained tone; recorded piano is an explicit session option.
  state.pianoSound='synth';
  if(!['just','equal','pythagorean','meantone'].includes(state.pianoSystem))state.pianoSystem='just';
  if(!['azerty','qwerty'].includes(state.pianoLayout))state.pianoLayout='azerty';
  if(!Object.hasOwn(M.systems,state.system))state.system='equal';
  const limits={root:[0,11],octave:[2,5],cents:[0,3600],octaveSpan:[1,3],refOctave:[0,2],reference:[400,480],droneVolume:[0,100],upperVolume:[0,100],masterVolume:[0,100],thirdVolume:[0,100],thirdCents:[0,1200]};
  for(const [key,[min,max]] of Object.entries(limits))if(!Number.isFinite(state[key])||state[key]<min||state[key]>max)state[key]=defaults[key];
  if(!Number.isInteger(state.root))state.root=defaults.root;
  if(!Number.isInteger(state.octave))state.octave=defaults.octave;
  if(!M.intervals.some(i=>i.id===state.interval))state.interval=defaults.interval;
  if(!M.intervals.some(i=>i.id===state.thirdInterval))state.thirdInterval='P5';
  for(const key of ['droneTimbre','upperTimbre','thirdTimbre'])if(!Object.hasOwn(M.timbres,state[key]))state[key]='organ';
  if(!['envelope','phase','lissajous'].includes(state.scienceView))state.scienceView='envelope';
  if(!['fine','full'].includes(state.zoom))state.zoom='fine';
  if(!['interval','free'].includes(state.mode))state.mode='interval';
  if(!['cycles','beats'].includes(state.waveMode))state.waveMode='beats';
  if(!['auto','real','slow'].includes(state.beatSpeed))state.beatSpeed='auto';
  if(![2,4,8,16,32].includes(state.waveCycles))state.waveCycles=8;
  state.octaveSpan=Math.round(state.octaveSpan);state.refOctave=Math.round(state.refOctave);
  if(!Number.isInteger(state.pianoOctave)||state.pianoOctave<1||state.pianoOctave>6)state.pianoOctave=3;
  if(state.mode==='interval')state.refOctave=0;
  const maxCents=()=>state.mode==='free'?state.octaveSpan*1200:1200;
  state.cents=Math.min(state.cents,maxCents());
  let timelineKey='',timelineMarkers=[];
  let playing=false,starting=false,compareTimer=null,ctx=null,master=null,voices=null,rangeAnchor=null;
  let pianoEngaged=false,pianoRenderKey='',startSequence=0,lastPianoSemi=0;
  let midiAccess=null,midiInput=null,midiBusy=false,midiEnabled=false,midiPreferred='',midiGeneration=0;
  const midiPedals=new Set();
  let seriesEngaged=false,seriesMode='solo',seriesProfile='falling',seriesTuning='natural',seriesNodes=null;
  const selectedHarmonics=new Set([1]),harmonicButtons=[];
  const heldNotes=new Map(),sustainedNotes=new Map(),pianoVoices=new Map(),pianoButtons=new Map();
  const pianoAttacks=new Map();
  const pianoLabels={azerty:['Q','Z','S','E','D','F','T','G','Y','H','U','J','K'],qwerty:['A','W','S','E','D','F','T','G','Y','H','U','J','K']};
  const pianoNotes=()=>[...heldNotes.values(),...sustainedNotes.values()];
  const activePianoNotes=()=>new Set(pianoNotes().map(note=>note.semi));
  const pianoStart=()=>12*(state.pianoOctave-state.octave);
  const voiceActive=key=>!seriesEngaged&&state[key+'Enabled']&&(key!=='third'||state.thirdAdded)&&(!pianoEngaged||(key==='drone'&&state.pianoDrone));
  const interval=()=>M.extendInterval(M.tunedInterval(M.intervals.find(i=>i.id===state.interval),state.system),state.mode==='free'?state.refOctave:0,state.system);
  const thirdInterval=()=>M.tunedInterval(M.intervals.find(i=>i.id===state.thirdInterval),state.system);
  const voiceKeys=['drone','upper','third'];
  const rootMidi=()=>12*(state.octave+1)+state.root;
  const upperNoteName=()=>{
    const base=M.intervals.find(i=>i.id===state.interval),oct=state.mode==='free'?state.refOctave:0;
    return Math.round(state.cents/100)===base.semitones+12*oct?M.intervalNoteName(rootMidi(),base,oct):M.noteName(rootMidi()+Math.round(state.cents/100));
  };
  const f0=()=>M.frequency(rootMidi(),state.reference);
  const save=()=>{try{localStorage.setItem('intervalle.v1',JSON.stringify(state));}catch{}};

  for(const i of M.intervals){const option=document.createElement('option');option.value=i.id;option.textContent=i.name;$('interval').append(option);$('thirdInterval').append(option.cloneNode(true));}
  const initialFields={freeOctaves:'octaveSpan',waveCycles:'waveCycles',beatSpeed:'beatSpeed',tuningSystem:'system',rootNote:'root',octave:'octave',interval:'interval',reference:'reference',droneTimbre:'droneTimbre',upperTimbre:'upperTimbre',droneVolume:'droneVolume',upperVolume:'upperVolume',masterVolume:'masterVolume',thirdInterval:'thirdInterval',thirdTimbre:'thirdTimbre',thirdVolume:'thirdVolume'};
  for(const [id,key] of Object.entries(initialFields))$(id).value=state[key];
  for(const [source,target] of [['rootNote','harmonicsRoot'],['octave','harmonicsOctave']])for(const option of $(source).children)$(target).append(option.cloneNode(true));

  function smooth(param,value,time=.018){const t=ctx.currentTime;param.cancelScheduledValues(t);param.setTargetAtTime(value,t,time);}
  function applyTimbre(voice,name){
    if(voice.timbre===name)return;
    const coefficients=M.timbres[name];
    voice.osc.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(coefficients.length),new Float32Array(coefficients)));
    voice.timbre=name;
  }
  function updateAudio(){
    if(!ctx||!voices)return;
    smooth(voices.drone.osc.frequency,f0());
    smooth(voices.upper.osc.frequency,M.transpose(f0(),state.cents));
    smooth(voices.third.osc.frequency,M.transpose(f0(),state.thirdCents));
    for(const key of voiceKeys){
      applyTimbre(voices[key],state[key+'Timbre']);
      smooth(voices[key].gain.gain,playing&&voiceActive(key)?state[key+'Volume']/100*.28:0,.025);
    }
    updatePianoAudio();
    updateSeriesAudio();
    smooth(master.gain,state.masterVolume/100,.025);
  }
  async function initAudio(){
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)throw new Error('La synthèse audio n’est pas disponible dans ce navigateur. Essayez Safari, Chrome ou Firefox.');
    if(!ctx || ctx.state==='closed'){
      ctx=new AudioContext();
      seriesNodes=null;pianoVoices.clear();
      master=ctx.createGain();master.gain.value=state.masterVolume/100;master.connect(ctx.destination);
      voices={};
      for(const key of voiceKeys){
        const osc=ctx.createOscillator(),gain=ctx.createGain(),analyser=ctx.createAnalyser();
        gain.gain.value=0;analyser.fftSize=2048;
        osc.connect(gain);gain.connect(analyser);analyser.connect(master);
        voices[key]={osc,gain,analyser,data:new Float32Array(analyser.fftSize),timbre:null};
        applyTimbre(voices[key],state[key+'Timbre']);
        osc.frequency.value=key==='drone'?f0():M.transpose(f0(),key==='third'?state.thirdCents:state.cents);osc.start();
      }
      ctx.addEventListener('statechange',()=>{if(ctx.state!=='running'&&playing){playing=false;clearPiano();stopCompare();updateAudio();renderTransport();renderPianoState();}});
    }
    await ctx.resume();
    if(ctx.state!=='running')throw new Error('Le son est en pause dans le navigateur. Cliquez de nouveau sur « Écouter ».');
  }
  async function start(){
    if(starting)return false;
    const sequence=++startSequence;
    starting=true;$('play').disabled=true;$('audioError').hidden=true;
    try{await initAudio();if(sequence!==startSequence)return false;playing=true;updateAudio();renderTransport();return true;}
    catch(error){playing=false;$('audioError').textContent=error.message||'Impossible de démarrer le son. Rechargez la page pour réessayer.';$('audioError').hidden=false;renderTransport();return false;}
    finally{starting=false;$('play').disabled=false;}
  }
  function stop(){startSequence++;playing=false;stopCompare();clearPiano();updateAudio();renderTransport();renderPianoState();}
  function stopCompare(){
    if(compareTimer)clearInterval(compareTimer);
    compareTimer=null;$('compare').setAttribute('aria-pressed','false');$('compareLabel').textContent='Alterner pur / '+M.systems[state.system].short;$('compareHint').textContent='Toutes les 2,5 secondes';
  }
  function setCents(value,{manual=true,anchor=false,preserveInput=false,preserveReference=false,fromPiano=false}={}){
    if(!Number.isFinite(value))return;
    if(!fromPiano)clearPiano(true);
    if(manual)stopCompare();
    state.cents=Math.max(0,Math.min(maxCents(),value));
    if(state.mode==='free'&&manual&&!preserveReference)selectNearestReference();
    if(anchor)rangeAnchor=state.cents;
    render(preserveInput);updateAudio();save();
  }
  function renderTransport(){
    document.body.classList.toggle('playing',playing);
    $('play').setAttribute('aria-pressed',String(playing));
    $('playIcon').textContent=playing?'Ⅱ':'▶';$('playLabel').textContent=playing?'Pause':'Écouter';
    $('statusDot').classList.toggle('active',playing);
    const audible=state.masterVolume>0&&(voiceKeys.some(key=>voiceActive(key)&&state[key+'Volume']>0)||(pianoEngaged&&activePianoNotes().size&&state.upperEnabled&&state.upperVolume>0));
    $('statusText').textContent=playing?(seriesEngaged?(state.masterVolume&&selectedHarmonics.size?'Série harmonique en cours':'Série harmonique en sourdine'):audible?'Écoute en cours':pianoEngaged?'Clavier prêt':'Voix en sourdine'):'Prêt à écouter';
    renderVisualInfo();
    renderSeries();
  }
  function formula(cents,i){
    if(Math.abs(cents-i.pure)<1e-8)return '1 200 × log₂('+i.n+'/'+i.d+') ≈';
    if(Math.abs(cents-i.equal)<1e-8)return i.referenceFormula;
    return '1 200 × log₂('+format(2**(cents/1200),6)+') ≈';
  }
  function renderThird(){
    $('thirdPanel').hidden=!state.thirdAdded;$('addThird').hidden=state.thirdAdded;
    $('addThird').parentElement.hidden=state.thirdAdded;$('advancedVoices').hidden=state.thirdAdded;
    document.body.classList.toggle('three-voices',state.thirdAdded);
    const i=thirdInterval(),nearest=Math.round(state.thirdCents/100),offset=state.thirdCents-nearest*100;
    $('thirdNote').textContent=M.noteName(rootMidi()+nearest)+(Math.abs(offset)>.05?' '+(offset>0?'+':'−')+format(Math.abs(offset),1)+' ct':'');
    $('thirdHz').textContent=format(M.transpose(f0(),state.thirdCents))+' Hz';
    $('thirdRatio').textContent='Rapport au bourdon ≈ '+format(2**(state.thirdCents/1200),6);
    $('thirdCentsSlider').value=state.thirdCents;
    if(document.activeElement!==$('thirdCentsInput'))$('thirdCentsInput').value=state.thirdCents.toFixed(2);
    $('thirdFormula').textContent=formula(state.thirdCents,i)+' '+format(state.thirdCents)+' cents';
    $('thirdPure').textContent='Pur · '+i.n+'/'+i.d+' · '+format(i.pure)+' ct';
    $('thirdEqual').textContent=M.systems[state.system].short+' · '+format(i.equal,2)+' ct';
    $('thirdPure').setAttribute('aria-pressed',String(Math.abs(state.thirdCents-i.pure)<.006));
    $('thirdEqual').setAttribute('aria-pressed',String(Math.abs(state.thirdCents-i.equal)<.006));
  }
  function renderRatios(){
    const i=interval(),r=M.relationship(f0(),state.cents,i);
    $('ratioCurrent').textContent='≈ '+format(r.ratio,6);
    $('ratioCurrentHz').textContent=format(r.second)+' Hz ÷ '+format(f0())+' Hz';
    let denominator=i.d;while(denominator%2===0)denominator/=2;while(denominator%5===0)denominator/=5;
    $('ratioPure').textContent=i.n+'/'+i.d+(denominator===1?' = ':' ≈ ')+(i.n/i.d).toLocaleString('fr-FR',{maximumFractionDigits:6});
    $('pureConversion').textContent='1 200 × log₂('+i.n+'/'+i.d+') ≈ '+format(i.pure)+' cents';
    $('referenceSystemLabel').textContent=M.systems[state.system].name;
    $('ratioEqual').textContent=i.referenceExpression+' ≈ '+format(2**(i.equal/1200),6);
    $('equalConversion').textContent=i.referenceFormula+' '+format(i.equal)+' cents';
    $('ratioExample').textContent='Au repère pur, '+format(f0())+' Hz × '+i.n+'/'+i.d+' ≈ '+format(f0()*i.n/i.d)+' Hz. Les valeurs affichées sont arrondies ; le calcul utilise leur précision complète.';
    $('cyclesExplanation').textContent='Sur une même durée, le rapport '+i.n+'/'+i.d+' correspond à '+i.d+' cycle'+(i.d>1?'s':'')+' du bourdon pour '+i.n+' cycle'+(i.n>1?'s':'')+' de la deuxième note.';
    $('harmonicExplanation').textContent='Au repère '+i.n+'/'+i.d+', l’harmonique '+i.n+' du bourdon et l’harmonique '+i.d+' de la deuxième note ont la même fréquence.';
    $('harmonicBaseLabel').textContent='Bourdon · H'+i.n+' = '+i.n+' × f₁';
    $('harmonicUpperLabel').textContent='Note 2 · H'+i.d+' = '+i.d+' × f₂';
    $('harmonicBaseHz').textContent=format(r.harmonicBase)+' Hz';$('harmonicUpperHz').textContent=format(r.harmonicUpper)+' Hz';
    $('harmonicGap').textContent='Écart de cette paire : |'+i.n+' × f₁ − '+i.d+' × f₂| ≈ '+format(r.gap)+' Hz';
    const present=(M.timbres[state.droneTimbre][i.n]||0)>0&&(M.timbres[state.upperTimbre][i.d]||0)>0;
    const muted=!state.droneEnabled||!state.upperEnabled||!state.droneVolume||!state.upperVolume||!state.masterVolume;
    const beyond=ctx&&Math.max(r.harmonicBase,r.harmonicUpper)>=ctx.sampleRate/2;
    $('harmonicNote').textContent=!present?'Cette paire d’harmoniques n’est pas présente dans les deux timbres choisis : le calcul reste théorique.':beyond?'Cette paire dépasse la limite de fréquence du moteur audio : le calcul reste théorique.':muted?'Une des deux voix est en sourdine. Rétablissez les deux pour comparer leurs harmoniques.':r.gap<1e-8?'Ces deux harmoniques coïncident : aucun battement entre elles. Les autres composantes du son restent présentes.':r.gap<=20?'Près du repère pur, cet écart correspond à environ '+format(r.gap,2)+' battements par seconde entre ces deux harmoniques. Leur perception dépend du timbre et du volume.':'Cet écart est trop rapide pour être suivi comme une pulsation lente. Rapprochez le curseur du repère pur.';
    renderVisualInfo();
  }

  function visualModel(){
    const i=interval(),r=M.relationship(f0(),state.cents,i),beats=state.waveMode==='beats';
    const duration=state.waveCycles/(beats?r.harmonicBase:f0());
    const rows=[{key:'drone',label:beats?'H'+i.n+' bourdon':'Bourdon',cycles:state.waveCycles,color:'#1076eb'},
      {key:'upper',label:beats?'H'+i.d+' note 2':'Note 2',cycles:duration*(beats?r.harmonicUpper:r.second),color:'#db2893'}];
    if(!beats&&state.thirdAdded)rows.push({key:'third',label:'Note 3',cycles:duration*M.transpose(f0(),state.thirdCents),color:'#008773'});
    const display=M.beatDisplay(r.gap,state.beatSpeed);
    const present=(M.timbres[state.droneTimbre][i.n]||0)>0&&(M.timbres[state.upperTimbre][i.d]||0)>0;
    const upperActive=!pianoEngaged||[...activePianoNotes()].some(semi=>Math.abs(M.keyboardPitch(semi,state.pianoSystem).cents-state.cents)<1e-8);
    const audible=voiceActive('drone')&&upperActive&&state.upperEnabled&&state.droneVolume>0&&state.upperVolume>0&&state.masterVolume>0;
    const beyond=ctx&&Math.max(r.harmonicBase,r.harmonicUpper)>=ctx.sampleRate/2;
    return {i,r,beats,duration,rows,display,present,audible,beyond};
  }
  function renderVisualInfo(){
    const v=visualModel(),{i,r,display}=v;
    for(const [id,view] of [['viewEnvelope','envelope'],['viewPhase','phase'],['viewLissajous','lissajous']])$(id).setAttribute('aria-pressed',String(state.scienceView===view));
    $('phaseView').hidden=state.scienceView!=='phase';$('envelopeView').hidden=state.scienceView!=='envelope';$('lissajousView').hidden=state.scienceView!=='lissajous';
    $('beatScience').classList.toggle('phase-selected',state.scienceView==='phase');
    $('beatInstruction').textContent=state.scienceView==='envelope'?'Suivez le point : chaque retour au maximum correspond à un battement et à une pulsation lumineuse.':state.scienceView==='phase'?'Même direction : renforcement et lumière. Directions opposées : atténuation.':'La courbe associe les valeurs des deux fondamentales. Le témoin lumineux suit toujours leur paire d’harmoniques indiquée ci-dessus.';
    $('lissajousCaption').textContent='Fenêtre : '+i.d+' cycles du bourdon. Au repère '+i.n+'/'+i.d+', la figure se ferme ; près de ce repère, un désaccord la fait évoluer. Défilement ralenti dans le repère du bourdon.';
    $('waveCyclesMode').setAttribute('aria-pressed',String(!v.beats));$('waveBeatsMode').setAttribute('aria-pressed',String(v.beats));
    $('waveHeading').textContent=v.beats?'HARMONIQUES · DÉPHASAGE RELATIF':'POINTS MOBILES · FONDAMENTALES';
    $('cycleStatus').textContent=v.beats?(r.gap<1e-8?'Même fréquence':'Écart : '+format(r.gap)+' Hz'):state.waveCycles+' cycles du bourdon';
    $('cycleStatus').classList.toggle('aligned',r.gap<1e-8);
    $('cycleCaption').textContent=v.beats?'Phase comparée au bord gauche : le cercle et l’enveloppe ci-dessous rendent le battement visible.':'Lecture ralentie des fondamentales : les points traversent la fenêtre en 4,5 s, indépendamment du rythme des battements. Leurs croisements ne sont pas les battements.';
    $('cycleLegend').replaceChildren();
    for(const row of v.rows){const item=document.createElement('span');item.className=row.key+'-legend';item.textContent=row.label+' · '+format(row.cycles,Math.abs(row.cycles-Math.round(row.cycles))<1e-8?0:2)+' cycles'+(state[row.key+'Enabled']?'':' · muette');$('cycleLegend').append(item);}
    $('scope').setAttribute('aria-label',v.rows.map(row=>row.label+' : '+format(row.cycles,2)+' cycles').join(', ')+'. Fenêtre de '+format(v.duration*1000)+' millisecondes.');
    $('waveWiden').disabled=state.waveCycles===2;$('waveTighten').disabled=state.waveCycles===32;
    $('beatRate').textContent=r.gap<1e-8?'0 battement pour cette paire':format(r.gap,r.gap<.01?3:2)+(r.gap>20?' Hz d’écart':' battements/s');
    $('beatPair').textContent='H'+i.n+' du bourdon ↔ H'+i.d+' de la note 2';
    const scale=display.scale<.999?'Ralenti ×'+format(display.scale,3)+' · '+format(display.hz,2)+' pulsations/s affichées':'Temps réel';
    $('beatStatus').textContent=!playing?'Lancez l’écoute pour voir la pulsation.':!v.present?'Paire absente des timbres : calcul théorique.':v.beyond?'Paire hors de la plage audio.':!v.audible?'Rétablissez les deux voix pour écouter cette pulsation.':reducedMotion.matches?'Animation réduite selon votre préférence système.':display.tooFast?'Rythme trop rapide à afficher : choisissez Auto ou Ralenti.':r.gap<1e-8?'Ces harmoniques coïncident.':scale;
    $('beatLamp').setAttribute('aria-label',r.gap<1e-8?'Harmoniques à l’unisson':format(r.gap,2)+' battements par seconde calculés. '+scale);
    $('beatLamp').classList.toggle('stable',r.gap<1e-8);$('beatLamp').classList.toggle('inactive',!playing||!v.present||!v.audible||v.beyond);
    $('beatPeriod').textContent=r.gap<1e-8?'Cette paire : fréquences identiques, pas de battement.':'Période réelle : 1 / '+format(r.gap,r.gap<.01?3:2)+' ≈ '+format(1/r.gap)+' s'+(display.scale<.999?' · parcours affiché : '+format(1/display.hz)+' s':'');
    let path='';
    for(let step=0;step<=128;step++){
      const x=12+336*step/128,y=90-68*(r.gap<1e-8?1:M.beatPhaseModel(step/128).envelope);
      path+=(step?' L':'M')+x.toFixed(2)+' '+y.toFixed(2);
    }
    $('envelopePath').setAttribute('d',path);$('envelopeArea').setAttribute('d',path+' L348 90 L12 90 Z');
    $('envelopeMiddleLabel').textContent=r.gap<1e-8?'Stable':'Minimum';
    $('beatEnvelope').setAttribute('aria-label',r.gap<1e-8?'Enveloppe constante : fréquences identiques, aucun battement.':'Enveloppe de la paire : un battement du maximum au minimum puis au maximum.');
  }
  function selectNearestReference(){
    const nearest=Math.round(state.cents/100),last=nearest>=state.octaveSpan*12;
    state.refOctave=last?state.octaveSpan-1:Math.floor(nearest/12);
    const semi=last?12:nearest%12;
    state.interval=M.intervals.find(i=>i.semitones===semi).id;$('interval').value=state.interval;
  }
  function clearPiano(exit=false){
    heldNotes.clear();sustainedNotes.clear();midiPedals.clear();
    if(exit){pianoEngaged=false;seriesEngaged=false;}
  }
  const pianoSamples=new Map();let pianoSampleLoad=null;
  const sampleMidis=Array.from({length:30},(_,i)=>21+i*3);
  const sampleName=midi=>['C','Cs','D','Ds','E','F','Fs','G','Gs','A','As','B'][midi%12]+(Math.floor(midi/12)-1);
  function loadPianoSamples(){
    if(pianoSamples.size===sampleMidis.length)return Promise.resolve(true);
    if(pianoSampleLoad)return pianoSampleLoad;
    $('pianoSoundStatus').textContent='Chargement du piano enregistré…';
    pianoSampleLoad=Promise.all(sampleMidis.map(async midi=>{
      if(pianoSamples.has(midi))return;
      const response=await fetch('piano-'+sampleName(midi)+'.mp3');
      if(!response.ok)throw new Error('Échantillon indisponible');
      const buffer=await ctx.decodeAudioData(await response.arrayBuffer());pianoSamples.set(midi,buffer);
    })).then(()=>{$('pianoSoundStatus').textContent='Piano prêt · la pédale prolonge la résonance, qui décroît naturellement.';return true;})
      .catch(()=>{$('pianoSoundStatus').textContent='Chargement incomplet. Vérifiez la connexion puis sélectionnez de nouveau le piano acoustique, ou choisissez un son de synthèse.';return false;})
      .finally(()=>{pianoSampleLoad=null;});
    return pianoSampleLoad;
  }
  function updatePianoAudio(){
    const sampled=state.pianoSound==='sampled';
    const wanted=playing&&pianoEngaged?activePianoNotes():new Set();
    const ready=!sampled||pianoSamples.size===sampleMidis.length;
    if(!ready&&wanted.size&&!pianoSampleLoad)void loadPianoSamples().then(ok=>{if(ok)updateAudio();});
    for(const [semi,voice] of pianoVoices){
      if(wanted.has(semi)&&voice.sampled===sampled&&(!sampled||voice.attack===pianoAttacks.get(semi)))continue;
      smooth(voice.gain.gain,0,voice.sampled?.09:.015);voice.osc.stop(ctx.currentTime+(voice.sampled?.6:.12));
      voice.osc.onended=()=>{voice.osc.disconnect();voice.gain.disconnect();};
      pianoVoices.delete(semi);
    }
    if(!ready)return;
    for(const semi of wanted){
      let voice=pianoVoices.get(semi);
      const frequency=M.transpose(f0(),M.keyboardPitch(semi,state.pianoSystem).cents);
      if(!voice){
        const osc=sampled?ctx.createBufferSource():ctx.createOscillator(),gain=ctx.createGain();gain.gain.value=0;
        osc.connect(gain);gain.connect(master);voice={osc,gain,timbre:null,sampled,attack:pianoAttacks.get(semi)};
        if(sampled){
          const target=69+12*Math.log2(frequency/440);
          voice.sampleMidi=sampleMidis.reduce((a,b)=>Math.abs(a-target)<Math.abs(b-target)?a:b);
          osc.buffer=pianoSamples.get(voice.sampleMidi);osc.playbackRate.value=frequency/M.frequency(voice.sampleMidi);
          osc.onended=()=>{osc.disconnect();gain.disconnect();};
        }else{applyTimbre(voice,state.upperTimbre);osc.frequency.value=frequency;}
        osc.start();pianoVoices.set(semi,voice);
      }else if(sampled)smooth(voice.osc.playbackRate,frequency/M.frequency(voice.sampleMidi));
      else{applyTimbre(voice,state.upperTimbre);smooth(voice.osc.frequency,frequency);}
      // Leave headroom for the optional drone even with many sustained notes.
      smooth(voice.gain.gain,state.upperEnabled?state.upperVolume/100*.55*Math.max(...pianoNotes().filter(note=>note.semi===semi).map(note=>note.velocity))/Math.max(2,wanted.size):0,.012);
    }
  }
  function selectPianoPitch(semi){
    lastPianoSemi=semi;
    const pitch=M.keyboardPitch(semi,state.pianoSystem);
    if(pitch.cents<0||pitch.cents>maxCents()){stopCompare();renderPianoState();updateAudio();renderTransport();return;}
    state.interval=pitch.base.id;state.refOctave=pitch.octaves;
    state.system=state.pianoSystem==='just'?'equal':state.pianoSystem;
    $('interval').value=state.interval;$('tuningSystem').value=state.system;
    setCents(pitch.cents,{preserveReference:true,fromPiano:true});
  }
  function pianoDown(source,semi,velocity=1,channel=null){
    if(state.mode!=='free'||heldNotes.has(source))return;
    seriesEngaged=false;pianoAttacks.set(semi,(pianoAttacks.get(semi)||0)+1);
    pianoEngaged=true;heldNotes.set(source,{semi,velocity,channel});sustainedNotes.delete(source+':'+semi);
    selectPianoPitch(semi);
    if(!playing)void start().then(ok=>{if(!ok&&!starting)clearPiano();updateAudio();renderPianoState();renderTransport();});
  }
  function pianoUp(source){
    if(!heldNotes.has(source))return;
    const note=heldNotes.get(source);heldNotes.delete(source);
    if(state.pianoHold||(note.channel!==null&&midiPedals.has(note.channel)))sustainedNotes.set(source+':'+note.semi,note);
    updateAudio();renderPianoState();renderTransport();
  }
  function renderPianoState(){
    const active=activePianoNotes();
    const pitch=M.keyboardPitch(lastPianoSemi,state.pianoSystem);
    $('pianoGraphHint').textContent=pianoEngaged&&(pitch.cents<0||pitch.cents>maxCents())?'Cette note est hors de la frise : les graphiques gardent la dernière note située dans son étendue.':'Les graphiques suivent la dernière note située dans la frise, face au bourdon ; ils ne représentent pas l’accord complet.';
    for(const [semi,button] of pianoButtons){
      button.setAttribute('aria-pressed',String(playing&&active.has(semi)));
      button.classList.toggle('selected-note',Math.abs(M.keyboardPitch(semi,state.pianoSystem).cents-state.cents)<.006);
    }
    const names=[...active].sort((a,b)=>a-b).map(semi=>{const p=M.keyboardPitch(semi,state.pianoSystem);return M.intervalNoteName(rootMidi(),p.base,p.octaves);});
    $('pianoStatus').textContent=!pianoEngaged?'Cliquez sur les touches ou utilisez les lettres indiquées.':!playing?'Piano en pause. Jouez une touche pour reprendre.':!state.upperEnabled||!state.upperVolume||!state.masterVolume?'Piano en sourdine : rétablissez la deuxième note et son volume.':names.length?names.join(' · ')+(state.pianoDrone?' · avec bourdon':' · sans bourdon'):(state.pianoDrone?'Bourdon continu · jouez une note.':'Piano prêt · aucune note maintenue.');
  }
  function renderPiano(){
    $('pianoSystem').value=state.pianoSystem;$('pianoLayout').value=state.pianoLayout;
    $('pianoTimbre').value=state.pianoSound==='sampled'?'sampled':state.upperTimbre;$('pianoDrone').checked=state.pianoDrone;$('pianoHold').checked=state.pianoHold;
    const signature=[rootMidi(),state.octaveSpan,state.pianoSystem,state.pianoLayout,state.pianoOctave].join(':');
    if(signature!==pianoRenderKey){
      pianoRenderKey=signature;pianoButtons.clear();$('pianoKeys').replaceChildren();$('pianoOctave').replaceChildren();
      for(let oct=1;oct<=6;oct++){const option=document.createElement('option');option.value=oct;option.textContent=M.noteName(12*(oct+1)+state.root)+' → '+M.noteName(12*(oct+1+state.octaveSpan)+state.root);$('pianoOctave').append(option);}
      $('pianoOctave').value=state.pianoOctave;$('pianoOctaveDown').disabled=state.pianoOctave===1;$('pianoOctaveUp').disabled=state.pianoOctave===6;
      const black=semi=>[1,3,6,8,10].includes(((rootMidi()+semi)%12+12)%12),positions=[];
      const first=pianoStart();
      let whites=black(first)?.5:0;
      for(let semi=first;semi<=first+state.octaveSpan*12;semi++)positions.push({semi,dark:black(semi),left:black(semi)?whites-.32:whites++});
      const width=Math.max(whites,...positions.map(p=>p.left+(p.dark?.64:1)));
      $('pianoKeys').style.minWidth=Math.max(420,width*48)+'px';$('pianoKeys').style.setProperty('--piano-white-count',width);
      for(const {semi,dark,left} of positions){
        const pitch=M.keyboardPitch(semi,state.pianoSystem),note=M.intervalNoteName(rootMidi(),pitch.base,pitch.octaves);
        const button=document.createElement('button');button.type='button';button.className='piano-key '+(dark?'black-key':'white-key');
        button.style.left=100*left/width+'%';button.style.width=100*(dark?.64:1)/width+'%';
        button.dataset.semitone=semi;button.setAttribute('aria-label',note+', '+format(pitch.cents)+' cents');
        const name=document.createElement('span');name.className='piano-note';name.textContent=note;
        const cents=document.createElement('small');cents.textContent=format(pitch.cents,1)+' ct';
        const shortcut=document.createElement('kbd');shortcut.textContent=pianoLabels[state.pianoLayout][semi-first]||'';
        if(shortcut.textContent)button.setAttribute('aria-keyshortcuts',shortcut.textContent.toLowerCase());
        button.append(name,cents,shortcut);
        button.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();button.focus({preventScroll:true});button.setPointerCapture(e.pointerId);pianoDown('pointer:'+e.pointerId,semi);});
        button.addEventListener('pointermove',e=>{
          const source='pointer:'+e.pointerId;
          if(!button.hasPointerCapture(e.pointerId))return;
          const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('.piano-key');
          const next=hit&&hit.parentElement===$('pianoKeys')?Number(hit.dataset.semitone):null;
          if(heldNotes.get(source)?.semi===next)return;
          pianoUp(source);if(next!==null)pianoDown(source,next);
        });
        button.addEventListener('contextmenu',e=>e.preventDefault());
        for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>pianoUp('pointer:'+e.pointerId));
        // Keyboard/assistive activation of a button auditions a short note.
        button.addEventListener('click',e=>{if(e.detail===0){const source='accessible:'+semi;pianoDown(source,semi);setTimeout(()=>pianoUp(source),350);}});
        $('pianoKeys').append(button);pianoButtons.set(semi,button);
      }
      $('pianoKeys').parentElement.scrollLeft=0;$('pianoPan').value=0;
    }
    renderPianoState();
  }
  function releaseMidi(channel=null){
    for(const notes of [heldNotes,sustainedNotes])for(const [source,note] of notes)if(source.startsWith('midi:')&&(channel===null||note.channel===channel))notes.delete(source);
    if(channel===null)midiPedals.clear();else midiPedals.delete(channel);
    updateAudio();renderPianoState();renderTransport();
  }
  function onMidiMessage(event){
    const [status,note,value]=event.data||[],command=status&0xf0,channel=status&0x0f;
    if(!midiEnabled||!Number.isInteger(note)||!Number.isInteger(value)||note>127||value>127)return;
    const source='midi:'+channel+':'+note;
    if(command===0x80||(command===0x90&&value===0)){pianoUp(source);return;}
    if(command===0xb0){
      if(note===64){
        if(value>=64)midiPedals.add(channel);
        else{midiPedals.delete(channel);if(!state.pianoHold)for(const [key,held] of sustainedNotes)if(held.channel===channel)sustainedNotes.delete(key);}
        updateAudio();renderPianoState();renderTransport();
      }else if(note===120)releaseMidi(channel);
      else if(note===123){for(const [key,held] of [...heldNotes])if(held.channel===channel)pianoUp(key);}
      else if(note===121){midiPedals.delete(channel);if(!state.pianoHold)for(const [key,held] of sustainedNotes)if(held.channel===channel)sustainedNotes.delete(key);updateAudio();renderPianoState();}
      return;
    }
    if(command!==0x90||state.mode!=='free'||document.hidden||$('helpDialog').open)return;
    // A repeated Note On retriggers that source; other channels keep their own notes.
    heldNotes.delete(source);sustainedNotes.delete(source);
    pianoDown(source,note-rootMidi(),value/127,channel);
  }
  function unbindMidi(){
    const old=midiInput;midiInput=null;
    if(old){old.onmidimessage=null;void old.close().catch(()=>{});}
    releaseMidi();
  }
  function refreshMidi(){
    if(!midiAccess||!midiEnabled)return;
    const inputs=[...midiAccess.inputs.values()].filter(input=>input.state==='connected');
    if(!midiPreferred&&inputs.length)midiPreferred=inputs[0].id;
    const chosen=inputs.find(input=>input.id===midiPreferred)||null;
    $('midiInput').replaceChildren();
    if(!chosen){const option=document.createElement('option');option.value='';option.textContent=inputs.length?'Choisir un clavier…':'Aucun clavier détecté';$('midiInput').append(option);}
    for(const input of inputs){const option=document.createElement('option');option.value=input.id;option.textContent=input.name||input.manufacturer||'Clavier MIDI';$('midiInput').append(option);}
    $('midiInput').value=chosen?chosen.id:'';$('midiInput').disabled=!inputs.length;
    $('midiStatus').textContent=chosen?'Connecté : '+(chosen.name||'clavier MIDI')+' · jouez une note.':midiPreferred?'Clavier débranché. Rebranchez-le ou choisissez une autre entrée.':'Aucun clavier détecté. Branchez-le : il apparaîtra automatiquement ici.';
    if(chosen!==midiInput){
      unbindMidi();midiInput=chosen;
      if(chosen){chosen.onmidimessage=onMidiMessage;void chosen.open().catch(()=>{if(midiInput===chosen){unbindMidi();$('midiStatus').textContent='Impossible d’ouvrir ce clavier. Vérifiez sa connexion puis reconnectez le MIDI.';}});}
    }
  }
  function disconnectMidi(){
    midiGeneration++;midiEnabled=false;
    if(midiAccess)midiAccess.onstatechange=null;
    unbindMidi();$('midiInput').disabled=true;$('midiConnect').textContent='Connecter un clavier MIDI';$('midiStatus').textContent='MIDI déconnecté. Le piano à l’écran reste disponible.';
  }
  $('midiConnect').addEventListener('click',async()=>{
    if(midiBusy)return;
    if(midiEnabled){disconnectMidi();return;}
    if(!navigator.requestMIDIAccess){$('midiStatus').textContent='MIDI indisponible dans ce navigateur. Ouvrez cette page dans Chrome ou Edge sur ordinateur.';return;}
    const generation=++midiGeneration;midiBusy=true;$('midiConnect').disabled=true;$('midiStatus').textContent='Autorisez l’accès au clavier dans la demande du navigateur…';
    // Resume audio during the click, since incoming MIDI is not a browser user gesture.
    const audioReady=initAudio().then(()=>true).catch(()=>false);
    try{
      const access=await navigator.requestMIDIAccess({sysex:false});const ready=await audioReady;
      if(generation!==midiGeneration)return;
      midiAccess=access;midiEnabled=true;access.onstatechange=refreshMidi;
      $('midiConnect').textContent='Déconnecter le MIDI';refreshMidi();
      if(!ready)$('midiStatus').textContent+=' Cliquez sur Écouter pour activer le son.';
    }catch(error){
      $('midiStatus').textContent=error.name==='NotAllowedError'||error.name==='SecurityError'?'Accès MIDI refusé. Autorisez-le dans les réglages de ce site, puis réessayez.':'Connexion MIDI impossible. Vérifiez le clavier et réessayez.';
    }finally{midiBusy=false;$('midiConnect').disabled=false;}
  });
  $('midiInput').addEventListener('change',e=>{midiPreferred=e.target.value;refreshMidi();});
  if(!navigator.requestMIDIAccess){$('midiConnect').disabled=true;$('midiStatus').textContent='MIDI indisponible ici. Pour brancher un clavier, ouvrez cette page dans Chrome ou Edge sur ordinateur.';}

  const seriesTunings={natural:'série naturelle',just:'accordage juste',equal:'tempérament égal',pythagorean:'accordage pythagoricien',meantone:'mésotonique ¼ comma'};
  const svgNS='http://www.w3.org/2000/svg';
  function svgElement(tag,attrs={},text=''){
    const node=document.createElementNS(svgNS,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);if(text)node.textContent=text;return node;
  }
  let scoreKey='';
  function selectHarmonic(n){
    if(seriesMode==='solo'){selectedHarmonics.clear();selectedHarmonics.add(n);}
    else if(selectedHarmonics.has(n))selectedHarmonics.delete(n);else selectedHarmonics.add(n);
    void startSeries();
  }
  function seriesPitch(n){
    const h=M.harmonic(rootMidi(),n,state.reference);
    const cents=seriesTuning==='natural'?h.cents:M.keyboardPitch(h.semitones,seriesTuning).cents;
    const frequency=M.transpose(f0(),cents),offset=cents-h.semitones*100;
    return {...h,heard:frequency,heardCents:cents,heardOffset:offset};
  }
  function harmonicFraction(n){
    let denominator=2**Math.floor(Math.log2(n)),numerator=n;
    while(numerator%2===0&&denominator>1){numerator/=2;denominator/=2;}
    return numerator+'/'+denominator;
  }
  function offsetText(cents){return Math.abs(cents)<.05?'0 ct':(cents>0?'↑ +':'↓ −')+format(Math.abs(cents),1)+' ct';}
  function renderHarmonicScore(){
    const key=[rootMidi(),seriesTuning,...selectedHarmonics].join(':');if(key===scoreKey)return;scoreKey=key;
    const score=$('harmonicsScore'),focused=document.activeElement?.dataset?.harmonic;score.replaceChildren();
    const width=1640,left=122,step=94;
    const transposeOctaves=Math.max(0,state.octave-3);
    const pitchY=midi=>{const degree=[0,0,1,2,2,3,3,4,5,5,6,6][((midi%12)+12)%12]+7*(Math.floor(midi/12)-1);return 170-(degree-28)*6;};
    const notes=Array.from({length:16},(_,i)=>{const h=seriesPitch(i+1);return {...h,y:pitchY(rootMidi()+h.semitones-12*transposeOctaves)};});
    const top=Math.min(32,...notes.map(h=>h.y-45)),bottom=Math.max(260,...notes.map(h=>h.y+25)),height=bottom+111-top;
    score.setAttribute('viewBox','0 '+top+' '+width+' '+height);
    score.append(svgElement('title',{},'Série harmonique interactive : '+seriesTunings[seriesTuning]));
    score.append(svgElement('desc',{},'Cliquez sur une note pour l’écouter. Les écarts en cents sont mesurés par rapport au tempérament égal.'));
    for(const y of [110,122,134,146,158,182,194,206,218,230])score.append(svgElement('line',{x1:48,x2:width-15,y1:y,y2:y,stroke:'#97a8ba','stroke-width':1}));
    score.append(svgElement('line',{x1:48,x2:48,y1:110,y2:230,stroke:'#73899e','stroke-width':2}));
    score.append(svgElement('text',{x:53,y:153,'font-size':66,'font-family':'Apple Symbols, Noto Music, serif',fill:'#365774'},'𝄞'));
    score.append(svgElement('text',{x:55,y:224,'font-size':49,'font-family':'Apple Symbols, Noto Music, serif',fill:'#365774'},'𝄢'));
    score.append(svgElement('text',{x:10,y:bottom+35,class:'score-row-label'},'Écart / égal'));
    score.append(svgElement('text',{x:10,y:bottom+62,class:'score-row-label'},'Hn / H1'));
    score.append(svgElement('text',{x:10,y:bottom+85,class:'score-row-label'},'Dans l’octave'));
    notes.forEach((h,index)=>{
      const x=left+index*step,n=index+1,selected=selectedHarmonics.has(n);
      const group=svgElement('g',{class:'score-note',role:'button',tabindex:0,'data-harmonic':n,'aria-pressed':String(selected),'aria-label':'H'+n+', '+h.note+', '+seriesTunings[seriesTuning]+', '+offsetText(h.heardOffset)+', rapport naturel '+n+'/1, dans l’octave '+harmonicFraction(n)});
      group.append(svgElement('rect',{x:x-37,y:top+1,width:80,height:height-3,rx:8,class:'score-hit'}));
      group.append(svgElement('text',{x,y:top+21,'text-anchor':'middle',class:'score-rank'},'H'+n));
      const ledgers=[];
      if(h.y<=98)for(let y=98;y>=h.y;y-=12)ledgers.push(y);
      if(h.y>=242)for(let y=242;y<=h.y;y+=12)ledgers.push(y);
      if(h.y===170)ledgers.push(170);
      for(const y of ledgers)group.append(svgElement('line',{x1:x-16,x2:x+16,y1:y,y2:y,stroke:'#365774','stroke-width':1.4}));
      const accidental=h.note.includes('♯')?'♯':h.note.includes('♭')?'♭':'';
      if(accidental)group.append(svgElement('text',{x:x-29,y:h.y+7,'font-size':25,'font-family':'Arial, sans-serif',fill:'currentColor'},accidental));
      group.append(svgElement('ellipse',{cx:x,cy:h.y,rx:10,ry:6.5,transform:'rotate(-18 '+x+' '+h.y+')',class:'score-notehead'}));
      group.append(svgElement('ellipse',{cx:x,cy:h.y,rx:3.5,ry:5,transform:'rotate(-18 '+x+' '+h.y+')',fill:'#fff','pointer-events':'none'}));
      group.append(svgElement('text',{x,y:bottom+12,'text-anchor':'middle',class:'score-name'},h.note));
      group.append(svgElement('text',{x,y:bottom+35,'text-anchor':'middle',class:'score-cents'},offsetText(h.heardOffset)));
      group.append(svgElement('text',{x,y:bottom+62,'text-anchor':'middle',class:'score-fraction'},n+'/1'));
      group.append(svgElement('text',{x,y:bottom+85,'text-anchor':'middle',class:'score-reduced'},harmonicFraction(n)));
      group.addEventListener('click',()=>selectHarmonic(n));
      group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectHarmonic(n);}});
      score.append(group);
      if(String(n)===focused)group.focus({preventScroll:true});
    });
    $('scoreOctaveHint').textContent=transposeOctaves?(transposeOctaves===1?'Portée en 8va : les sons sont une octave plus haut.':'Portée en 15ma : les sons sont deux octaves plus haut.')+' Les noms indiquent les hauteurs réellement jouées.':'Les noms et la portée indiquent les hauteurs réellement jouées.';
  }

  function updateSeriesAudio(){
    if(seriesEngaged&&!seriesNodes){
      const startAt=ctx.currentTime+.005;
      seriesNodes=Array.from({length:16},(_,index)=>{
        const osc=ctx.createOscillator(),gain=ctx.createGain();
        osc.type='sine';osc.frequency.value=f0()*(index+1);gain.gain.value=0;
        osc.connect(gain);gain.connect(master);osc.start(startAt);return {osc,gain};
      });
    }
    if(!seriesNodes)return;
    const amplitude=n=>seriesProfile==='falling'?1/n:1;
    const total=[...selectedHarmonics].reduce((sum,n)=>sum+amplitude(n),0)||1;
    seriesNodes.forEach((voice,index)=>{
      const n=index+1,h=seriesPitch(n),freq=h.heard;
      smooth(voice.osc.frequency,freq);
      smooth(voice.gain.gain,playing&&seriesEngaged&&selectedHarmonics.has(n)&&freq<ctx.sampleRate/2?.35*amplitude(n)/total:0,.025);
    });
  }
  function renderSeries(){
    $('harmonicsRoot').value=state.root;$('harmonicsOctave').value=state.octave;$('harmonicsProfile').value=seriesProfile;
    $('harmonicsBase').textContent=M.noteName(rootMidi())+' · '+format(f0())+' Hz';
    $('harmonicsFormula').textContent=seriesTuning==='natural'?'fₙ = n × f₁':'f = f₁ × 2^(cents/1 200)';
    $('harmonicsTuning').value=seriesTuning;
    $('harmonicsNatural').setAttribute('aria-pressed',String(seriesTuning==='natural'));
    $('harmonicsTempered').setAttribute('aria-pressed',String(seriesTuning==='equal'));
    $('harmoniques').classList.toggle('tempered-series',seriesTuning==='equal');
    $('harmonicsComparisonHint').textContent=seriesTuning==='natural'?'Fréquences exactes n × f₁. Sélectionnez H5 ou H7, puis alternez les deux accordages.':'Notes de l’'+seriesTunings[seriesTuning]+' les plus proches de la série ; les cents affichés mesurent leur écart au tempérament égal.';
    $('harmonicsSolo').setAttribute('aria-pressed',String(seriesMode==='solo'));
    $('harmonicsSum').setAttribute('aria-pressed',String(seriesMode==='sum'));
    $('harmonicsInstruction').textContent=seriesMode==='solo'?'Cliquez sur une harmonique pour l’écouter seule.':'Activez ou retirez des harmoniques : écoutez le timbre se transformer.';
    for(let n=1;n<=16;n++){
      const h=seriesPitch(n),item=harmonicButtons[n-1];
      const offset=offsetText(h.heardOffset);
      item.button.setAttribute('aria-pressed',String(selectedHarmonics.has(n)));
      item.button.setAttribute('aria-label','H'+n+', '+h.note+', entendue '+format(h.heard)+' hertz, tempérée '+format(h.equalFrequency)+' hertz, '+offset);
      item.button.style.setProperty('--partial-height',((seriesProfile==='falling'?1/n:1)*100)+'%');
      item.note.textContent=h.note;item.frequency.textContent=seriesTuning==='natural'?n+' × '+format(f0())+' ≈ '+format(h.heard)+' Hz':'Entendue : '+format(h.heard)+' Hz';
      item.fraction.textContent='Naturel : '+n+'/1 · octave : '+harmonicFraction(n);
      item.tempered.textContent='Tempérée : '+format(h.equalFrequency)+' Hz';
      item.offset.textContent=offsetText(h.heardOffset)+' par rapport au tempéré';
    }
    renderHarmonicScore();
    const active=playing&&seriesEngaged;
    $('harmonicsPlay').setAttribute('aria-pressed',String(active));$('harmonicsPlay').textContent=active?'Ⅱ Pause':'▶ Écouter la série';
    const selected=[...selectedHarmonics].sort((a,b)=>a-b);
    $('harmonicsStatus').textContent=selected.length?(active?'À l’écoute : ':'Sélection : ')+selected.map(n=>'H'+n).join(' + ')+' · '+seriesTunings[seriesTuning]+(state.masterVolume===0?' · volume général à zéro':''):'Aucune harmonique sélectionnée · cliquez sur une case.';
  }
  async function startSeries(){
    clearPiano(true);stopCompare();seriesEngaged=true;
    if(!playing)await start();else{updateAudio();renderTransport();}
    renderPianoState();renderSeries();
  }
  for(let n=1;n<=16;n++){
    const button=document.createElement('button');button.type='button';button.className='harmonic-key';
    const rank=document.createElement('strong');rank.textContent=n===1?'H1 · Fondamentale':'H'+n;
    const note=document.createElement('span');note.className='partial-note';
    const fraction=document.createElement('small');fraction.className='harmonic-fraction';
    const frequency=document.createElement('small'),tempered=document.createElement('small'),offset=document.createElement('small');frequency.className='harmonic-natural-frequency';tempered.className='harmonic-tempered-frequency';offset.className='harmonic-offset';
    const bar=document.createElement('i');bar.className='harmonic-bar';bar.setAttribute('aria-hidden','true');
    button.append(bar,rank,note,fraction,frequency,tempered,offset);$('harmonicsGrid').append(button);
    harmonicButtons.push({button,note,fraction,frequency,tempered,offset});
    button.addEventListener('click',()=>selectHarmonic(n));
  }
  $('harmonicsPlay').addEventListener('click',()=>{if(playing&&seriesEngaged)stop();else void startSeries();});
  for(const [id,mode] of [['harmonicsSolo','solo'],['harmonicsSum','sum']])$(id).addEventListener('click',()=>{
    seriesMode=mode;
    if(mode==='solo'&&selectedHarmonics.size!==1){const first=[...selectedHarmonics].sort((a,b)=>a-b)[0]||1;selectedHarmonics.clear();selectedHarmonics.add(first);}
    updateAudio();renderSeries();
  });
  $('harmonicsProfile').addEventListener('change',e=>{seriesProfile=e.target.value;updateAudio();renderSeries();});
  $('harmonicsTuning').addEventListener('change',e=>{seriesTuning=e.target.value;updateAudio();renderSeries();});
  for(const [id,tuning] of [['harmonicsNatural','natural'],['harmonicsTempered','equal']])$(id).addEventListener('click',()=>{seriesTuning=tuning;updateAudio();renderSeries();});
  for(const [id,numbers] of [['harmonicsFirst',[1]],['harmonicsEight',[1,2,3,4,5,6,7,8]],['harmonicsOdd',[1,3,5,7,9,11,13,15]],['harmonicsAll',Array.from({length:16},(_,i)=>i+1)]])$(id).addEventListener('click',()=>{
    selectedHarmonics.clear();numbers.forEach(n=>selectedHarmonics.add(n));seriesMode=numbers.length===1?'solo':'sum';void startSeries();
  });
  for(const [id,key,original] of [['harmonicsRoot','root','rootNote'],['harmonicsOctave','octave','octave']])$(id).addEventListener('change',e=>{clearPiano();state[key]=Number(e.target.value);$(original).value=state[key];render();updateAudio();save();});
  function renderFree(){
    const free=state.mode==='free';$('freePanel').hidden=!free;$('intervalSliderArea').hidden=free;
    $('intervalMode').setAttribute('aria-pressed',String(!free));$('freeMode').setAttribute('aria-pressed',String(free));
    $('centsInput').max=maxCents();
    if(!free)return;
    $('freeSlider').max=maxCents();$('freeSlider').value=state.cents;$('freeCents').max=maxCents();
    if(document.activeElement!==$('freeCents'))$('freeCents').value=state.cents.toFixed(2);
    $('freeSelection').textContent=upperNoteName()+' · '+format(state.cents)+' cents · '+format(M.transpose(f0(),state.cents))+' Hz';
    const definitions=[['showJust','just','Juste'],['showEqual','equal','Égal'],['showPyth','pythagorean','Pythagoricien'],['showMeantone','meantone','Mésotonique']];
    definitions.forEach(([key])=>{$(key).checked=state[key];});
    const key=[rootMidi(),state.octaveSpan,...definitions.map(([key])=>state[key])].join(':');
    if(timelineKey!==key){
      timelineKey=key;timelineMarkers=[];$('freeRows').replaceChildren();$('freeTicks').replaceChildren();
      $('freeTimeline').style.minWidth=(state.octaveSpan*820)+'px';
      for(const [flag,system,label] of definitions){
        if(!state[flag])continue;
        const row=document.createElement('div');row.className='free-row '+system+'-row';
        const heading=document.createElement('strong');heading.textContent=label;row.append(heading);
        const track=document.createElement('div');track.className='free-marker-track';row.append(track);
        for(let oct=0;oct<state.octaveSpan;oct++)for(const base of M.intervals){
          if(base.id==='h7'||(base.semitones===12&&oct<state.octaveSpan-1))continue;
          const target=oct*1200+(system==='just'?base.pure:M.tunedInterval(base,system).equal);
          const button=document.createElement('button');button.className='free-note';button.style.left=(100*target/maxCents())+'%';
          const note=M.intervalNoteName(rootMidi(),base,oct);
          const noteLabel=document.createElement('span');noteLabel.textContent=note;button.append(noteLabel);
          const centsLabel=document.createElement('small');centsLabel.textContent=format(target,1);button.append(centsLabel);
          button.setAttribute('aria-label',note+', '+label+', '+format(target)+' cents');
          button.addEventListener('click',()=>{state.interval=base.id;state.refOctave=oct;state.system=system==='just'?'equal':system;$('interval').value=base.id;$('tuningSystem').value=state.system;setCents(target,{preserveReference:true});});
          track.append(button);timelineMarkers.push({button,target});
        }
        $('freeRows').append(row);
      }
      for(let oct=0;oct<=state.octaveSpan;oct++){const tick=document.createElement('span');tick.style.left=(100*oct/state.octaveSpan)+'%';tick.textContent=oct*1200+' ct';$('freeTicks').append(tick);}
    }
    for(const marker of timelineMarkers)marker.button.setAttribute('aria-pressed',String(Math.abs(state.cents-marker.target)<.006));
    renderPiano();
  }

  function render(preserveInput=false){
    const i=interval(),pure=Math.abs(state.cents-i.pure)<.006,equal=Math.abs(state.cents-i.equal)<.006;
    $('intervalTitle').textContent=state.mode==='free'?'Libre · '+i.name:i.name;
    $('resultFormula').textContent=formula(state.cents,i);
    $('liveRatio').textContent=format(2**(state.cents/1200),6);
    $('centsValue').textContent=format(state.cents);
    if(!preserveInput)$('centsInput').value=state.cents.toFixed(2);
    const deviation=state.cents-i.pure;
    $('deviation').textContent=pure?'Les fréquences sont dans le rapport '+i.n+' / '+i.d:(deviation>0?'+':'−')+format(Math.abs(deviation))+' cents par rapport au repère pur';
    $('tuningBadge').textContent=pure&&equal?'Pur = référence':pure?'Repère pur':equal?M.systems[state.system].name:'Réglage libre';
    $('tuningBadge').classList.toggle('pure',pure);
    for(const [key,selected] of [['pure',pure],['equal',equal]]){
      $(key+'Preset').classList.toggle('selected',selected);$(key+'Preset').setAttribute('aria-pressed',String(selected));
      $(key+'Name').textContent=i[key+'Name'];$(key+'Cents').textContent=format(i[key]);
    }
    $('pureRatio').textContent=i.n+' / '+i.d;
    $('referenceCardLabel').textContent=M.systems[state.system].name;
    $('referenceCardMeta').textContent=M.systems[state.system].detail;
    $('referenceMarkerLabel').textContent=M.systems[state.system].marker;
    $('systemDescription').textContent=M.systems[state.system].description;
    $('droneNote').textContent=M.noteName(rootMidi());
    const nearest=Math.round(state.cents/100),offset=state.cents-nearest*100;
    $('upperNote').textContent=upperNoteName()+(Math.abs(offset)>.05?' '+(offset>0?'+':'−')+format(Math.abs(offset),1)+' ct':'');
    $('droneHz').textContent=format(f0())+' Hz';$('upperHz').textContent=format(M.transpose(f0(),state.cents))+' Hz';
    for(const key of voiceKeys){
      const muted=!state[key+'Enabled'];
      const name=key==='drone'?'le bourdon':key==='upper'?'la deuxième note':'la troisième note';
      $(key+'Toggle').setAttribute('aria-pressed',String(muted));
      $(key+'Toggle').setAttribute('aria-label',(muted?'Rétablir ':'Couper ')+name);
      $(key+'Toggle').title=(muted?'Rétablir ':'Couper ')+name;
      $(key+'Toggle').classList.toggle('muted',muted);
      $(key+'VolumeText').textContent=state[key+'Volume']+' %';
    }
    $('masterVolumeText').textContent=state.masterVolume+' %';
    $('zoomFine').setAttribute('aria-pressed',String(state.zoom==='fine'));
    $('zoomFull').setAttribute('aria-pressed',String(state.zoom==='full'));
    const anchor=rangeAnchor??i.semitones*100;
    let min=state.zoom==='full'?0:Math.max(0,Math.min(1100,anchor-50));
    let max=state.zoom==='full'?1200:min+100;
    if(state.cents<min||state.cents>max){rangeAnchor=state.cents;min=Math.max(0,Math.min(1100,state.cents-50));max=min+100;}
    $('centsSlider').min=min;$('centsSlider').max=max;$('centsSlider').value=state.cents;
    $('centsSlider').setAttribute('aria-valuetext',format(state.cents)+' cents');
    $('rangeMin').textContent=format(min,0);$('rangeMid').textContent=format((min+max)/2,0)+' cents';$('rangeMax').textContent=format(max,0);
    for(const key of ['pure','equal']){const position=(i[key]-min)/(max-min)*100;$(key+'Marker').style.left=position+'%';$(key+'Marker').hidden=position<0||position>100;}
    $('tuningTrack').classList.toggle('close-markers',Math.abs(i.pure-i.equal)/(max-min)<.14);
    if(!compareTimer)$('compareLabel').textContent='Alterner pur / '+M.systems[state.system].short;
    $('compare').disabled=Math.abs(i.pure-i.equal)<.001;
    if($('compare').disabled)$('compareHint').textContent='Ces deux repères coïncident';
    renderFree();renderThird();renderRatios();renderTransport();
  }

  $('tuningSystem').addEventListener('change',e=>{clearPiano(true);stopCompare();state.system=e.target.value;state.pianoSystem=state.system;rangeAnchor=null;state.cents=interval().equal;state.thirdCents=thirdInterval().equal;render();updateAudio();stopCompare();save();});
  function revealPiano(){
    if(state.mode!=='free'){
      clearPiano(true);stopCompare();state.mode='free';selectNearestReference();render();updateAudio();save();
    }
    requestAnimationFrame(()=>{$('piano').scrollIntoView({block:'start',behavior:'auto'});$('pianoTitle').focus({preventScroll:true});});
  }
  $('openPiano').addEventListener('click',e=>{
    e.preventDefault();
    if(window.location.hash!=='#piano')window.location.hash='piano';
    revealPiano();
  });
  function revealHarmonics(){requestAnimationFrame(()=>{$('harmoniques').scrollIntoView({block:'start',behavior:'auto'});$('harmonicsTitle').focus({preventScroll:true});});}
  $('openHarmonics').addEventListener('click',e=>{e.preventDefault();if(window.location.hash!=='#harmoniques')window.location.hash='harmoniques';revealHarmonics();});
  function revealLinkedSection(){if(window.location.hash==='#piano')revealPiano();else if(window.location.hash==='#harmoniques')revealHarmonics();}
  window.addEventListener('hashchange',revealLinkedSection);
  window.addEventListener('pageshow',revealLinkedSection);
  for(const [id,mode] of [['intervalMode','interval'],['freeMode','free']])$(id).addEventListener('click',()=>{clearPiano(true);stopCompare();state.mode=mode;state.refOctave=0;if(mode==='interval')state.cents=interval().equal;else selectNearestReference();render();updateAudio();save();});
  $('freeOctaves').addEventListener('change',e=>{clearPiano();state.octaveSpan=Number(e.target.value);state.cents=Math.min(state.cents,maxCents());selectNearestReference();render();updateAudio();save();});
  $('freeSlider').addEventListener('input',e=>setCents(Number(e.target.value)));
  $('freeCents').addEventListener('input',e=>{if(e.target.value)setCents(Number(e.target.value));});
  $('freeCents').addEventListener('change',()=>{$('freeCents').value=state.cents.toFixed(2);});
  for(const key of ['showJust','showEqual','showPyth','showMeantone'])$(key).addEventListener('change',e=>{state[key]=e.target.checked;renderFree();save();});
  $('pianoSystem').addEventListener('change',e=>{state.pianoSystem=e.target.value;if(pianoEngaged)selectPianoPitch(lastPianoSemi);else renderPiano();updateAudio();save();});
  $('pianoTimbre').addEventListener('change',async e=>{
    state.pianoSound=e.target.value==='sampled'?'sampled':'synth';
    if(state.pianoSound==='synth'){state.upperTimbre=e.target.value;$('upperTimbre').value=state.upperTimbre;$('pianoSoundStatus').textContent='Son continu : les notes durent tant qu’elles sont maintenues.';}
    updateAudio();render();save();
    if(state.pianoSound==='sampled'){try{await initAudio();await loadPianoSamples();updateAudio();}catch{$('pianoSoundStatus').textContent='Cliquez sur Écouter pour activer le son, puis réessayez.';}}
  });
  function releaseScreenKeys(){for(const source of [...heldNotes.keys()])if(!source.startsWith('midi:'))pianoUp(source);}
  function setPianoOctave(value){releaseScreenKeys();state.pianoOctave=Math.max(1,Math.min(6,value));renderPiano();updateAudio();renderTransport();save();}
  $('pianoOctave').addEventListener('change',e=>setPianoOctave(Number(e.target.value)));
  $('pianoOctaveDown').addEventListener('click',()=>setPianoOctave(state.pianoOctave-1));
  $('pianoOctaveUp').addEventListener('click',()=>setPianoOctave(state.pianoOctave+1));
  $('pianoLayout').addEventListener('change',e=>{releaseScreenKeys();state.pianoLayout=e.target.value;renderPiano();save();});
  $('pianoDrone').addEventListener('change',e=>{state.pianoDrone=e.target.checked;updateAudio();renderPianoState();renderTransport();save();});
  $('pianoHold').addEventListener('change',e=>{state.pianoHold=e.target.checked;if(!state.pianoHold)for(const [source,note] of sustainedNotes)if(note.channel===null||!midiPedals.has(note.channel))sustainedNotes.delete(source);updateAudio();renderPianoState();renderTransport();save();});
  $('pianoPan').addEventListener('input',e=>{const scroller=$('pianoKeys').parentElement;scroller.scrollLeft=Number(e.target.value)/100*Math.max(0,scroller.scrollWidth-scroller.clientWidth);});
  $('pianoKeys').parentElement.addEventListener('scroll',()=>{const scroller=$('pianoKeys').parentElement;$('pianoPan').value=100*scroller.scrollLeft/Math.max(1,scroller.scrollWidth-scroller.clientWidth);});
  let pianoExpanded=false;
  function expandPiano(value){pianoExpanded=value;$('piano').classList.toggle('piano-expanded',value);document.body.classList.toggle('piano-is-expanded',value);$('pianoExpand').textContent=value?'Réduire le piano':'Agrandir le piano';$('pianoExpand').setAttribute('aria-pressed',String(value));}
  $('pianoExpand').addEventListener('click',()=>expandPiano(!pianoExpanded));
  $('pianoRelease').addEventListener('click',()=>{clearPiano();updateAudio();renderPianoState();renderTransport();});
  for(const [id,mode] of [['waveCyclesMode','cycles'],['waveBeatsMode','beats']])$(id).addEventListener('click',()=>{state.waveMode=mode;renderVisualInfo();save();});
  function setWaveCycles(value){state.waveCycles=value;$('waveCycles').value=value;renderVisualInfo();save();}
  $('waveCycles').addEventListener('change',e=>setWaveCycles(Number(e.target.value)));
  $('waveWiden').addEventListener('click',()=>setWaveCycles(Math.max(2,state.waveCycles/2)));
  $('waveTighten').addEventListener('click',()=>setWaveCycles(Math.min(32,state.waveCycles*2)));
  $('beatSpeed').addEventListener('change',e=>{state.beatSpeed=e.target.value;renderVisualInfo();save();});
  for(const [id,view] of [['viewEnvelope','envelope'],['viewPhase','phase'],['viewLissajous','lissajous']])$(id).addEventListener('click',()=>{state.scienceView=view;renderVisualInfo();save();});
  $('rootNote').addEventListener('change',e=>{clearPiano();state.root=Number(e.target.value);render();updateAudio();save();});
  $('octave').addEventListener('change',e=>{clearPiano();state.octave=Number(e.target.value);render();updateAudio();save();});
  $('interval').addEventListener('change',e=>{stopCompare();state.interval=e.target.value;state.refOctave=0;rangeAnchor=null;setCents(interval().equal);});
  $('reference').addEventListener('change',e=>{const value=Number(e.target.value);state.reference=e.target.value&&Number.isFinite(value)?Math.max(400,Math.min(480,value)):440;e.target.value=state.reference;render();updateAudio();save();});
  for(const key of voiceKeys){
    $(key+'Timbre').addEventListener('change',e=>{state[key+'Timbre']=e.target.value;updateAudio();renderRatios();if(state.mode==='free')renderPiano();save();});
    $(key+'Toggle').addEventListener('click',()=>{state[key+'Enabled']=!state[key+'Enabled'];render();updateAudio();save();});
  }
  for(const key of ['drone','upper','third','master'])$(key+'Volume').addEventListener('input',e=>{state[key+'Volume']=Number(e.target.value);render();updateAudio();save();});
  $('centsSlider').addEventListener('input',e=>setCents(Number(e.target.value)));
  $('centsInput').addEventListener('focus',stopCompare);
  $('centsInput').addEventListener('input',e=>{stopCompare();const value=Number(e.target.value);if(e.target.value&&Number.isFinite(value))setCents(value,{preserveInput:true});});
  $('centsInput').addEventListener('change',e=>{const value=Number(e.target.value);if(e.target.value&&Number.isFinite(value))setCents(value);else render();});
  $('centsInput').addEventListener('keydown',e=>{if(e.key==='Enter'){render();e.target.blur();}});
  $('stepDown').addEventListener('click',e=>setCents(state.cents-(e.shiftKey?.1:1)));
  $('stepUp').addEventListener('click',e=>setCents(state.cents+(e.shiftKey?.1:1)));
  for(const key of ['pure','equal'])$(key+'Preset').addEventListener('click',()=>{rangeAnchor=null;setCents(interval()[key],{preserveReference:true});});
  for(const key of ['fine','full'])$('zoom'+(key==='fine'?'Fine':'Full')).addEventListener('click',()=>{state.zoom=key;rangeAnchor=key==='fine'?state.cents:null;render();save();});
  $('play').addEventListener('click',()=>playing?stop():start());
  $('compare').addEventListener('click',async()=>{
    if(compareTimer){stopCompare();return;}
    if(Math.abs(interval().pure-interval().equal)<.001)return;
    if(!playing && !(await start()))return;
    if(compareTimer)return;
    rangeAnchor=null;
    let usePure=true;
    const swap=()=>{
      setCents(interval()[usePure?'pure':'equal'],{manual:false});
      $('compareHint').textContent=usePure?'Écoute du repère pur':'Écoute : '+M.systems[state.system].name;
      usePure=!usePure;
    };
    swap();compareTimer=setInterval(swap,2500);
    $('compare').setAttribute('aria-pressed','true');$('compareLabel').textContent='Arrêter l’alternance';
  });
  $('addThird').addEventListener('click',()=>{state.thirdAdded=true;state.thirdEnabled=true;$('advancedVoices').open=false;render();updateAudio();save();});
  $('removeThird').addEventListener('click',()=>{state.thirdAdded=false;render();updateAudio();save();$('advancedVoices').open=true;$('addThird').focus();});
  $('thirdInterval').addEventListener('change',e=>{state.thirdInterval=e.target.value;state.thirdCents=thirdInterval().equal;render();updateAudio();save();});
  function setThird(value){if(!Number.isFinite(value))return;state.thirdCents=Math.max(0,Math.min(1200,value));render();updateAudio();save();}
  $('thirdCentsSlider').addEventListener('input',e=>setThird(Number(e.target.value)));
  $('thirdCentsInput').addEventListener('input',e=>{if(e.target.value)setThird(Number(e.target.value));});
  $('thirdCentsInput').addEventListener('change',()=>{$('thirdCentsInput').value=state.thirdCents.toFixed(2);});
  $('thirdCentsInput').addEventListener('keydown',e=>{if(e.key==='Enter'){$('thirdCentsInput').value=state.thirdCents.toFixed(2);e.target.blur();}});
  $('thirdPure').addEventListener('click',()=>setThird(thirdInterval().pure));
  $('thirdEqual').addEventListener('click',()=>setThird(thirdInterval().equal));
  document.addEventListener('keydown',e=>{
    if(state.mode==='free'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!$('helpDialog').open&&!e.target.isContentEditable&&!/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)){
      const index=pianoLabels[state.pianoLayout].indexOf(e.key.toUpperCase());
      if(index>=0){e.preventDefault();if(!e.repeat)pianoDown('computer:'+e.code,pianoStart()+index);return;}
    }
    if(e.code==='Space'&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!$('helpDialog').open&&!/^(INPUT|SELECT|BUTTON|TEXTAREA|A)$/.test(e.target.tagName)){
      e.preventDefault();playing?stop():start();
    }
    if(e.key==='Escape'){stop();if(pianoExpanded)expandPiano(false);}
  });
  document.addEventListener('keyup',e=>pianoUp('computer:'+e.code));
  const releaseKeyboard=()=>{if(pianoEngaged)releaseScreenKeys();};
  window.addEventListener('blur',releaseKeyboard);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseKeyboard();});
  for(const id of ['helpOpen','learnMore'])$(id).addEventListener('click',()=>$('helpDialog').showModal());
  $('helpClose').addEventListener('click',()=>$('helpDialog').close());
  $('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  window.addEventListener('pagehide',()=>{stop();if(ctx)ctx.suspend().catch(()=>{});});

  const canvas=$('scope'),pen=canvas.getContext('2d');
  let width=0,height=160,lastFrame=0,lastTime=0,beatPhase=0,playhead=0;
  function resize(){width=canvas.clientWidth;height=canvas.clientHeight;const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;pen.setTransform(dpr,0,0,dpr,0,0);}
  new ResizeObserver(resize).observe(canvas);
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  function draw(time){
    requestAnimationFrame(draw);if(time-lastFrame<(reducedMotion.matches?250:16))return;
    const dt=lastTime?Math.min((time-lastTime)/1000,.1):0;lastTime=time;lastFrame=time;
    const v=visualModel(),{r,display}=v;
    const canPulse=playing&&v.present&&v.audible&&!v.beyond&&!display.tooFast&&!reducedMotion.matches;
    if(playing&&!reducedMotion.matches)playhead=(playhead+dt/4.5)%1;
    if(r.gap<1e-8)beatPhase=0;
    else if(playing&&v.audible&&!display.tooFast&&!reducedMotion.matches)beatPhase=(beatPhase+dt*display.hz*Math.sign(r.harmonicUpper-r.harmonicBase))%v.i.d;
    const phaseModel=M.beatPhaseModel(beatPhase),glow=canPulse?phaseModel.power**3:.08;
    $('beatLamp').style.setProperty('--glow',String(glow));$('beatScience').style.setProperty('--glow',String(glow));
    const phaseX=60+42*Math.cos(phaseModel.angle),phaseY=60-42*Math.sin(phaseModel.angle);
    $('phaseDot').setAttribute('cx',phaseX);$('phaseDot').setAttribute('cy',phaseY);
    $('phaseArm').setAttribute('x2',phaseX);$('phaseArm').setAttribute('y2',phaseY);
    const envelopeX=12+336*phaseModel.phase,envelopeY=90-68*phaseModel.envelope;
    $('envelopeCursor').setAttribute('x1',envelopeX);$('envelopeCursor').setAttribute('x2',envelopeX);
    $('envelopeDot').setAttribute('cx',envelopeX);$('envelopeDot').setAttribute('cy',envelopeY);
    $('phaseState').textContent=!playing?'En pause':!v.present||v.beyond?'Paire théorique':!v.audible?'Paire non jouée':reducedMotion.matches?'Animation réduite':display.tooFast?'Choisir le ralenti':r.gap<1e-8?'Cette paire est stable':phaseModel.aligned?'Maximum · en phase':phaseModel.opposed?'Minimum · opposition':'Entre deux maxima';
    $('phaseState').classList.toggle('at-maximum',canPulse&&phaseModel.aligned);
    if(state.scienceView==='lissajous'){
      const samples=Math.min(2400,Math.max(480,Math.ceil(Math.max(r.baseCycles,r.upperCycles)*48)));
      let trace='';
      for(let step=0;step<=samples;step++){
        const p=M.lissajousPoint(r.baseCycles,r.upperCycles,step/samples,beatPhase/v.i.d);
        trace+=(step?' L':'M')+(180+140*p.x).toFixed(2)+' '+(108-84*p.y).toFixed(2);
      }
      $('lissajousPath').setAttribute('d',trace);
      const p=M.lissajousPoint(r.baseCycles,r.upperCycles,playhead,beatPhase/v.i.d);
      $('lissajousDot').setAttribute('cx',180+140*p.x);$('lissajousDot').setAttribute('cy',108-84*p.y);
    }
    pen.clearRect(0,0,width,height);
    const left=7,right=Math.max(8,width-7),span=right-left,center=(height-16)/2,amp=(height-36)*.42;
    pen.strokeStyle='#e0e7f1';pen.lineWidth=1;
    for(let step=0;step<=4;step++){const x=left+span*step/4;pen.beginPath();pen.moveTo(x,4);pen.lineTo(x,height-16);pen.stroke();}
    pen.beginPath();pen.moveTo(left,center);pen.lineTo(right,center);pen.stroke();
    if(!v.beats){
      const cursor=left+span*playhead;
      pen.fillStyle='#29486d07';pen.fillRect(left,4,cursor-left,height-20);
      pen.strokeStyle='#536d8e66';pen.setLineDash([3,4]);pen.beginPath();pen.moveTo(cursor,4);pen.lineTo(cursor,height-16);pen.stroke();pen.setLineDash([]);
    }
    for(const row of v.rows){
      const phase=v.beats&&row.key==='upper'?beatPhase:0;
      pen.globalAlpha=state[row.key+'Enabled']?.85:.2;pen.strokeStyle=row.color;pen.lineWidth=1.8;pen.beginPath();
      for(let x=0;x<=span;x++){const y=center-amp*Math.sin(2*Math.PI*(row.cycles*x/span+phase));x===0?pen.moveTo(left+x,y):pen.lineTo(left+x,y);}
      pen.stroke();
      if(!v.beats){
        const x=left+span*playhead,y=center-amp*Math.sin(2*Math.PI*row.cycles*playhead);
        pen.beginPath();pen.arc(x,y,9,0,Math.PI*2);pen.fillStyle=row.color+'22';pen.fill();
        pen.beginPath();pen.arc(x,y,row.key==='drone'?6:4.5,0,Math.PI*2);pen.fillStyle=row.color;pen.fill();pen.strokeStyle='#ffffff';pen.lineWidth=1.5;pen.stroke();
      }
      pen.globalAlpha=1;
    }
    pen.font='9px Arial';pen.fillStyle='#748097';pen.textAlign='left';pen.fillText('0 ms',left,height-2);pen.textAlign='right';pen.fillText(format(v.duration*1000)+' ms',right,height-2);
  }
  render();resize();requestAnimationFrame(draw);
  if(window.location.hash==='#piano')revealPiano();
  else if(window.location.hash==='#harmoniques')revealHarmonics();
})();
