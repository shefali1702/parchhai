/* =========================================================
   Parchhai core: language, navigation, settings, small UI helpers.
   Every app page loads this first, then registers its own strings.
   ========================================================= */
(() => {
  const LANGS = ["en", "hi", "pa", "ta"];
  const LANG_NAMES = { en: "English", hi: "हिंदी", pa: "ਪੰਜਾਬੀ", ta: "தமிழ்" };
  const LANG_SHORT = { en: "EN", hi: "हि", pa: "ਪੰ", ta: "த" };
  const BCP = { en: "en-IN", hi: "hi-IN", pa: "pa-IN", ta: "ta-IN" };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    json(k, fallback) { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } },
    put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  /* ---------- strings shared by every page ---------- */
  const COMMON = {
    en: {
      "nav.home": "Home", "nav.record": "Record", "nav.vault": "Vault", "nav.capsules": "Capsules", "nav.about": "About", "nav.start": "Begin", "nav.signout": "Sign out", "c.error": "Something went wrong. Please check your connection and try again.",
      "a11y.elder": "Elder mode: larger text", "a11y.calm": "Calm mode: no motion",
      "foot.love": "Made with love for every Nani, Dadi, Paati and Thatha.",
      "foot.local": "Prototype: everything you save stays in this browser.",
      "c.save": "Save", "c.cancel": "Cancel", "c.back": "Back", "c.next": "Next", "c.close": "Close", "c.delete": "Delete",
      "c.play": "Play", "c.pause": "Pause", "c.done": "Done", "c.sample": "Sample · no audio", "c.min": "min",
      "c.addElder": "Add an elder", "c.noElderT": "First, tell us <em>whose</em> voice we're keeping.",
      "c.noElderP": "Add a grandparent or an elder you love. It takes a minute.",
      "theme.childhood": "Childhood", "theme.love": "Love & marriage", "theme.work": "Work & struggle",
      "theme.history": "History we lived", "theme.kitchen": "The kitchen", "theme.lessons": "Life lessons",
    },
    hi: {
      "nav.home": "होम", "nav.record": "रिकॉर्ड", "nav.vault": "तिजोरी", "nav.capsules": "कैप्सूल", "nav.about": "परिचय", "nav.start": "शुरू करें", "nav.signout": "साइन आउट", "c.error": "कुछ गड़बड़ हो गई। कृपया इंटरनेट जाँचकर फिर कोशिश कीजिए।",
      "a11y.elder": "बुज़ुर्ग मोड: बड़े अक्षर", "a11y.calm": "शांत मोड: कोई हलचल नहीं",
      "foot.love": "हर नानी, दादी, पाटी और थाथा के लिए प्यार से बनाया गया।",
      "foot.local": "प्रोटोटाइप: आप जो भी सहेजते हैं, वह इसी ब्राउज़र में रहता है।",
      "c.save": "सहेजें", "c.cancel": "रद्द करें", "c.back": "पीछे", "c.next": "आगे", "c.close": "बंद करें", "c.delete": "हटाएँ",
      "c.play": "चलाएँ", "c.pause": "रोकें", "c.done": "हो गया", "c.sample": "नमूना · ऑडियो नहीं", "c.min": "मिनट",
      "c.addElder": "बुज़ुर्ग जोड़ें", "c.noElderT": "पहले बताइए, हम <em>किसकी</em> आवाज़ सहेज रहे हैं।",
      "c.noElderP": "अपने दादा-दादी, नाना-नानी या किसी प्यारे बुज़ुर्ग को जोड़िए। बस एक मिनट लगेगा।",
      "theme.childhood": "बचपन", "theme.love": "प्रेम और शादी", "theme.work": "काम और संघर्ष",
      "theme.history": "जिया हुआ इतिहास", "theme.kitchen": "रसोई", "theme.lessons": "ज़िंदगी की सीख",
    },
    pa: {
      "nav.home": "ਘਰ", "nav.record": "ਰਿਕਾਰਡ", "nav.vault": "ਖ਼ਜ਼ਾਨਾ", "nav.capsules": "ਕੈਪਸੂਲ", "nav.about": "ਜਾਣ-ਪਛਾਣ", "nav.start": "ਸ਼ੁਰੂ ਕਰੋ", "nav.signout": "ਸਾਈਨ ਆਊਟ", "c.error": "ਕੁਝ ਗੜਬੜ ਹੋ ਗਈ। ਕਿਰਪਾ ਕਰਕੇ ਇੰਟਰਨੈੱਟ ਜਾਂਚ ਕੇ ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
      "a11y.elder": "ਬਜ਼ੁਰਗ ਮੋਡ: ਵੱਡੇ ਅੱਖਰ", "a11y.calm": "ਸ਼ਾਂਤ ਮੋਡ: ਕੋਈ ਹਿਲਜੁਲ ਨਹੀਂ",
      "foot.love": "ਹਰ ਨਾਨੀ, ਦਾਦੀ, ਪਾਟੀ ਅਤੇ ਥਾਥਾ ਲਈ ਪਿਆਰ ਨਾਲ ਬਣਾਇਆ ਗਿਆ।",
      "foot.local": "ਪ੍ਰੋਟੋਟਾਈਪ: ਤੁਸੀਂ ਜੋ ਵੀ ਸੰਭਾਲਦੇ ਹੋ, ਉਹ ਇਸੇ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਰਹਿੰਦਾ ਹੈ।",
      "c.save": "ਸੰਭਾਲੋ", "c.cancel": "ਰੱਦ ਕਰੋ", "c.back": "ਪਿੱਛੇ", "c.next": "ਅੱਗੇ", "c.close": "ਬੰਦ ਕਰੋ", "c.delete": "ਹਟਾਓ",
      "c.play": "ਚਲਾਓ", "c.pause": "ਰੋਕੋ", "c.done": "ਹੋ ਗਿਆ", "c.sample": "ਨਮੂਨਾ · ਆਡੀਓ ਨਹੀਂ", "c.min": "ਮਿੰਟ",
      "c.addElder": "ਬਜ਼ੁਰਗ ਜੋੜੋ", "c.noElderT": "ਪਹਿਲਾਂ ਦੱਸੋ, ਅਸੀਂ <em>ਕਿਸਦੀ</em> ਆਵਾਜ਼ ਸੰਭਾਲ ਰਹੇ ਹਾਂ।",
      "c.noElderP": "ਆਪਣੇ ਦਾਦਾ-ਦਾਦੀ, ਨਾਨਾ-ਨਾਨੀ ਜਾਂ ਕਿਸੇ ਪਿਆਰੇ ਬਜ਼ੁਰਗ ਨੂੰ ਜੋੜੋ। ਬੱਸ ਇੱਕ ਮਿੰਟ ਲੱਗੇਗਾ।",
      "theme.childhood": "ਬਚਪਨ", "theme.love": "ਪਿਆਰ ਅਤੇ ਵਿਆਹ", "theme.work": "ਕੰਮ ਅਤੇ ਸੰਘਰਸ਼",
      "theme.history": "ਜੀਵਿਆ ਇਤਿਹਾਸ", "theme.kitchen": "ਰਸੋਈ", "theme.lessons": "ਜ਼ਿੰਦਗੀ ਦੀ ਸਿੱਖਿਆ",
    },
    ta: {
      "nav.home": "முகப்பு", "nav.record": "பதிவு", "nav.vault": "பெட்டகம்", "nav.capsules": "காலப் பெட்டி", "nav.about": "எங்களைப் பற்றி", "nav.start": "தொடங்குங்கள்", "nav.signout": "வெளியேறு", "c.error": "ஏதோ தவறு நடந்தது. இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயலுங்கள்.",
      "a11y.elder": "பெரியவர் முறை: பெரிய எழுத்துகள்", "a11y.calm": "அமைதி முறை: அசைவுகள் இல்லை",
      "foot.love": "ஒவ்வொரு நானி, தாதி, பாட்டி, தாத்தாவுக்கும் அன்புடன் உருவாக்கப்பட்டது.",
      "foot.local": "முன்மாதிரி: நீங்கள் சேமிப்பவை அனைத்தும் இந்த உலாவியிலேயே இருக்கும்.",
      "c.save": "சேமி", "c.cancel": "ரத்து", "c.back": "பின்", "c.next": "அடுத்து", "c.close": "மூடு", "c.delete": "நீக்கு",
      "c.play": "இயக்கு", "c.pause": "நிறுத்து", "c.done": "முடிந்தது", "c.sample": "மாதிரி · ஒலி இல்லை", "c.min": "நிமி",
      "c.addElder": "பெரியவரைச் சேர்", "c.noElderT": "முதலில் சொல்லுங்கள், <em>யாருடைய</em> குரலைப் பாதுகாக்கிறோம்?",
      "c.noElderP": "உங்கள் தாத்தா, பாட்டி அல்லது அன்பான ஒரு பெரியவரைச் சேருங்கள். ஒரு நிமிடம் போதும்.",
      "theme.childhood": "குழந்தைப் பருவம்", "theme.love": "காதல் & கல்யாணம்", "theme.work": "வேலையும் போராட்டமும்",
      "theme.history": "நாம் வாழ்ந்த வரலாறு", "theme.kitchen": "சமையலறை", "theme.lessons": "வாழ்க்கைப் பாடங்கள்",
    },
  };

  const dicts = [COMMON];
  let lang = LANGS.includes(store.get("parchhai-lang")) ? store.get("parchhai-lang") : "en";
  const root = document.documentElement;
  root.lang = lang;

  function t(key, vars) {
    let v;
    for (let i = dicts.length - 1; i >= 0 && v == null; i--) v = dicts[i][lang]?.[key];
    for (let i = dicts.length - 1; i >= 0 && v == null; i--) v = dicts[i].en?.[key];
    if (v == null) return key;
    if (vars && typeof v === "string") v = v.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
    return v;
  }
  const strip = s => String(s).replace(/<[^>]+>/g, "");

  function apply(scope = document) {
    scope.querySelectorAll("[data-i18n]").forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    scope.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = strip(t(el.dataset.i18nPh)); });
    scope.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", strip(t(el.dataset.i18nAria))); });
    if (root.dataset.title) document.title = `${strip(t(root.dataset.title))} · Parchhai`;
    document.querySelectorAll("[data-set-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.setLang === lang)));
  }

  function setLang(l) {
    if (!LANGS.includes(l) || l === lang) return;
    const go = () => {
      lang = l; root.lang = l; store.set("parchhai-lang", l);
      apply(); document.dispatchEvent(new CustomEvent("langchange", { detail: l }));
    };
    if (root.classList.contains("calm")) return go();
    document.body.classList.add("swapping");
    setTimeout(() => { go(); requestAnimationFrame(() => document.body.classList.remove("swapping")); }, 250);
  }

  /* ---------- icons ---------- */
  const ICON = {
    home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    vault: '<rect x="3" y="5" width="18" height="15" rx="3"/><circle cx="12" cy="12.5" r="3.2"/><path d="M12 9.3V8M7 20v1M17 20v1"/>',
    capsule: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 8l9 6 9-6"/>',
    about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    elder: '<path d="M3 19l5-14 5 14M5 14h6M15 19l3.5-9 3.5 9M16.2 16h4.6"/>',
    calm: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" stroke="none"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    speak: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    redo: '<path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v5h5"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  };
  const icon = (name, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ""}</svg>`;

  const LOGO = `<svg viewBox="0 0 32 44" aria-hidden="true"><defs><linearGradient id="lg-fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB86B" stop-opacity="0"/><stop offset=".3" stop-color="#FFB86B"/><stop offset=".75" stop-color="#FFD48A"/><stop offset="1" stop-color="#FF7A45"/></linearGradient></defs>
    <path d="M16 2 C 23 11, 26 17, 25.5 22.5 C 25 27.5, 21 30, 16 30 C 11 30, 7 27.5, 6.5 22.5 C 6 17, 9 11, 16 2 Z" fill="url(#lg-fl)"/>
    <path d="M16 13 C 19.5 18.5, 20.5 22, 20 24.5 C 19.5 27, 18 28, 16 28 C 14 28, 12.5 27, 12 24.5 C 11.5 22, 12.5 18.5, 16 13 Z" fill="#FFF1D6"/>
    <line x1="3" y1="31.5" x2="29" y2="31.5" stroke="#F4ECE1" stroke-opacity=".5" stroke-width="1"/>
    <path d="M16 43 C 21 38.5, 23 36, 22.6 34.5 C 22.2 33, 19.5 33, 16 33 C 12.5 33, 9.8 33, 9.4 34.5 C 9 36, 11 38.5, 16 43 Z" fill="#7A5FB0" opacity=".55"/></svg>`;

  /* ---------- chrome: nav, tab bar, footer ---------- */
  const PAGES = [
    { id: "record", href: "record.html", icon: "mic" },
    { id: "vault", href: "vault.html", icon: "vault" },
    { id: "capsules", href: "capsule.html", icon: "capsule" },
    { id: "about", href: "about.html", icon: "about" },
  ];
  function mountChrome() {
    const page = document.body.dataset.page;
    const nav = document.createElement("header");
    nav.className = "nav";
    nav.innerHTML = `
      <a class="brand" href="index.html" aria-label="Parchhai home">${LOGO}<b>Parchhai</b></a>
      <nav class="nav-links" aria-label="Main">${PAGES.map(p => `<a href="${p.href}" ${p.id === page ? 'aria-current="page"' : ""} data-i18n="nav.${p.id}"></a>`).join("")}</nav>
      <div class="tools">
        <div class="langs" role="group" aria-label="Language">${LANGS.map(l => `<button data-set-lang="${l}" lang="${l}">${LANG_SHORT[l]}</button>`).join("")}</div>
        <button class="icon-btn" data-toggle="elder" aria-pressed="false" data-i18n-aria="a11y.elder">${icon("elder")}</button>
        <button class="icon-btn" data-toggle="calm" aria-pressed="false" data-i18n-aria="a11y.calm">${icon("calm")}</button>
        ${P.db?.cloud && P.db.signedIn() ? `<button class="icon-btn" id="signout" data-i18n-aria="nav.signout">${icon("logout")}</button>` : ""}
        ${page === "start" ? "" : `<a class="btn btn-primary" href="${P.db?.elders().length ? "record.html" : "start.html"}" data-i18n="${P.db?.elders().length ? "nav.record" : "nav.start"}"></a>`}
      </div>`;
    document.body.prepend(nav);
    const bar = document.createElement("nav");
    bar.className = "tabbar"; bar.setAttribute("aria-label", "Main");
    bar.innerHTML = PAGES.map(p => `<a href="${p.href}" ${p.id === page ? 'aria-current="page"' : ""}>${icon(p.icon)}<span data-i18n="nav.${p.id}"></span></a>`).join("");
    document.body.append(bar);
    const foot = document.createElement("footer");
    foot.className = "foot";
    foot.innerHTML = `<div class="wrap"><div><div data-i18n="foot.love"></div><div class="small" style="margin-top:6px" data-i18n="foot.local"></div></div>
      <nav aria-label="Footer"><a href="index.html" data-i18n="nav.home"></a>${PAGES.map(p => `<a href="${p.href}" data-i18n="nav.${p.id}"></a>`).join("")}</nav></div>`;
    document.querySelector("main")?.after(foot);

    nav.querySelector("#signout")?.addEventListener("click", async () => { await P.db.signOut(); location.href = "index.html"; });
    nav.querySelectorAll("[data-set-lang]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.setLang)));
    nav.querySelectorAll("[data-toggle]").forEach(b => {
      b.setAttribute("aria-pressed", String(root.classList.contains(b.dataset.toggle)));
      b.addEventListener("click", () => setMode(b.dataset.toggle, !root.classList.contains(b.dataset.toggle)));
    });
    addEventListener("scroll", () => nav.classList.toggle("solid", scrollY > 10), { passive: true });
  }

  /* ---------- the dawn slice behind every page title ---------- */
  function mountHeroes() {
    document.querySelectorAll(".page-hero").forEach(h => {
      h.insertAdjacentHTML("afterbegin", `<div class="sky" aria-hidden="true"></div><div class="sun" aria-hidden="true"></div>
        <svg class="hills" viewBox="0 0 1440 300" preserveAspectRatio="none" aria-hidden="true">
          <path fill="#9a4d6e" opacity=".7" d="M0 120 C 160 70, 300 80, 460 104 S 760 50, 940 84 S 1240 120, 1440 76 L1440 300 L0 300Z"/>
          <path fill="#5e2a57" d="M0 170 C 200 130, 380 140, 560 162 S 900 120, 1100 150 S 1340 160, 1440 140 L1440 300 L0 300Z"/>
          <path fill="#2b1330" d="M0 222 C 240 196, 480 206, 720 220 S 1180 200, 1440 214 L1440 300 L0 300Z"/>
          <path fill="${getComputedStyle(root).getPropertyValue("--bg").trim() || "#0a0710"}" d="M0 270 C 300 252, 640 262, 900 270 S 1300 258, 1440 264 L1440 300 L0 300Z"/>
        </svg>`);
    });
  }

  /* ---------- elder + calm modes (shared with the landing page) ---------- */
  function setMode(mode, on) {
    root.classList.toggle(mode, on);
    store.set(`parchhai-${mode}`, on ? "1" : "0");
    document.querySelectorAll(`[data-toggle="${mode}"]`).forEach(b => b.setAttribute("aria-pressed", String(on)));
    if (mode === "calm" && on) document.querySelectorAll(".reveal").forEach(el => el.classList.add("in"));
  }

  /* ---------- small helpers ---------- */
  let toastTimer;
  function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.append(el); }
    el.innerHTML = msg; el.classList.add("on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("on"), 3200);
  }
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: .12 }) : null;
  function reveal(scope = document) { scope.querySelectorAll(".reveal:not(.in)").forEach(el => io ? io.observe(el) : el.classList.add("in")); }
  function lightCards(scope = document) {
    scope.querySelectorAll(".card:not([data-lit])").forEach(c => {
      c.dataset.lit = "1";
      c.addEventListener("pointermove", e => { const r = c.getBoundingClientRect(); c.style.setProperty("--cx", `${e.clientX - r.left}px`); c.style.setProperty("--cy", `${e.clientY - r.top}px`); });
    });
  }
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtTime = s => { s = Math.max(0, Math.round(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const fmtDate = (d, opts = { day: "numeric", month: "long", year: "numeric" }) => new Intl.DateTimeFormat(BCP[lang], opts).format(new Date(d));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
  const initials = name => esc((name || "?").trim().charAt(0).toUpperCase());
  const avatar = (elder, cls = "") => `<div class="avatar ${cls}" ${elder?.lang ? `lang="${elder.lang}"` : ""}>${elder?.photo ? `<img src="${elder.photo}" alt="">` : initials(elder?.callName || elder?.name)}</div>`;

  /* tiny UI sounds: a soft tick and a temple bell. No ambient sound inside the app. */
  let actx;
  function ding(kind = "tick") {
    if (store.get("parchhai-muted") === "1") return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const now = actx.currentTime;
      const parts = kind === "bell" ? [[1, .12, 3.5], [2.01, .05, 2.4], [2.76, .045, 2], [5.4, .02, 1.2]] : [[3.2, .03, .08]];
      parts.forEach(([m, g, d]) => {
        const o = actx.createOscillator(), v = actx.createGain();
        o.frequency.value = 523 * m; v.gain.setValueAtTime(0, now); v.gain.linearRampToValueAtTime(g, now + .01); v.gain.exponentialRampToValueAtTime(.0001, now + d);
        o.connect(v).connect(actx.destination); o.start(now); o.stop(now + d + .05);
      });
    } catch {}
  }

  /* film grain texture */
  function grain() {
    const c = document.createElement("canvas"); c.width = c.height = 140;
    const x = c.getContext("2d"), d = x.createImageData(140, 140);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); root.style.setProperty("--grain", `url(${c.toDataURL()})`);
  }

  window.P = {
    LANGS, LANG_NAMES, BCP, store, ICON, icon, LOGO,
    get lang() { return lang; },
    t, strip, apply, setLang, register(d) { dicts.push(d); },
    toast, reveal, lightCards, esc, fmtTime, fmtDate, uid, avatar, ding, setMode,
    boot(init) {
      const start = async () => {
        await P.db?.ready?.();
        /* cloud mode: the family pages need a signed-in member of a family */
        const page = document.body.dataset.page;
        if (P.db?.cloud && ["record", "vault", "capsules"].includes(page) && !(P.db.signedIn() && P.db.hasFamily())) {
          location.replace(`start.html${P.db.signedIn() ? "" : "?signin"}`); return;
        }
        grain();
        setMode("elder", store.get("parchhai-elder") === "1");
        setMode("calm", store.get("parchhai-calm") === "1" || matchMedia("(prefers-reduced-motion: reduce)").matches);
        mountChrome(); mountHeroes();
        document.querySelectorAll("[data-icon]").forEach(el => { el.outerHTML = icon(el.dataset.icon); });
        init?.();
        apply(); reveal(); lightCards();
      };
      document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start) : start();
    },
  };
})();
