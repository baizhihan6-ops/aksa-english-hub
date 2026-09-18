# AKSA English Hub Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild AKSA English Hub as a monochrome, content-rich learning site with permanent Topics history and an adaptive Word Challenge, while removing AI and speech-assessment features.

**Architecture:** Keep the deployment static and GitHub Pages compatible. Split the monolithic page into focused browser scripts and UMD-style data files that work from both `file://` and HTTP; use Node's built-in test runner for content and learning-logic validation.

**Tech Stack:** HTML5, CSS, browser JavaScript, Web Speech Synthesis, localStorage, Node.js built-in tests, GitHub Actions, GitHub Pages.

---

### Task 1: Add validation baseline and modular shell

**Files:**
- Modify: `package.json`
- Create: `tests/content.test.js`
- Create: `tests/challenge.test.js`
- Create: `assets/site.css`
- Create: `app.js`

- [ ] **Step 1: Write failing tests** for minimum content counts, required word fields, unique IDs, lesson counts, Topics categories, mastery scoring, review intervals, and question selection.
- [ ] **Step 2: Run `npm test`** and confirm failure because the new data and challenge modules do not exist.
- [ ] **Step 3: Add the initial page shell and shared utilities** for navigation, TTS, localStorage recovery, keyboard access, and reduced-motion detection.
- [ ] **Step 4: Run syntax checks** with `node --check app.js` and keep the content tests failing until the data modules are added.
- [ ] **Step 5: Commit** with `test: define English Hub redesign contracts`.

### Task 2: Migrate and double learning content

**Files:**
- Create: `data/words.js`
- Create: `data/phrases.js`
- Create: `data/lessons.js`
- Create: `scripts/validate-content.js`
- Modify: `tests/content.test.js`

- [ ] **Step 1: Migrate the existing 274 technical and 667 daily/office terms** without dropping entries.
- [ ] **Step 2: Add one distinct related expression for every migrated term** so the final vocabulary contains at least 1,882 unique entries; every entry includes `id`, `term`, `zh`, `category`, `topic`, `difficulty`, pronunciation data, and bilingual example text.
- [ ] **Step 3: Expand the phrase bank** to at least 2,000 unique workplace expressions covering email, meetings, quotes, orders, payment, delivery, logistics, service, projects, training, and daily communication.
- [ ] **Step 4: Build 14 Dialogue lessons** with at least 100 bilingual lines and explicit lesson summaries, tags, and focus vocabulary.
- [ ] **Step 5: Run `node scripts/validate-content.js` and `npm test`**; expect all content assertions to pass.
- [ ] **Step 6: Commit** with `feat: expand English learning content`.

### Task 3: Implement adaptive Word Challenge

**Files:**
- Create: `word-challenge.js`
- Modify: `app.js`
- Modify: `index.html`
- Modify: `tests/challenge.test.js`

- [ ] **Step 1: Implement pure challenge functions** for scoring, mastery tiers, next-review dates, weighted selection, distractors, and tile shuffling.
- [ ] **Step 2: Implement spelling, listening, and mixed sessions** with 10/20 question options and category filters.
- [ ] **Step 3: Add adaptive tile-versus-typed spelling**, two-attempt hints, four-option listening, immediate bilingual feedback, favourites, and review queue actions.
- [ ] **Step 4: Persist the latest 100 complete sessions and older daily summaries** under a versioned localStorage key; recover safely from invalid stored data.
- [ ] **Step 5: Run `node --test tests/challenge.test.js`** and confirm mastery, fallback, prioritisation, and persistence helpers pass.
- [ ] **Step 6: Commit** with `feat: add adaptive word challenge`.

### Task 4: Add permanent Topics archive and updater

**Files:**
- Create: `data/topics/index.json`
- Create: `data/topics/archive.json`
- Create: `data/topics/2026-09-19.json`
- Create: `topics.js`
- Create: `scripts/update-topics.js`
- Create: `scripts/validate-topics.js`
- Modify: `.github/workflows/update-news.yml`
- Modify: `tests/content.test.js`

