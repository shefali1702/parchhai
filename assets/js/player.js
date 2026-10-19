/* =========================================================
   Story player: real waveform peaks from a recording, click-to-seek,
   and only one story playing at a time across the page.
   ========================================================= */
(() => {
  let current = null;

  /* a gentle, repeatable shape for stories that have no audio yet */
  function fake(n = 64, seed = 1) {
    return Array.from({ length: n }, (_, i) => .18 + Math.abs(Math.sin(i * .9 + seed) * Math.cos(i * .23 + seed * 2)) * .82);
  }

  async function peaks(blob, n = 64) {
    if (!blob) return fake(n);
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext, ctx = new Ctx();
      const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
      ctx.close?.();
      const d = audio.getChannelData(0), step = Math.max(1, Math.floor(d.length / n)), out = [];
      for (let i = 0; i < n; i++) {
        let m = 0;
        for (let j = i * step; j < (i + 1) * step && j < d.length; j += 8) m = Math.max(m, Math.abs(d[j]));
        out.push(m);
      }
      const max = Math.max(...out, .01);
      return out.map(v => Math.max(.08, v / max));
    } catch { return fake(n); }
  }

  const bars = (el, pk) => { el.innerHTML = pk.map(v => `<i style="--h:${Math.round(v * 100)}%"></i>`).join(""); };

  function mount({ wave, btn, time, blob, duration = 0, peaks: pk = fake(), onplay, onprogress }) {
    bars(wave, pk);
    const is = [...wave.children];
    let audio = null, url = null;
    const setIcon = playing => { btn.innerHTML = P.icon(playing ? "pause" : "play"); btn.setAttribute("aria-label", P.t(playing ? "c.pause" : "c.play")); };
    const len = () => (audio && isFinite(audio.duration) && audio.duration) || duration || 1;
    const paint = () => {
      const k = audio ? Math.min(1, audio.currentTime / len()) : 0, n = Math.round(k * is.length);
      is.forEach((b, i) => b.classList.toggle("done", i < n));
      if (time) time.textContent = P.fmtTime(audio && audio.currentTime > 0 ? audio.currentTime : duration);
      onprogress?.(k);
      if (audio && !audio.paused) requestAnimationFrame(paint);
    };
    setIcon(false);
    if (time) time.textContent = P.fmtTime(duration);
    if (!blob) { btn.disabled = true; return { stop() {}, destroy() {}, play() {} }; }

    const ensure = () => {
      if (!audio) {
        url = URL.createObjectURL(blob); audio = new Audio(url);
        audio.onplay = () => { setIcon(true); paint(); };
        audio.onpause = () => setIcon(false);
        audio.onended = () => { setIcon(false); audio.currentTime = 0; paint(); };
      }
      return audio;
    };
    const api = {
      play() { if (current && current !== api) current.stop(); current = api; ensure().play(); onplay?.(); },
      stop() { audio?.pause(); },
      toggle() { audio && !audio.paused ? api.stop() : api.play(); },
      destroy() { audio?.pause(); if (url) URL.revokeObjectURL(url); },
    };
    btn.onclick = api.toggle;
    wave.onclick = e => {
      const r = wave.getBoundingClientRect(), k = (e.clientX - r.left) / r.width;
      ensure();
      try { audio.currentTime = k * len(); } catch {}
      audio.paused ? api.play() : paint();
    };
    return api;
  }

  P.player = { peaks, fake, mount, stopAll() { current?.stop(); } };
})();
