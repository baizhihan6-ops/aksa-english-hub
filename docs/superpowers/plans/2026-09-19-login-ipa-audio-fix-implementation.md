# Login, IPA and Mobile Audio Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the old login-before-Home flow with the approved Signal Grid design, correct all vocabulary IPA values, replace emoji controls and make speech playback reliable on iPhone.

**Architecture:** Keep the GitHub Pages application static and local-first. Add focused UMD modules for profile migration and speech control, keep UI orchestration in `app.js`, and rebuild the checked-in vocabulary data from a pinned British pronunciation source plus reviewed technical overrides. The browser stores identity and progress together while importing the old `aksa_user_data` profile when present.

**Tech Stack:** HTML, CSS, browser JavaScript, Node.js test runner, localStorage, Web Speech API, AudioSession API, Lucide static SVGs, Britfone 3.0.1, `phonemize` fallback, GitHub Pages.

---

## File Structure

- Create `profile.js`: pure profile/store migration and learning-data reset helpers.
- Create `audio.js`: testable speech-synthesis controller and iOS audio-session configuration.
- Create `data/pronunciation/britfone-used.json`: reduced British IPA lexicon containing only words used by the site.
- Create `data/pronunciation/technical-overrides.json`: reviewed generator-set and workplace pronunciation overrides.
- Create `data/pronunciation/README.md`: pronunciation sources, pinned revision and regeneration rules.
- Create `scripts/rebuild-ipa.js`: deterministic vocabulary IPA rebuild.
- Create `tests/profile.test.js`: profile migration and reset tests.
- Create `tests/audio.test.js`: audio-session, voice and lifecycle tests.
- Modify `tests/app-shell.test.js`: login structure, local icons and emoji-removal assertions.
- Modify `tests/content.test.js`: IPA validation and representative technical-term assertions.
- Modify `index.html`: Signal Grid login, profile controls and local module loading.
- Modify `assets/site.css`: login composition, profile UI, icon masks and IPA-safe typography.
- Modify `app.js`: profile gate, profile editing, audio-controller integration and gesture-safe listening flow.
- Modify `data/words.js`: regenerated British IPA values for all 1,882 entries.
- Modify `package.json` and `package-lock.json`: pronunciation build dependencies.
- Modify `sw.js`: cache the new modules, icons and updated shell version.

### Task 1: Profile Migration and Local Identity Core

**Files:**
- Create: `profile.js`
- Create: `tests/profile.test.js`
- Modify: `app.js`

- [ ] **Step 1: Write failing profile migration tests**

Add tests that require `profile.js` and assert these exact behaviours:

```js
test('imports the old aksa_user_data profile into a version 3 store', () => {
  const oldProfile = JSON.stringify({ name: 'Jason Bo', dept: 'Domestic Sales' });
  const result = Profile.migrate(null, oldProfile);
  assert.equal(result.version, 3);
  assert.deepEqual(result.profile, { name: 'Jason Bo', department: 'Domestic Sales' });
});

test('preserves version 2 learning records while adding a profile', () => {
  const v2 = JSON.stringify({ version: 2, progress: { w1: { mastery: 80 } }, sessions: [], dailySummaries: {}, favorites: ['w1'], incomplete: null });
  const result = Profile.migrate(v2, JSON.stringify({ name: 'Mei', dept: 'Sales' }));
  assert.equal(result.progress.w1.mastery, 80);
  assert.deepEqual(result.favorites, ['w1']);
  assert.deepEqual(result.profile, { name: 'Mei', department: 'Sales' });
});

test('clearing learning data keeps the employee profile', () => {
  const result = Profile.clearLearning({ version: 3, profile: { name: 'Mei', department: 'Sales' }, progress: { w1: {} }, sessions: [{}], dailySummaries: {}, favorites: ['w1'], incomplete: {} });
  assert.deepEqual(result.profile, { name: 'Mei', department: 'Sales' });
  assert.deepEqual(result.progress, {});
  assert.deepEqual(result.sessions, []);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/profile.test.js`

Expected: FAIL because `profile.js` does not exist.

- [ ] **Step 3: Implement the profile module**

Create a UMD module exporting `emptyStore(profile)`, `normaliseProfile(value)`, `migrate(currentRaw, legacyRaw)` and `clearLearning(store)`. `normaliseProfile` must trim both fields and return `null` unless both are non-empty. `migrate` must tolerate malformed JSON, preserve valid learning collections, prefer `store.profile`, fall back to old `{name, dept}`, and always return version 3.

- [ ] **Step 4: Integrate store loading without changing the UI yet**

Load `profile.js` before `app.js`, replace the local `emptyStore` and parsing logic with `window.AKSAProfile.migrate(localStorage.getItem(STORE_KEY), localStorage.getItem('aksa_user_data'))`, and make the Dashboard clear action use `clearLearning(store)`.

- [ ] **Step 5: Run profile and existing tests**

