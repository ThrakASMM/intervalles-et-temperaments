"""Reproduce the measured presets from the Iowa AIFF excerpts.
Usage: python analyse-harmonic-references.py /path/to/harmonic-analysis
Requires NumPy, SciPy and ffmpeg. No network access; sources are in sources.json.
"""
import hashlib,json,subprocess,sys
from pathlib import Path
import numpy as np
from scipy.ndimage import binary_closing
from scipy.io import wavfile
from scipy.optimize import minimize_scalar
BASE=Path(sys.argv[1]);OUT=Path(__file__).parent;FS=44100
CONFIG={
 'trumpet':dict(name='Trompette',performer='Aren Van Houzen',technique='mezzo-forte, sans vibrato',index=0,page='MISBbtrumpet.html'),
 'violin':dict(name='Violon à l’archet',performer='Josue Jean-Francois',technique='mezzo-forte, sur la corde de sol',index=1,page='MISviolin.html'),
 'flute':dict(name='Flûte',performer='Sonja Feig',technique='mezzo-forte, sans vibrato',index=1,page='MISflute.html'),
 'clarinet':dict(name='Clarinette',performer='Christine Bellomy',technique='mezzo-forte',index=0,page='MISBbclarinet.html')}

def frame_spectrum(x,expected):
 window=np.hanning(len(x));size=131072
 magnitude=np.abs(np.fft.rfft((x-x.mean())*window,n=size))*2/window.sum()
 freqs=np.fft.rfftfreq(size,1/FS)
 # Fit a common fundamental to the harmonic comb, allowing natural pitch drift.
 def strength(f):
  return sum(np.interp(f*n,freqs,magnitude)/np.sqrt(n) for n in range(1,9))
 candidates=np.arange(expected*.97,expected*1.03,.1)
 f=candidates[np.argmax([strength(f) for f in candidates])]
 f=minimize_scalar(lambda v:-strength(v),bounds=(f-.15,f+.15),method='bounded').x
 amps=[]
 for n in range(1,17):
  radius=max(9,n*f*.003)
  band=(freqs>n*f-radius)&(freqs<n*f+radius)
  amps.append(magnitude[band].max())
 return f,np.array(amps)

def analyse(key,cfg):
 raw=BASE/(key+'.aiff')
 decoded=subprocess.run(['ffmpeg','-v','error','-i',str(raw),'-f','f32le','-ac','1','-ar',str(FS),'-'],capture_output=True,check=True).stdout
 x=np.frombuffer(decoded,dtype='<f4').astype(float)
 block=441;rms=np.sqrt(np.mean(x[:len(x)//block*block].reshape(-1,block)**2,axis=1))
 mask=binary_closing(rms>rms.max()*.035,iterations=8)
 starts=np.flatnonzero(np.diff(np.r_[0,mask.astype(int)])==1)*.01
 ends=np.flatnonzero(np.diff(np.r_[mask.astype(int),0])==-1)*.01
 notes=[(a,b) for a,b in zip(starts,ends) if b-a>.6]
 a,b=notes[cfg['index']];b=min(b,a+2.1);assert b<len(x)/FS-.2,(key,'note truncated',a,b,len(x)/FS)
 begin=max(0,a-.09);end=min(len(x)/FS,b+.13)
 clip=x[round(begin*FS):round(end*FS)].copy()
 # Preserve dynamics, but use the same safe peak level for all packaged files.
 clip*=.85/max(abs(clip));fade=round(.01*FS);clip[:fade]*=np.linspace(0,1,fade);clip[-fade:]*=np.linspace(1,0,fade)
 analysis_start=(a-begin)+.3*(b-a);analysis_end=(a-begin)+.75*(b-a)
 expected=440*2**((60-69)/12)
 rows=[frame_spectrum(clip[pos:pos+8192],expected) for pos in range(round(analysis_start*FS),round(analysis_end*FS)-8192,2205)]
 assert len(rows)>=5,(key,len(rows))
 f0=float(np.median([row[0] for row in rows]));amps=np.sqrt(np.mean(np.array([row[1] for row in rows])**2,axis=0))
 levels=np.round(amps/amps.max(),3)
 steady=clip[round(analysis_start*FS):round(analysis_end*FS)];steady_rms=float(np.sqrt(np.mean(steady**2)))
 synth_rms=.35*np.sqrt(np.sum(levels**2)/2)/max(1,sum(levels))
 filename='reference-'+key+'.wav';wavfile.write(OUT/filename,FS,np.round(clip*32767).astype(np.int16))
 measured=dict(name=cfg['name'],note='Do₄',midi=60,technique=cfg['technique'],performer=cfg['performer'],page='https://theremin.music.uiowa.edu/'+cfg['page'],file=filename,
  fundamental=round(f0,6),levels=levels.tolist(),playbackGain=round(float(synth_rms/steady_rms),6),
  duration=round(len(clip)/FS,6),analysisStart=round(analysis_start,3),analysisEnd=round(analysis_end,3),sourceStart=round(begin,3),sourceEnd=round(end,3),
  steadyRms=round(steady_rms,8),frameCount=len(rows),fundamentalRange=[round(min(row[0] for row in rows),3),round(max(row[0] for row in rows),3)],
  sourceExcerptSha256=hashlib.sha256(raw.read_bytes()).hexdigest(),wavSha256=hashlib.sha256((OUT/filename).read_bytes()).hexdigest())
 assert abs(1200*np.log2(f0/expected))<40,(key,'unexpected pitch',f0)
 assert 0<measured['playbackGain']<1
 print(key,json.dumps({k:measured[k] for k in ['fundamental','duration','analysisStart','analysisEnd','levels','playbackGain','fundamentalRange']}),flush=True)
 return measured

if __name__=='__main__':
 refs={key:analyse(key,cfg) for key,cfg in CONFIG.items()}
 sources=json.loads((BASE/'sources.json').read_text())
 for source in sources:refs[source['id']]['source']=source['source']
 payload=json.dumps(refs,ensure_ascii=False,indent=2)
 (OUT/'harmonic-references.js').write_text('/* Measured from Iowa recordings; see HARMONIC-REFERENCES.md. */\nglobalThis.HarmonicReferences = '+payload+';\n')
 (BASE/'measured.json').write_text(payload+'\n')
