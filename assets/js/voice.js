/* =========================================================
   A warm interviewer voice, in all four languages.
   Uses the device's own speech voices, picking the most natural-sounding one
   (cloud "Natural"/"Neural" voices first), spoken a little slower and softer.
   Punjabi voices are rare on desktops: when none exists we read the Hindi
   version of the question with a Hindi voice, which most Punjabi elders follow easily.
   ========================================================= */
(() => {
  const synth = window.speechSynthesis;
  const BCP = P.BCP;
  const WARM = ["swara", "neerja", "pallavi", "kalpana", "heera", "lekha", "vani", "vaani", "aditi", "kajal", "shruti", "veena", "ananya", "gagan", "ojas", "valluvar"];
  let voices = [];

  function load() {
    voices = synth ? synth.getVoices() : [];
    return voices;
  }
  if (synth) { load(); synth.addEventListener?.("voiceschanged", load); }
  const ready = () => new Promise(res => {
    if (!synth) return res([]);
    if (load().length) return res(voices);
    const t = setTimeout(() => res(load()), 1500);
    synth.addEventListener?.("voiceschanged", () => { clearTimeout(t); res(load()); }, { once: true });
  });

  function score(v, lang) {
    const name = v.name.toLowerCase(), vl = v.lang.replace("_", "-").toLowerCase();
    let s = 0;
    if (vl === BCP[lang].toLowerCase()) s += 4;
    if (/natural|neural|online|premium|enhanced/.test(name)) s += 6;
    if (/google/.test(name)) s += 3;
    if (WARM.some(w => name.includes(w))) s += 2;
    if (!v.localService) s += 1;
    return s;
  }
  function pick(lang) {
    const want = lang.toLowerCase();
    const list = voices.filter(v => v.lang.replace("_", "-").toLowerCase().startsWith(want));
    return list.sort((a, b) => score(b, lang) - score(a, lang))[0] || null;
  }

  P.voice = {
    supported: !!synth,
    async best(lang) { await ready(); return pick(lang); },
    /* speak text in `lang`; `fallback` = { lang, text } used when no voice exists for `lang` */
    async say(text, lang, fallback) {
      if (!synth) return { ok: false, reason: "unsupported" };
      await ready();
      let v = pick(lang), useLang = lang, useText = text;
      if (!v && fallback) { v = pick(fallback.lang); useLang = fallback.lang; useText = fallback.text; }
      if (!v) return { ok: false, reason: "novoice" };
      synth.cancel();
      const u = new SpeechSynthesisUtterance(useText);
      u.voice = v; u.lang = v.lang; u.rate = .9; u.pitch = 1.04; u.volume = 1;
      return new Promise(resolve => {
        const done = r => { clearTimeout(guard); resolve(r); };
        const guard = setTimeout(() => done({ ok: true, voice: v.name, lang: useLang, fellBack: useLang !== lang }), 4000 + useText.length * 140);
        u.onend = () => done({ ok: true, voice: v.name, lang: useLang, fellBack: useLang !== lang });
        u.onerror = () => done({ ok: false, reason: "error" });
        synth.speak(u);
      });
    },
    stop() { synth?.cancel(); },
    speaking: () => !!synth?.speaking,
  };
})();