Run: `node --test tests/profile.test.js tests/challenge.test.js tests/topics.test.js`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add profile.js tests/profile.test.js app.js index.html
git commit -m "feat: restore local employee profile migration"
```

### Task 2: Signal Grid Login and Profile Editing

**Files:**
- Modify: `tests/app-shell.test.js`
- Modify: `index.html`
- Modify: `assets/site.css`
- Modify: `app.js`

- [ ] **Step 1: Add failing shell assertions**

Extend the shell test to require `#profileGate`, `#profileForm`, `#profileName`, `#profileDepartment`, `#headerProfile`, `#editProfile`, the `signal-grid` class and two vertically stacked form labels. Assert that `Invite Code` and `input-code` do not exist.

- [ ] **Step 2: Run the shell test and verify RED**

Run: `node --test tests/app-shell.test.js`

Expected: FAIL because the login and profile controls are absent.

- [ ] **Step 3: Add the login and Dashboard markup**

Insert a full-screen `#profileGate` before the site header. Use the approved copy `Connect to English Corner.`, required `Your Name` and `Department / Position` fields in separate labels, and `Connect to English Corner` submit button. Add a compact `#headerProfile` button and a Dashboard profile band containing saved name, department and an `#editProfile` command.

- [ ] **Step 4: Implement the Signal Grid visual system**

Add a black full-screen composition with a stable 54px grid, three animated signal lines, a rotating locator, system-status text and a vertically stacked form. Use `min-height: 100dvh`, safe-area padding and a 390px mobile breakpoint. Disable the signal and locator animations under `prefers-reduced-motion`.

- [ ] **Step 5: Implement profile-gate behaviour**

Add `openProfileGate(mode)`, `closeProfileGate()`, `saveProfile(event)` and `renderProfile()` in `app.js`. Initialisation must keep the shell inert and hidden until a valid profile exists. Editing pre-fills both fields. Successful save writes the version-3 store, removes old `aksa_user_data`, updates header and Dashboard, and returns to the previous route.

- [ ] **Step 6: Run shell and profile tests**

Run: `node --test tests/app-shell.test.js tests/profile.test.js`

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html assets/site.css app.js tests/app-shell.test.js
git commit -m "feat: add Signal Grid employee login"
```

### Task 3: Rebuild British IPA Data

**Files:**
- Create: `data/pronunciation/britfone-used.json`
- Create: `data/pronunciation/technical-overrides.json`
- Create: `data/pronunciation/README.md`
- Create: `scripts/rebuild-ipa.js`
- Modify: `tests/content.test.js`
- Modify: `data/words.js`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add failing IPA-quality tests**

Add assertions that every IPA value is wrapped in `/.../`, contains at least one IPA vowel, does not equal the lower-cased term with punctuation removed, and contains none of `turbocharger`, `synchronous`, `contactor`, `stator`, `trigeneration`, `busbar`, `inverter`, `login` or `logout` as plain spelling. Add exact representative expectations:

```js
const expected = {
  Alternator: '/ˈɔːltəneɪtə/',
  'Standby Power': '/ˈstændbaɪ ˈpaʊə/',
  Turbocharger: '/ˈtɜːbəʊˌtʃɑːdʒə/',
  Synchronous: '/ˈsɪŋkrənəs/',
  Busbar: '/ˈbʌsbɑː/'
};
for (const [term, ipa] of Object.entries(expected)) {
  assert.equal(words.find(item => item.term === term).ipa, ipa);
}
```

- [ ] **Step 2: Run content tests and verify RED**

Run: `node --test tests/content.test.js`

Expected: FAIL on plain-spelling placeholders and representative terms.

- [ ] **Step 3: Add the deterministic pronunciation sources**

Add `phonemize@2.0.1` as a development dependency. Generate `britfone-used.json` from Britfone 3.0.1 commit `1062be14adc96c358f2087ac5449d72130c7a6f4`, retaining only vocabulary tokens used by this project. Document the MIT source and pinned commit in `data/pronunciation/README.md`.

- [ ] **Step 4: Add reviewed specialist overrides**

Create `technical-overrides.json` with reviewed British IPA for generator-set terms and known fallback failures, including at minimum alternator, attenuated, turbocharger, synchronous, contactor, stator, cogeneration, trigeneration, busbar, inverter, genset, kilovolt, megawatt, microprocessor, rectifier, commissioning, synchronization, aftercooler, Modbus, earthing, actuator and solenoid.

- [ ] **Step 5: Implement and run the IPA rebuild**

`scripts/rebuild-ipa.js` must resolve each term in this order: whole-term override, token override, pinned Britfone token, `phonemize(term, { language: 'en-GB' })`. It must remove phoneme-separating spaces inside each word, preserve spaces between term words, wrap one slash pair around the final transcription, reject plain spelling and write `data/words.js` in the existing UMD format.

Run: `node scripts/rebuild-ipa.js`

Expected: report 1,882 rebuilt entries, zero plain-spelling IPA values and a list of fallback terms for manual review.

- [ ] **Step 6: Review the fallback report and extend overrides**

Inspect every term reported as a fallback, compare it with the English voice and the British transcription source, and add an override whenever compound splitting, stress or a specialist brand name is wrong. Re-run until the report contains no unresolved high-risk technical terms.

- [ ] **Step 7: Run content validation**

Run: `node --test tests/content.test.js && npm run validate`

Expected: tests PASS; validation reports 1,882 words and no invalid IPA.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json data/words.js data/pronunciation scripts/rebuild-ipa.js tests/content.test.js
git commit -m "fix: rebuild vocabulary with British IPA"
```

