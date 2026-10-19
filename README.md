# Parchhai · परछाईं

> *Kyunki unki parchhai kabhi saath nahi chhodti.*
> Because their shadow never leaves you.

Parchhai is a multilingual, voice-first web app that helps families keep the voices, stories and wisdom of their elders, in the elder's own language. Gentle questions are read aloud in the elder's mother tongue, and their real voice is recorded and kept in a family vault. Years later, anyone in the family can search it and hear the answer.

**Languages:** English · हिंदी · ਪੰਜਾਬੀ · தமிழ்

## Pages

| Page | File | What it does |
|---|---|---|
| Landing | `index.html` | Light a diya to choose a language, a cinematic splash, and a dawn-over-the-village homepage with the story, a memory sky and demos |
| Begin | `start.html` | Onboarding: you, your elder (photo, what you call them), their language, and consent |
| Record | `record.html` | The interview studio: one question at a time, read aloud in a warm voice, recorded in the browser with live transcription where supported |
| Vault | `vault.html` | An elder's stories as cards or as a sky of stars, with "ask the vault" search, theme filters and story players |
| Capsules | `capsule.html` | Seal a note and a story in wax until a future date, then press and hold the seal to open it |
| About | `about.html` | Mission, promises, the *Voices without families* volunteer programme, and FAQs |

## Run it in VS Code

No build step and no dependencies.

1. Open the folder in VS Code.
2. Install the recommended **Live Server** extension (VS Code will offer it).
3. Right-click `index.html` and choose **Open with Live Server**.

Recording needs a secure context, so use Live Server (`http://127.0.0.1`) rather than opening the file directly. Chrome or Edge gives the best voices and live transcription.

## Backend (Supabase)

Parchhai runs in two modes with the same code:

| | Offline (default) | Cloud (Supabase) |
|---|---|---|
| Accounts | none, one device | email + password |
| Storage | this browser (localStorage + IndexedDB) | Postgres + a private `audio` bucket |
| Family sharing | no | yes, via an 8-character invite code shown in the vault |

### Switch on the cloud

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: paste all of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and run it. This creates the tables, the security rules and the private audio bucket. It is safe to run again.
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key into [`assets/js/config.js`](assets/js/config.js).
4. **Authentication → URL Configuration**: set *Site URL* to where the app runs (for Live Server, `http://127.0.0.1:5500`).
5. Optional, for demos: **Authentication → Providers → Email**, turn off *Confirm email* so new families can start straight away.

Never put the `service_role` key in the app. The anon key is meant to be public. Row-level security makes sure each family can only read and write its own elders, stories, capsules and audio. Anyone can submit the volunteer form, but nobody can read the sign-ups from the app. Read them in the Supabase dashboard.

### Data model

```
families ──< family_members >── auth.users
    │
    ├──< elders ──< stories ──> storage: audio/<family_id>/<story_id>.webm
    └──< capsules (optional link to a story)
volunteers (insert-only)
```

`create_family()` and `join_family(code)` are the only server functions. Everything else is plain table access guarded by `is_family_member(family_id)`.

## How it works

```
assets/
  css/app.css          design system for the app pages (dawn palette, glass cards, forms)
  js/core.js           translations, nav + mobile tab bar, elder/calm modes, toasts
  js/config.js         Supabase URL + anon key (empty = offline mode)
  js/db.js             data layer: offline (localStorage + IndexedDB) or Supabase, same API
  vendor/supabase-js@2.45.4/  pinned Supabase client (MIT), no CDN needed
  js/questions.js      21 interview questions × 4 languages, in 6 themes
  js/voice.js          warm interviewer voice: picks the most natural device voice
  js/player.js         story player with real waveform peaks and seeking
  js/pages/*.js        one script per page, each with its own strings
index.html             landing page (self-contained, with its own synthesized sound)
```

- **Voice:** questions are spoken with the Web Speech API, which prefers "Natural"/"Neural" voices, speaks slightly slower and softer, and addresses the elder by name ("Nani ji, …"). Desktop browsers rarely ship a Punjabi voice, so Punjabi questions fall back to Hindi.
- **Recording:** `MediaRecorder` with echo cancellation and noise suppression, a live visualiser, and `SpeechRecognition` for a first-draft transcript that families can correct.
- **Privacy:** offline mode keeps everything in the browser. Cloud mode stores audio in a private bucket that only family members can read. `db.js` is the only file that touches storage.
- **Accessibility:** elder mode (larger text), calm mode (no motion, and on automatically when the device asks for reduced motion), keyboard support (space to record), captions on every story, and screen-reader labels.
- **Sound:** the landing page has a synthesized diya and tanpura soundscape. The app pages stay quiet apart from soft confirmation chimes.

## Promise

Parchhai will never create an artificial copy of anyone's voice. Every word you hear in a vault was truly spoken by them.

## Roadmap

- [x] Cloud sync and family sharing (Supabase auth, Postgres, private audio storage)
- [ ] Server-side search across transcripts (pgvector)
- [ ] Server-side transcription and translation for all four languages
- [ ] Missed-call / IVR recording for elders without smartphones
- [ ] Printable memory book with QR codes that play each story
- [ ] More languages: Bengali, Marathi, Telugu, Malayalam
- [ ] Native-speaker review of Punjabi and Tamil copy
