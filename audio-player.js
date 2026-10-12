(function (w) {
  'use strict';
  let current=null,serial=0,timer=null;
  const normalize=s=>String(s).normalize('NFC').replace(/\s+/g,' ').trim();
  function stop(){serial++;if(timer)clearTimeout(timer);timer=null;if(current){current.onerror=null;current.onended=null;current.onplaying=null;current.pause();current.removeAttribute('src');current.load();current=null;}try{w.AndroidTTS?.stop?.();}catch{}try{w.speechSynthesis?.cancel();}catch{}}
  function native(text,rate,status){
    if(w.AndroidTTS?.speak){w.AndroidTTS.setSpeechRate?.(rate);w.AndroidTTS.speak(text);status?.('Audio nativo de Android.');return;}
    if(!w.speechSynthesis){status?.('Audio no disponible en este dispositivo.');return;}
    const u=new w.SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=rate;
    u.onend=()=>status?.('Audio terminado.');u.onerror=()=>status?.('No se pudo reproducir el audio nativo.');w.speechSynthesis.speak(u);if(w.speechSynthesis.paused)w.speechSynthesis.resume();
  }
  function speak(text,rate=0.9,status){
    stop();const token=serial;if(!text||!String(text).trim())return;
    const entry=w.STOIC_AUDIO_INDEX?.entries?.[normalize(text)];let usedFallback=false;
    function fallback(){if(token!==serial||usedFallback)return;usedFallback=true;if(timer)clearTimeout(timer);timer=null;if(current){current.onerror=null;current.onplaying=null;current.pause();current=null;}try{native(text,rate,status);}catch{status?.('No se pudo reproducir el audio.');}}
    if(!entry||!/^audio\/[a-f0-9]{64}\.mp3$/.test(entry.file)){fallback();return;}
    try{const audio=new w.Audio(entry.file);current=audio;audio.playbackRate=rate;audio.preservesPitch=true;
      audio.onplaying=()=>{if(token!==serial)return;if(timer)clearTimeout(timer);timer=null;status?.('NY sofisticado · audio guardado.');};
      audio.onended=()=>{if(token===serial){current=null;status?.('Audio terminado.');}};
      audio.onerror=fallback;timer=setTimeout(fallback,10000);const playing=audio.play();if(playing?.catch)playing.catch(fallback);
    }catch{fallback();}
  }
  function setRate(rate){if(current)current.playbackRate=Math.max(0.6,Math.min(1.4,rate));}
  async function downloadOffline(status){
    if(w.AndroidTTS){status('Los audios disponibles ya están incluidos en esta app.');return;}
    try{
      if(!navigator.serviceWorker)throw Error();
      const reg=await navigator.serviceWorker.ready;const target=reg.active;if(!target)throw Error();
      const channel=new MessageChannel();channel.port1.onmessage=e=>{const m=e.data;if(m.type==='progress')status('Guardando audios: '+m.done+' de '+m.total);else if(m.type==='done'){status('Audios guardados para usar sin conexión.');channel.port1.close();}else if(m.type==='error'){status('La descarga no se completó. Revisa la conexión o el espacio disponible.');channel.port1.close();}};
      status('Preparando descarga…');target.postMessage({type:'CACHE_AUDIO'},[channel.port2]);
    }catch{status('No se pudo preparar la descarga offline.');}
  }
  w.StoicAudio={speak,stop,setRate,downloadOffline};
  w.addEventListener('pagehide',stop);
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
})(window);
