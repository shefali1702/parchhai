/* =========================================================
   Parchhai data layer.
   Profiles, elders and capsules live in localStorage; recorded audio lives in IndexedDB.
   This keeps the prototype fully offline. Swap these functions for API calls
   (e.g. Supabase) when a backend arrives; pages only talk to P.db.
   ========================================================= */
(() => {
  const { store, uid } = P;
  const K = { family: "parchhai-family", elders: "parchhai-elders", active: "parchhai-active-elder", capsules: "parchhai-capsules", volunteers: "parchhai-volunteers" };

  /* ---------- IndexedDB for stories (audio blobs + metadata) ---------- */
  let dbp;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open("parchhai", 1);
      req.onupgradeneeded = () => {
        const s = req.result.createObjectStore("stories", { keyPath: "id" });
        s.createIndex("elderId", "elderId");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const t = db.transaction("stories", mode), s = t.objectStore("stories");
      const out = fn(s);
      t.oncomplete = () => resolve(out?.result ?? out);
      t.onerror = () => reject(t.error);
    });
  }

  /* resize an uploaded photo so it fits comfortably in localStorage */
  function shrinkPhoto(file, size = 320) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const c = document.createElement("canvas"), s = Math.min(img.width, img.height);
        c.width = c.height = size;
        c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", .82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
      img.src = url;
    });
  }

  const SAMPLE_ELDER = {
    id: "sample-harjeet", name: "Harjeet Kaur", callName: "Nani", relation: "Nani", lang: "pa",
    hometown: "Ludhiana", birthYear: 1939, photo: null, sample: true,
  };
  const SAMPLE_STORIES = [
    { q: "l2", theme: "love", dur: 42, year: 2026, tr: { pa: "ਜਦੋਂ ਮੇਰਾ ਵਿਆਹ ਹੋਇਆ, ਸਾਰਾ ਪਿੰਡ ਨੱਚਿਆ ਸੀ। ਤੇਰੇ ਨਾਨਾ ਜੀ ਘੋੜੀ ਤੋਂ ਡਿੱਗ ਪਏ ਸਨ! ਅਸੀਂ ਸਾਰੀ ਉਮਰ ਉਸ ਗੱਲ 'ਤੇ ਹੱਸਦੇ ਰਹੇ।", en: "When I got married, the whole village danced. Your Nana ji fell right off the horse! We laughed about it for the rest of our lives." } },
    { q: "k1", theme: "kitchen", dur: 67, tr: { pa: "ਸਰ੍ਹੋਂ ਦਾ ਸਾਗ ਹੌਲੀ ਅੱਗ 'ਤੇ, ਸਾਰੀ ਦੁਪਹਿਰ ਪੱਕਦਾ ਸੀ। ਸਾਗ ਨਾਲ ਕਦੇ ਕਾਹਲੀ ਨਾ ਕਰੀਂ, ਉਹਨੂੰ ਪਤਾ ਲੱਗ ਜਾਂਦਾ ਹੈ।", en: "Sarson ka saag cooked slowly on a low fire, all afternoon. Never rush the saag. It knows." } },
    { q: "h1", theme: "history", dur: 118, tr: { pa: "ਮੈਂ ਅੱਠ ਸਾਲਾਂ ਦੀ ਸੀ। ਅਸੀਂ ਰਾਤੋ-ਰਾਤ ਆਪਣਾ ਘਰ ਛੱਡ ਦਿੱਤਾ। ਮਾਂ ਨੇ ਸਿਰਫ਼ ਇੱਕ ਪਿੱਤਲ ਦਾ ਲੋਟਾ ਅਤੇ ਮੇਰੀ ਗੁੱਡੀ ਚੁੱਕੀ।", en: "I was eight. We left our home overnight. Mother carried only a brass lota and my doll." } },
    { q: "c2", theme: "childhood", dur: 51, tr: { pa: "ਅਸੀਂ ਗੀਟੇ ਖੇਡਦੀਆਂ ਸੀ, ਅਤੇ ਛੱਤ 'ਤੇ ਪਤੰਗਾਂ ਉਡਾਉਂਦੀਆਂ ਸੀ। ਮੇਰਾ ਭਰਾ ਹਮੇਸ਼ਾ ਮੇਰੀ ਡੋਰ ਕੱਟ ਦਿੰਦਾ ਸੀ।", en: "We played gitte, and flew kites from the roof. My brother always cut my string." } },
    { q: "s1", theme: "lessons", dur: 39, tr: { pa: "ਪੁੱਤਰ, ਹੌਸਲਾ ਰੱਖੀਂ, ਨੇਕ ਰਹੀਂ, ਅਤੇ ਆਪਣੀ ਨਾਨੀ ਵਾਂਗ ਨੱਚੀਂ।", en: "Puttar, be brave, be kind, and dance like your Nani." } },
    { q: "w1", theme: "work", dur: 74, tr: { pa: "ਮੈਂ ਪਿੰਡ ਦੇ ਸਕੂਲ ਵਿੱਚ ਪੜ੍ਹਾਉਂਦੀ ਸੀ। ਪਹਿਲੀ ਤਨਖ਼ਾਹ ਸੱਠ ਰੁਪਏ ਸੀ, ਅਤੇ ਮੈਂ ਮਾਂ ਲਈ ਇੱਕ ਸ਼ਾਲ ਖ਼ਰੀਦੀ।", en: "I taught at the village school. My first salary was sixty rupees, and I bought my mother a shawl." } },
  ];

  P.db = {
    /* family (the person using the app) */
    family: () => store.json(K.family, null),
    saveFamily: f => store.put(K.family, f),

    /* elders */
    elders: () => store.json(K.elders, []),
    elder: id => P.db.elders().find(e => e.id === id) || null,
    saveElder(e) {
      const all = P.db.elders(), i = all.findIndex(x => x.id === e.id);
      if (!e.id) e.id = uid();
      if (!e.createdAt) e.createdAt = Date.now();
      i >= 0 ? (all[i] = e) : all.push(e);
      store.put(K.elders, all);
      return e;
    },
    async removeElder(id) {
      store.put(K.elders, P.db.elders().filter(e => e.id !== id));
      const stories = await P.db.stories(id);
      await Promise.all(stories.map(s => P.db.removeStory(s.id)));
      if (P.db.activeId() === id) store.set(K.active, P.db.elders()[0]?.id || "");
    },
    activeId: () => store.get(K.active),
    active() { const all = P.db.elders(); return all.find(e => e.id === P.db.activeId()) || all[0] || null; },
    setActive: id => store.set(K.active, id),
    shrinkPhoto,

    /* stories */
    stories: elderId => tx("readonly", s => elderId ? s.index("elderId").getAll(elderId) : s.getAll())
      .then(list => (list || []).sort((a, b) => b.createdAt - a.createdAt)),
    story: id => tx("readonly", s => s.get(id)),
    saveStory: story => tx("readwrite", s => s.put(story)),
    removeStory: id => tx("readwrite", s => s.delete(id)),

    /* capsules */
    capsules: () => store.json(K.capsules, []),
    saveCapsule(c) { const all = P.db.capsules(); c.id = c.id || uid(); c.createdAt = c.createdAt || Date.now(); all.push(c); store.put(K.capsules, all); return c; },
    removeCapsule: id => store.put(K.capsules, P.db.capsules().filter(c => c.id !== id)),

    /* volunteers */
    saveVolunteer(v) { const all = store.json(K.volunteers, []); all.push({ ...v, id: uid(), at: Date.now() }); store.put(K.volunteers, all); },

    /* a sample vault so the app can be explored before recording anything */
    async seedSample() {
      if (!P.db.elder(SAMPLE_ELDER.id)) P.db.saveElder({ ...SAMPLE_ELDER, createdAt: Date.now() });
      const existing = await P.db.stories(SAMPLE_ELDER.id);
      if (!existing.length) {
        const day = 864e5;
        await Promise.all(SAMPLE_STORIES.map((s, i) => P.db.saveStory({
          id: `sample-${s.q}`, elderId: SAMPLE_ELDER.id, questionId: s.q, theme: s.theme, lang: "pa",
          audio: null, duration: s.dur, transcript: s.tr.pa, translation: s.tr.en, listens: 6 - i,
          createdAt: Date.now() - (i + 1) * 3 * day, sample: true,
        })));
      }
      P.db.setActive(SAMPLE_ELDER.id);
      return P.db.elder(SAMPLE_ELDER.id);
    },
  };
})();