### Task 4: iPhone Audio Controller and Monochrome Icons

**Files:**
- Create: `audio.js`
- Create: `tests/audio.test.js`
- Create: `assets/icons/volume-2.svg`
- Create: `assets/icons/square.svg`
- Create: `assets/icons/arrow-right.svg`
- Create: `assets/icons/arrow-up-right.svg`
- Create: `assets/icons/star.svg`
- Modify: `index.html`
- Modify: `assets/site.css`
- Modify: `app.js`
- Modify: `tests/app-shell.test.js`

- [ ] **Step 1: Write failing audio-controller tests**

Test `configureAudioSession(navigatorLike)` sets `audioSession.type` to `playback`; `pickVoice` prefers `en-GB` then any English voice; `createController(env).speak(text, callbacks)` creates a retained utterance with `lang = 'en-GB'`, `rate = 0.88`, `volume = 1`, calls `resume()` when paused, and invokes start/end/error callbacks.

- [ ] **Step 2: Run the focused audio test and verify RED**

Run: `node --test tests/audio.test.js`

Expected: FAIL because `audio.js` does not exist.

- [ ] **Step 3: Implement `audio.js`**

Create a UMD module with `configureAudioSession`, `pickVoice` and `createController`. Keep the current utterance in module state until `onend` or `onerror`. Refresh voices immediately and on `voiceschanged`. `cancel()` must reset the active UI callback.

- [ ] **Step 4: Add local Lucide assets and CSS masks**

Copy the five icons from the Lucide static package into `assets/icons`. Render them through `.ui-icon` mask classes so they inherit black or white. Replace all `▶`, `↗`, `→` and `☆` control glyphs with the corresponding local icon while preserving accessible labels.

- [ ] **Step 5: Integrate the audio controller**

Load `audio.js` before `app.js`. Replace the current `speak` implementation with controller callbacks that toggle `playing`, swap volume/square icons and show a clear toast on error. Route changes and Stop call `controller.cancel()`.

- [ ] **Step 6: Remove delayed listening playback**

Delete the 180ms `setTimeout` autoplay. Pass an `autoPlay` flag from `Start challenge` and `Next question` click handlers so listening audio begins synchronously inside the user's tap. A page-load restoration must render without autoplay.

- [ ] **Step 7: Run audio and shell tests**

Run: `node --test tests/audio.test.js tests/app-shell.test.js tests/challenge.test.js`

Expected: all tests PASS and shell source contains no emoji control glyphs.

- [ ] **Step 8: Commit**

```bash
git add audio.js assets/icons index.html assets/site.css app.js tests/audio.test.js tests/app-shell.test.js
git commit -m "fix: make mobile speech playback reliable"
```

### Task 5: Cache, Browser QA and Publication

**Files:**
- Modify: `sw.js`

- [ ] **Step 1: Update the application shell cache**

Change the cache name to `aksa-english-corner-v10` and add `profile.js`, `audio.js` and all five icon files to `APP_SHELL`.

- [ ] **Step 2: Run the complete automated verification**

Run: `npm ci --ignore-scripts && npm test && npm run validate && npm audit --omit=dev && git diff --check`

Expected: all tests PASS, content validation passes, production dependencies have zero known vulnerabilities and no whitespace errors are reported.

- [ ] **Step 3: Run local mobile browser QA**

With a fresh browser profile at 390x844, verify login blocks Home, fields are vertical, invalid submission remains blocked, successful login opens Home, reload skips login, profile editing updates Dashboard, and every route has zero horizontal overflow.

- [ ] **Step 4: Verify speech event flow in a real browser**

Instrument `speechSynthesis` and `navigator.audioSession` in the browser to confirm Vocabulary, Dialogue and Listening Challenge clicks set `playback`, call `speak` synchronously and restore the icon on end. Confirm unsupported speech produces a visible error status.

- [ ] **Step 5: Commit the cache update**

```bash
git add sw.js
git commit -m "chore: refresh offline application shell"
```

- [ ] **Step 6: Publish to GitHub Pages**

Fetch `origin/gh-pages`, confirm the local branch has no remote-only commits, push `gh-pages`, and wait for the `pages-build-deployment` workflow to succeed.

- [ ] **Step 7: Verify the public site**

Open `https://baizhihan6-ops.github.io/aksa-english-hub/` with a cache-busting query in a fresh mobile browser context. Repeat the login, IPA sample, audio-event and overflow checks; confirm zero console errors.
