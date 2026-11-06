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
    just:{name:'Juste · limite 5',short:'juste',marker:'Juste',detail:'Rapports rationnels',description:'Une grille de rapports purs depuis la note de départ : tierce majeure 5/4, quinte 3/2. Les intervalles entre les autres degrés ne sont pas tous purs. La septième harmonique 7/4 reste un repère distinct.'},
    pythagorean:{name:'Accord pythagoricien',short:'pythagoricien',marker:'Pythag.',detail:'Quinte 3/2',description:'Les intervalles sont construits avec des quintes pures de rapport 3/2. La tierce majeure vaut 81/64, soit environ 407,82 cents.'},
    meantone:{name:'Mésotonique ¼ comma',short:'mésotonique',marker:'Méso.',detail:'Quinte ⁴√5',description:'Chaque quinte mesure environ 696,58 cents. Quatre quintes, ramenées dans l’octave, donnent une tierce majeure pure de rapport 5/4.'}
  };
  // Historical 12-note tables from the Huygens–Fokker Scala archive, v94.
  // Ratio entries remain exact; decimal entries retain the archive precision.
  const historical={
    werckmeister3:{name:'Werckmeister III',file:'werck3.scl',description:'Tempérament circulant de Werckmeister (1681). Les tierces changent de taille selon les degrés ; la tierce depuis la note de départ mesure 390,225 cents.',steps:['256/243',192.18,'32/27',390.225,'4/3','1024/729',696.09,'128/81',888.26999,'16/9',1092.18,'2/1']},
    werckmeister4:{name:'Werckmeister IV',file:'werck4.scl',description:'Tempérament de Werckmeister (1691), avec des intervalles inégaux plus contrastés. La quinte depuis la note de départ mesure environ 694,135 cents.',steps:[82.40499,196.09,'32/27',392.18,'4/3','1024/729',694.135,784.35999,890.225,1003.91,'4096/2187','2/1']},
    kirnberger3:{name:'Kirnberger III · Forkel 1779',file:'kirnberger.scl',description:'Version de la lettre à Forkel de 1779 : tierce majeure 5/4 et quintes tempérées sur les premiers degrés. D’autres variantes portent aussi le nom Kirnberger III.',steps:['256/243',193.15686,'32/27','5/4','4/3','45/32',696.57843,'128/81',889.73529,'16/9','15/8','2/1']},
    vallotti:{name:'Vallotti',file:'vallotti.scl',description:'Version Tartini–Vallotti (1754) de l’archive Scala. Les tierces et les quintes sont inégales ; la tierce depuis la note de départ mesure environ 392,18 cents.',steps:[94.135,196.09,298.045,392.18,501.955,592.18,698.045,796.09,894.135,1000,1090.225,'2/1']},
    young2:{name:'Young II · 1799',file:'young2.scl',description:'Deuxième tempérament de Thomas Young (1799). Proche de Vallotti, avec des différences notamment sur la quarte et la septième majeure.',steps:[94.135,196.09,298.045,392.18,500,592.18,698.045,796.09,894.135,1000,1092.18,'2/1']},
    kellner:{name:'Kellner',file:'kellner.scl',description:'Proposition de Herbert Anton Kellner : cinq quintes réduites d’un cinquième de comma pythagoricien et sept quintes pures. Ce choix ne constitue pas une certitude sur l’accordage de Bach.',steps:['256/243',194.526,'32/27',389.052,'4/3','1024/729',697.263,'128/81',891.789,'16/9',1091.007,'2/1']}
  };
  for(const [id,scale] of Object.entries(historical))systems[id]={...scale,short:scale.name.split(' · ')[0],marker:scale.name.split(' · ')[0],detail:'Table historique · 12 notes'};
  for(const parts of [5,6])systems['meantone'+parts]={name:'Mésotonique · 1/'+parts+' de comma',short:'méso. 1/'+parts,marker:'Méso. 1/'+parts,detail:'Comma syntonique / '+parts,commaParts:parts,description:'Quintes pures réduites de 1/'+parts+' du comma syntonique (81/80). La chaîne retient Ré♭, Mi♭, Fa♯, La♭ et Si♭ ; les enharmonies ne sont pas interchangeables.'};
  const fifthSteps=[0,-5,2,-3,4,-1,6,1,-4,3,-2,5,0];
  const pythRatios=[[1,1],[256,243],[9,8],[32,27],[81,64],[4,3],[729,512],[3,2],[128,81],[27,16],[16,9],[243,128],[2,1]];
  function tunedInterval(i,system='equal'){
    let cents=i.equal,expression='2^('+i.semitones+'/12)',referenceFormula=i.semitones+' × 100 =';
    if(system==='just'){
      cents=i.pure;expression=i.n+'/'+i.d;referenceFormula='1 200 × log₂('+expression+') ≈';
    }else if(historical[system]){
      const value=i.semitones===0?'1/1':historical[system].steps[i.semitones-1];
      if(typeof value==='string'){const [n,d]=value.split('/').map(Number);cents=1200*Math.log2(n/d);expression=value;}
      else{cents=value;expression='2^('+value+'/1200)';}
      referenceFormula='1 200 × log₂('+expression+') ≈';
    }else if(systems[system].commaParts){
      const parts=systems[system].commaParts,k=fifthSteps[i.semitones],fifth=1200*Math.log2(3/2)-1200*Math.log2(81/80)/parts;
      const octaves=i.semitones===12?1:-Math.floor(k*fifth/1200);
      cents=k*fifth+octaves*1200;expression=k===0?(i.semitones===12?'2':'1'):'((3/2) × (80/81)^(1/'+parts+'))^('+k+') × 2^('+octaves+')';
      referenceFormula='1 200 × log₂('+expression+') ≈';
    }else if(system==='pythagorean'){
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