- [ ] **Step 1: Migrate all 10 existing Topics** into the permanent archive with stable IDs and preserved learning content.
- [ ] **Step 2: Add the initial dated set** with industry, world, and culture entries, source links, bilingual learning summaries, vocabulary, questions, and answer starters.
- [ ] **Step 3: Implement date/category/search filtering** and detail navigation that restores filters and scroll position.
- [ ] **Step 4: Implement an append-only updater** that deduplicates by normalized URL/title, never overwrites historical dates, preserves the last successful set on failure, and validates before writing.
- [ ] **Step 5: Schedule the workflow for 08:00 Asia/Shanghai** and preserve manual dispatch.
- [ ] **Step 6: Run `node scripts/validate-topics.js` and `npm test`** and confirm archive and daily-category checks pass.
- [ ] **Step 7: Commit** with `feat: add permanent daily topics archive`.

### Task 5: Build the approved monochrome interface

**Files:**
- Replace: `index.html`
- Modify: `assets/site.css`
- Modify: `app.js`
- Reuse: `assets/aksa-diesel-generator-hero-bw.png`

- [ ] **Step 1: Build the seven-view navigation** for Home, Dialogue, Vocabulary, Word Challenge, Grammar, Topics, and Dashboard.
- [ ] **Step 2: Add the full-bleed generator hero** with pointer scan lens, crosshair, requestAnimationFrame parallax, and a static mobile/reduced-motion fallback.
- [ ] **Step 3: Add the continuous ticker, scroll reveal, inverted editorial rows, keyboard focus equivalents, stable controls, and monochrome feedback states.**
- [ ] **Step 4: Render searchable/paginated vocabulary and phrases**, bilingual examples, Dialogue lessons, Dashboard metrics, review queue, and recent results.
- [ ] **Step 5: Run HTML/JS syntax and DOM smoke checks** and confirm there are no AI, microphone, recording, red, green, gradient, or obsolete view references.
- [ ] **Step 6: Commit** with `feat: rebuild English Hub interface`.

### Task 6: Remove obsolete AI and speech-assessment assets

**Files:**
- Delete: `AI/ai2.html`
- Delete: `speech-cloud.js`
- Delete: `speech-config.js`
- Delete: `server/`
- Delete: `edge-functions/`
- Modify: `package.json`
- Modify: `sw.js`
- Modify: `manifest.json`

- [ ] **Step 1: Remove AI and microphone-only files** and unused server dependencies while retaining browser speech synthesis.
- [ ] **Step 2: Replace the service worker cache list** with the new shell, data modules, challenge code, topic index/archive, and current dated Topic file.
- [ ] **Step 3: Update manifest colours to monochrome** and keep the existing installable site identity.
- [ ] **Step 4: Run `npm test` and repository-wide forbidden-term checks**; references in documentation and tests describing removal are allowed, production assets are not.
- [ ] **Step 5: Commit** with `chore: remove AI and speech assessment`.

### Task 7: Browser QA and responsive repair

**Files:**
- Modify as needed: `index.html`, `assets/site.css`, `app.js`, `word-challenge.js`, `topics.js`
- Create: `tests/ui-smoke.js`

- [ ] **Step 1: Start a local static server** and run Playwright smoke flows through all seven views.
- [ ] **Step 2: Complete one spelling session and one listening/mixed flow**, including a simulated no-TTS fallback.
- [ ] **Step 3: Capture and inspect screenshots** at 1440x1000, 768x1024, and 390x844; check hero framing, overflow, navigation, long text, controls, and Topics detail layout.
- [ ] **Step 4: Test reduced motion, keyboard-only navigation, and localStorage reload persistence.**
- [ ] **Step 5: Run final `npm test`, content validators, link checks, and console-error checks.**
- [ ] **Step 6: Commit** with `test: verify responsive English Hub flows`.

### Task 8: Publish and verify GitHub Pages

**Files:**
- No new source files unless production verification finds a defect.

- [ ] **Step 1: Confirm the backup branch still exists** and the worktree is clean except ignored browser artifacts.
- [ ] **Step 2: Push `gh-pages`** only after every local check passes.
- [ ] **Step 3: Verify the public GitHub Pages URL** loads the new shell, assets, content counts, Word Challenge, and Topics archive.
- [ ] **Step 4: Repeat the mobile viewport smoke check against production** and report the public URL plus verified counts.

