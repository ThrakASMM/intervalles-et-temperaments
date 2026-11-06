/* Musical definitions are independent of the interface and audio device. */
globalThis.IntervalleMusic = (() => {
  const intervals = [
    ['unison','Unisson',0,1,1,'Unisson pur','Unisson tempéré'],
    ['m2','Seconde mineure',1,16,15,'Seconde mineure pure','Seconde mineure tempérée'],
    ['M2','Seconde majeure',2,9,8,'Seconde majeure pure','Seconde majeure tempérée'],
    ['m3','Tierce mineure',3,6,5,'Tierce mineure pure','Tierce mineure tempérée'],
    ['M3','Tierce majeure',4,5,4,'Tierce majeure pure','Tierce majeure tempérée'],
    ['P4','Quarte juste',5,4,3,'Quarte pure','Quarte tempérée'],
    ['TT','Triton · quarte augmentée',6,45,32,'Triton · rapport 45/32','Triton tempéré'],
    ['P5','Quinte juste',7,3,2,'Quinte pure','Quinte tempérée'],
    ['m6','Sixte mineure',8,8,5,'Sixte mineure pure','Sixte mineure tempérée'],
    ['M6','Sixte majeure',9,5,3,'Sixte majeure pure','Sixte majeure tempérée'],
    ['m7','Septième mineure · 9/5',10,9,5,'Septième mineure · 9/5','Septième mineure tempérée'],
    ['h7','Septième harmonique · 7/4',10,7,4,'Septième harmonique · 7/4','Septième mineure tempérée'],
    ['M7','Septième majeure',11,15,8,'Septième majeure pure','Septième majeure tempérée'],
    ['P8','Octave',12,2,1,'Octave pure','Octave tempérée'],
  ].map(([id,name,semitones,n,d,pureName,equalName])=>({id,name,semitones,n,d,pureName,equalName,pure:1200*Math.log2(n/d),equal:semitones*100}));
  const frequency=(midi,reference=440)=>reference*2**((midi-69)/12);
  const transpose=(base,cents)=>base*2**(cents/1200);
  const relationship=(base,cents,i)=>{
    const ratio=2**(cents/1200),second=base*ratio;
    return {ratio,second,duration:i.d/base,baseCycles:i.d,upperCycles:i.d*ratio,
      harmonicBase:i.n*base,harmonicUpper:i.d*second,gap:Math.abs(i.n*base-i.d*second)};
  };
  function beatDisplay(gap,speed='auto'){
    if(gap<1e-8)return {hz:0,scale:1,tooFast:false};
    if(speed==='real')return {hz:gap<=8?gap:0,scale:1,tooFast:gap>8};
    const hz=speed==='slow'?Math.min(gap,.75):(gap>6?2:gap);
    return {hz,scale:hz/gap,tooFast:false};
  }
  // Equal-amplitude phasors: the normalized sum's envelope is |cos(phi/2)|.
  function beatPhaseModel(cycles){
    const phase=((cycles%1)+1)%1,angle=2*Math.PI*phase;
    const power=Math.max(0,Math.min(1,(1+Math.cos(angle))/2));
    return {phase,angle,envelope:Math.sqrt(power),power,aligned:power>.97,opposed:power<.03};
  }
  const lissajousPoint=(baseCycles,upperCycles,position,upperPhase=0)=>({
    x:Math.sin(2*Math.PI*baseCycles*position),
    y:Math.sin(2*Math.PI*(upperCycles*position+upperPhase))
  });
  function extendInterval(i,octaves=0,system='equal'){
    if(!octaves)return i;
    let n=i.n*2**octaves,d=i.d;
    const gcd=(a,b)=>b?gcd(b,a%b):a,g=gcd(n,d);n/=g;d/=g;
    const semitones=i.semitones+12*octaves;
    const expression='('+i.referenceExpression+') × 2^'+octaves;
    return {...i,n,d,semitones,pure:i.pure+1200*octaves,equal:i.equal+1200*octaves,
      name:i.name+' + '+octaves+' oct.',pureName:i.pureName+' + '+octaves+' oct.',equalName:i.equalName+' + '+octaves+' oct.',
      referenceExpression:expression,referenceFormula:system==='equal'?semitones+' × 100 =':'1 200 × log₂('+expression+') ≈'};
  }
  const systems={
    equal:{name:'Tempérament égal',short:'égal',marker:'Égal',detail:'12 demi-tons',description:'L’octave est divisée en 12 demi-tons égaux de 100 cents. Tous les intervalles sont transposables à l’identique.'},
    pythagorean:{name:'Accord pythagoricien',short:'pythagoricien',marker:'Pythag.',detail:'Quinte 3/2',description:'Les intervalles sont construits avec des quintes pures de rapport 3/2. La tierce majeure vaut 81/64, soit environ 407,82 cents.'},
    meantone:{name:'Mésotonique ¼ comma',short:'mésotonique',marker:'Méso.',detail:'Quinte ⁴√5',description:'Chaque quinte mesure environ 696,58 cents. Quatre quintes, ramenées dans l’octave, donnent une tierce majeure pure de rapport 5/4.'}
  };
  const fifthSteps=[0,-5,2,-3,4,-1,6,1,-4,3,-2,5,0];
  const pythRatios=[[1,1],[256,243],[9,8],[32,27],[81,64],[4,3],[729,512],[3,2],[128,81],[27,16],[16,9],[243,128],[2,1]];
  function tunedInterval(i,system='equal'){
    let cents=i.equal,expression='2^('+i.semitones+'/12)',referenceFormula=i.semitones+' × 100 =';
    if(system==='pythagorean'){
      const [n,d]=pythRatios[i.semitones];cents=1200*Math.log2(n/d);expression=n+'/'+d;referenceFormula='1 200 × log₂('+expression+') ≈';
    }else if(system==='meantone'){
      const k=fifthSteps[i.semitones],fifth=1200*Math.log2(5)/4;
      const octaves=i.semitones===12?1:-Math.floor(k*fifth/1200);
      cents=k*fifth+octaves*1200;
      expression=k===0?(i.semitones===12?'2':'1'):k>0?'5^('+k+'/4) / '+2**(-octaves):2**octaves+' / 5^('+(-k)+'/4)';
      if(i.semitones===7)expression='⁴√5';
      if(i.semitones===4)expression='5/4';
      referenceFormula='1 200 × log₂('+expression+') ≈';
    }
    return {...i,equal:cents,equalName:i.name+' · '+systems[system].short,referenceExpression:expression,referenceFormula};
  }
  const timbres={
    sine:[0,1],
    flute:[0,1,.18,.09,.04,.025,.01],
    organ:[0,1,.55,.36,.30,.25,.19,.14,.10,.075,.05,.035,.025],
    strings:[0,...Array.from({length:20},(_,i)=>1/(i+1)**1.05)],
  };
  const names=['Do','Do♯','Ré','Mi♭','Mi','Fa','Fa♯','Sol','La♭','La','Si♭','Si'];
  const subscript=n=>String(n).replace(/\d/g,d=>'₀₁₂₃₄₅₆₇₈₉'[d]);
  const noteName=midi=>names[((midi%12)+12)%12]+subscript(Math.floor(midi/12)-1);
  function intervalNoteName(root,i,octaves=0){
    const letters=['Do','Ré','Mi','Fa','Sol','La','Si'],naturals=[0,2,4,5,7,9,11];
    const rootLetter=[0,0,1,2,2,3,3,4,5,5,6,6][((root%12)+12)%12];
    const steps={unison:0,m2:1,M2:1,m3:2,M3:2,P4:3,TT:3,P5:4,m6:5,M6:5,m7:6,h7:6,M7:6,P8:7};
    const degree=rootLetter+steps[i.id]+7*octaves;
    const octave=Math.floor(root/12)+Math.floor(degree/7),letter=((degree%7)+7)%7;
    const accidental=root+i.semitones+12*octaves-(12*octave+naturals[letter]);
    return letters[letter]+(accidental>0?'♯'.repeat(accidental):'♭'.repeat(-accidental))+subscript(octave-1);
  }
  function keyboardPitch(semitones,system='just'){
    const octaves=semitones===0?0:Math.floor((semitones-1)/12);
    const degree=semitones-12*octaves;
    const base=intervals.find(i=>i.semitones===degree);
    const cents=12*100*octaves+(system==='just'?base.pure:tunedInterval(base,system).equal);
    return {base,octaves,cents};
  }
  function harmonic(root,n,reference=440){
    const cents=1200*Math.log2(n),semitones=Math.round(cents/100);
    return {n,frequency:frequency(root,reference)*n,equalFrequency:frequency(root+semitones,reference),semitones,cents,note:noteName(root+semitones),offset:cents-semitones*100};
  }
  return {intervals,frequency,transpose,timbres,noteName,intervalNoteName,relationship,systems,tunedInterval,beatDisplay,beatPhaseModel,lissajousPoint,extendInterval,keyboardPitch,harmonic};
})();
