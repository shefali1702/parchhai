/* =========================================================
   Parchhai data layer. Pages only ever talk to P.db.

   Two modes, same API:
   - Offline (default): profiles and capsules in localStorage, audio in IndexedDB.
   - Cloud: Supabase auth, Postgres tables and a private audio bucket, switched on
     by filling in assets/js/config.js. Families share one vault via invite codes.

   Reads of elders/capsules/family are synchronous from an in-memory cache that
   ready() fills; every write is async.
   ========================================================= */
(() => {
  const { store } = P;
  const cfg = window.PARCHHAI_CONFIG || {};
  const CLOUD = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase?.createClient);
  const sb = CLOUD ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const K = { family: "parchhai-family", elders: "parchhai-elders", active: "parchhai-active-elder", capsules: "parchhai-capsules", volunteers: "parchhai-volunteers" };

  const uuid = () => crypto.randomUUID ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
  const iso = ms => (ms ? new Date(ms).toISOString() : null);
  const ms = s => (s ? Date.parse(s) : null);
  const fail = (error, what) => { if (error) { console.error(`[parchhai] ${what}`, error); throw error; } };

  /* ---------- IndexedDB for offline stories (audio blobs + metadata) ---------- */
  let dbp;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open("parchhai", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("stories", { keyPath: "id" }).createIndex("elderId", "elderId");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const t = db.transaction("stories", mode), out = fn(t.objectStore("stories"));
      t.oncomplete = () => resolve(out?.result ?? out);
      t.onerror = () => reject(t.error);
    });
  }

  /* resize an uploaded photo to a small square JPEG */
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

  /* ---------- row ↔ object mapping for the cloud ---------- */
  const elderFrom = r => ({ id: r.id, name: r.name, callName: r.call_name, lang: r.lang, dialect: r.dialect, birthYear: r.birth_year,
    hometown: r.hometown, photo: r.photo, consentAt: ms(r.consent_at), sample: r.sample, createdAt: ms(r.created_at) });
  const elderTo = e => ({ id: e.id, family_id: cache.family.id, name: e.name, call_name: e.callName || null, lang: e.lang, dialect: e.dialect || null,
    birth_year: e.birthYear || null, hometown: e.hometown || null, photo: e.photo || null, consent_at: iso(e.consentAt), sample: !!e.sample });
  const storyFrom = r => ({ id: r.id, elderId: r.elder_id, questionId: r.question_id, theme: r.theme, lang: r.lang, audio: null, audioPath: r.audio_path,
    mime: r.mime, duration: r.duration, transcript: r.transcript, translation: r.translation, listens: r.listens, sample: r.sample, createdAt: ms(r.created_at) });
  const storyTo = s => ({ id: s.id, family_id: cache.family.id, elder_id: s.elderId, question_id: s.questionId, theme: s.theme, lang: s.lang,
    audio_path: s.audioPath || null, mime: s.mime || null, duration: Math.round(s.duration || 0), transcript: s.transcript || null,
    translation: s.translation || null, listens: s.listens || 0, sample: !!s.sample });
  const capsuleFrom = r => ({ id: r.id, elderId: r.elder_id, storyId: r.story_id, to: r.recipient, occasion: r.occasion, unlockAt: ms(r.unlock_at),
    note: r.note, createdAt: ms(r.created_at) });

  const cache = { user: null, family: null, elders: [], capsules: [] };
  const audioCache = new Map();

  async function loadCloud() {
    const { data: { session } } = await sb.auth.getSession();
    cache.user = session?.user || null;
    cache.family = null; cache.elders = []; cache.capsules = [];
    if (!cache.user) return;
    const { data: m, error } = await sb.from("family_members").select("role, families(id, name, invite_code)").eq("user_id", cache.user.id).limit(1);
    fail(error, "load family");
    if (!m?.length) return;
    const f = m[0].families;
    cache.family = { id: f.id, name: f.name, inviteCode: f.invite_code, role: m[0].role };
    const [el, cp] = await Promise.all([
      sb.from("elders").select("*").eq("family_id", f.id).order("created_at"),
      sb.from("capsules").select("*").eq("family_id", f.id).order("unlock_at"),
    ]);
    fail(el.error, "load elders"); fail(cp.error, "load capsules");
    cache.elders = el.data.map(elderFrom);
    cache.capsules = cp.data.map(capsuleFrom);
  }

  const SAMPLE_ELDER = { name: "Harjeet Kaur", callName: "Nani", relation: "Nani", lang: "pa", hometown: "Ludhiana", birthYear: 1939, photo: null, sample: true };
  const SAMPLE_STORIES = [
    { q: "l2", theme: "love", dur: 42, tr: { pa: "ਜਦੋਂ ਮੇਰਾ ਵਿਆਹ ਹੋਇਆ, ਸਾਰਾ ਪਿੰਡ ਨੱਚਿਆ ਸੀ। ਤੇਰੇ ਨਾਨਾ ਜੀ ਘੋੜੀ ਤੋਂ ਡਿੱਗ ਪਏ ਸਨ! ਅਸੀਂ ਸਾਰੀ ਉਮਰ ਉਸ ਗੱਲ 'ਤੇ ਹੱਸਦੇ ਰਹੇ।", en: "When I got married, the whole village danced. Your Nana ji fell right off the horse! We laughed about it for the rest of our lives." } },
    { q: "k1", theme: "kitchen", dur: 67, tr: { pa: "ਸਰ੍ਹੋਂ ਦਾ ਸਾਗ ਹੌਲੀ ਅੱਗ 'ਤੇ, ਸਾਰੀ ਦੁਪਹਿਰ ਪੱਕਦਾ ਸੀ। ਸਾਗ ਨਾਲ ਕਦੇ ਕਾਹਲੀ ਨਾ ਕਰੀਂ, ਉਹਨੂੰ ਪਤਾ ਲੱਗ ਜਾਂਦਾ ਹੈ।", en: "Sarson ka saag cooked slowly on a low fire, all afternoon. Never rush the saag. It knows." } },
    { q: "h1", theme: "history", dur: 118, tr: { pa: "ਮੈਂ ਅੱਠ ਸਾਲਾਂ ਦੀ ਸੀ। ਅਸੀਂ ਰਾਤੋ-ਰਾਤ ਆਪਣਾ ਘਰ ਛੱਡ ਦਿੱਤਾ। ਮਾਂ ਨੇ ਸਿਰਫ਼ ਇੱਕ ਪਿੱਤਲ ਦਾ ਲੋਟਾ ਅਤੇ ਮੇਰੀ ਗੁੱਡੀ ਚੁੱਕੀ।", en: "I was eight. We left our home overnight. Mother carried only a brass lota and my doll." } },
    { q: "c2", theme: "childhood", dur: 51, tr: { pa: "ਅਸੀਂ ਗੀਟੇ ਖੇਡਦੀਆਂ ਸੀ, ਅਤੇ ਛੱਤ 'ਤੇ ਪਤੰਗਾਂ ਉਡਾਉਂਦੀਆਂ ਸੀ। ਮੇਰਾ ਭਰਾ ਹਮੇਸ਼ਾ ਮੇਰੀ ਡੋਰ ਕੱਟ ਦਿੰਦਾ ਸੀ।", en: "We played gitte, and flew kites from the roof. My brother always cut my string." } },
    { q: "s1", theme: "lessons", dur: 39, tr: { pa: "ਪੁੱਤਰ, ਹੌਸਲਾ ਰੱਖੀਂ, ਨੇਕ ਰਹੀਂ, ਅਤੇ ਆਪਣੀ ਨਾਨੀ ਵਾਂਗ ਨੱਚੀਂ।", en: "Puttar, be brave, be kind, and dance like your Nani." } },
    { q: "w1", theme: "work", dur: 74, tr: { pa: "ਮੈਂ ਪਿੰਡ ਦੇ ਸਕੂਲ ਵਿੱਚ ਪੜ੍ਹਾਉਂਦੀ ਸੀ। ਪਹਿਲੀ ਤਨਖ਼ਾਹ ਸੱਠ ਰੁਪਏ ਸੀ, ਅਤੇ ਮੈਂ ਮਾਂ ਲਈ ਇੱਕ ਸ਼ਾਲ ਖ਼ਰੀਦੀ।", en: "I taught at the village school. My first salary was sixty rupees, and I bought my mother a shawl." } },
  ];

  P.db = {
    cloud: CLOUD,
    async ready() { if (CLOUD) { try { await loadCloud(); } catch { /* offline or misconfigured: pages show sign-in */ } } },

    /* ---------- accounts (cloud only; offline mode is always "signed in") ---------- */
    signedIn: () => !CLOUD || !!cache.user,
    hasFamily: () => !CLOUD || !!cache.family,
    user: () => cache.user,
    familyInfo: () => cache.family,
    async signUp(email, password, meta) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: meta, emailRedirectTo: location.href.split("?")[0] } });
      if (error) return { ok: false, error };
      await loadCloud();
      return { ok: true, needsConfirm: !data.session };
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error };
      await loadCloud();
      return { ok: true };
    },
    async signOut() { await sb?.auth.signOut(); store.set(K.active, ""); await loadCloud(); },
    async createFamily(name) {
      const { error } = await sb.rpc("create_family", { fname: name });
      fail(error, "create family"); await loadCloud();
    },
    async joinFamily(code) {
      const { error } = await sb.rpc("join_family", { code });
      if (error) return { ok: false, error };
      await loadCloud();
      return { ok: true };
    },

    /* ---------- the person using the app ---------- */
    family() {
      if (!CLOUD) return store.json(K.family, null);
      const u = cache.user;
      return u ? { name: u.user_metadata?.name || "", email: u.email, role: u.user_metadata?.role ?? 0 } : null;
    },
    async saveFamily(f) {
      if (!CLOUD) return store.put(K.family, f);
      await sb.auth.updateUser({ data: { name: f.name, role: f.role } });
      if (!cache.family) await P.db.createFamily(f.familyName || `${f.name}'s family`);
    },

    /* ---------- elders ---------- */
    elders: () => (CLOUD ? cache.elders : store.json(K.elders, [])),
    elder: id => P.db.elders().find(e => e.id === id) || null,
    async saveElder(e) {
      if (!e.id) e.id = uuid();
      if (!e.createdAt) e.createdAt = Date.now();
      if (CLOUD) {
        const { error } = await sb.from("elders").upsert(elderTo(e));
        fail(error, "save elder");
      }
      const all = P.db.elders().slice(), i = all.findIndex(x => x.id === e.id);
      i >= 0 ? (all[i] = e) : all.push(e);
      CLOUD ? (cache.elders = all) : store.put(K.elders, all);
      return e;
    },
    async removeElder(id) {
      const stories = await P.db.stories(id);
      await Promise.all(stories.map(s => P.db.removeStory(s.id, s)));
      if (CLOUD) { const { error } = await sb.from("elders").delete().eq("id", id); fail(error, "remove elder"); cache.elders = cache.elders.filter(e => e.id !== id); }
      else store.put(K.elders, P.db.elders().filter(e => e.id !== id));
      if (P.db.activeId() === id) store.set(K.active, P.db.elders()[0]?.id || "");
    },
    activeId: () => store.get(K.active),
    active() { const all = P.db.elders(); return all.find(e => e.id === P.db.activeId()) || all[0] || null; },
    setActive: id => store.set(K.active, id),
    shrinkPhoto,

    /* ---------- stories ---------- */
    async stories(elderId) {
      if (CLOUD) {
        if (!cache.family) return [];
        let q = sb.from("stories").select("*").eq("family_id", cache.family.id).order("created_at", { ascending: false });
        if (elderId) q = q.eq("elder_id", elderId);
        const { data, error } = await q; fail(error, "load stories");
        return data.map(storyFrom);
      }
      const list = await tx("readonly", s => elderId ? s.index("elderId").getAll(elderId) : s.getAll());
      return (list || []).sort((a, b) => b.createdAt - a.createdAt);
    },
    async story(id) {
      if (!CLOUD) return tx("readonly", s => s.get(id));
      const { data, error } = await sb.from("stories").select("*").eq("id", id).maybeSingle();
      return error || !data ? null : storyFrom(data);
    },
    async saveStory(story) {
      if (!CLOUD) return tx("readwrite", s => s.put(story));
      if (!/^[0-9a-f-]{36}$/i.test(story.id)) story.id = uuid();
      if (story.audio instanceof Blob && !story.audioPath) {
        const ext = (story.mime || story.audio.type || "audio/webm").includes("mp4") ? "m4a" : (story.mime || "").includes("ogg") ? "ogg" : "webm";
        const path = `${cache.family.id}/${story.id}.${ext}`;
        const { error } = await sb.storage.from("audio").upload(path, story.audio, { contentType: (story.audio.type || "audio/webm").split(";")[0], upsert: true });
        fail(error, "upload audio");
        story.audioPath = path; audioCache.set(story.id, story.audio);
      }
      const { error } = await sb.from("stories").upsert(storyTo(story));
      fail(error, "save story");
    },
    async removeStory(id, known) {
      if (!CLOUD) return tx("readwrite", s => s.delete(id));
      const s = known || await P.db.story(id);
      if (s?.audioPath) await sb.storage.from("audio").remove([s.audioPath]);
      const { error } = await sb.from("stories").delete().eq("id", id); fail(error, "remove story");
      audioCache.delete(id);
    },
    /* the recording itself, as a Blob (downloaded once from the private bucket in cloud mode) */
    async audio(s) {
      if (!s) return null;
      if (s.audio instanceof Blob) return s.audio;
      if (!CLOUD || !s.audioPath) return null;
      if (audioCache.has(s.id)) return audioCache.get(s.id);
      const { data, error } = await sb.storage.from("audio").download(s.audioPath);
      if (error) return null;
      audioCache.set(s.id, data);
      return data;
    },
    hasAudio: s => !!(s?.audio || s?.audioPath),

    /* ---------- capsules ---------- */
    capsules: () => (CLOUD ? cache.capsules : store.json(K.capsules, [])),
    async saveCapsule(c) {
      c.id = c.id || uuid(); c.createdAt = c.createdAt || Date.now();
      if (CLOUD) {
        const { error } = await sb.from("capsules").insert({ id: c.id, family_id: cache.family.id, elder_id: c.elderId || null, story_id: c.storyId || null,
          recipient: c.to, occasion: c.occasion, unlock_at: iso(c.unlockAt), note: c.note || null });
        fail(error, "save capsule");
        cache.capsules = [...cache.capsules, c];
      } else store.put(K.capsules, [...P.db.capsules(), c]);
      return c;
    },
    async removeCapsule(id) {
      if (CLOUD) { const { error } = await sb.from("capsules").delete().eq("id", id); fail(error, "remove capsule"); cache.capsules = cache.capsules.filter(c => c.id !== id); }
      else store.put(K.capsules, P.db.capsules().filter(c => c.id !== id));
    },

    /* ---------- volunteers ---------- */
    async saveVolunteer(v) {
      if (CLOUD) {
        const { error } = await sb.from("volunteers").insert({ role: v.role, name: v.name, email: v.email, phone: v.phone || null, city: v.city || null,
          org: v.org || null, languages: v.languages || [], availability: v.when ?? null, message: v.message || null });
        fail(error, "save volunteer");
      } else store.put(K.volunteers, [...store.json(K.volunteers, []), { ...v, id: uuid(), at: Date.now() }]);
    },

    /* ---------- a sample vault so the app can be explored before recording anything ---------- */
    async seedSample() {
      let elder = P.db.elders().find(e => e.sample);
      if (!elder) elder = await P.db.saveElder({ ...SAMPLE_ELDER, id: CLOUD ? uuid() : "sample-harjeet", createdAt: Date.now() });
      if (!(await P.db.stories(elder.id)).length) {
        const day = 864e5;
        for (const [i, s] of SAMPLE_STORIES.entries()) {
          await P.db.saveStory({
            id: CLOUD ? uuid() : `sample-${s.q}`, elderId: elder.id, questionId: s.q, theme: s.theme, lang: "pa",
            audio: null, duration: s.dur, transcript: s.tr.pa, translation: s.tr.en, listens: 6 - i,
            createdAt: Date.now() - (i + 1) * 3 * day, sample: true,
          });
        }
      }
      P.db.setActive(elder.id);
      return elder;
    },
  };
})();
