# AKSA English Corner Login, IPA and Mobile Audio Fix

## Scope

This change fixes the three problems reported from the live iPhone experience:

1. Visitors currently enter Home without the login step that existed in the previous version.
2. Text glyphs such as play and diagonal arrows render as coloured iOS emoji.
3. Speech synthesis can be silent on iPhone, especially while the Ring/Silent switch is enabled or when playback is not initiated directly by a user gesture.
4. Some vocabulary IPA values are inaccurate, incorrectly stressed or are plain spelling wrapped in phonetic slashes.

The site remains a static GitHub Pages application. This is a local employee profile, not password-based authentication and not a cloud account.

## Restored Login Flow

- The previous product flow is restored: visitors without a saved profile see login before Home.
- Both `Name` and `Department` are required.
- The old optional Invite Code is deliberately not restored because its leaderboard no longer exists.
- The form uses the approved `Signal Grid` direction: black-and-white grid, moving signal lines, rotating locator and compact system-status details.
- `Name` and `Department / Position` are stacked vertically and each uses the full form width on mobile and desktop.
- Motion respects `prefers-reduced-motion` and collapses to a static composition without losing hierarchy.
- Submitting the form stores the profile inside the existing local application record and reveals Home.
- Returning visitors using the same browser continue directly to the site.
- Existing profiles stored by the old site under `aksa_user_data` are imported automatically, so previous visitors do not have to type their details again.
- The header shows a compact personal identity control after entry.
- Dashboard includes a profile section where the visitor can edit their name or department.
- Clearing learning progress preserves the profile. A separate profile edit action handles identity changes.
- Existing version-2 learning records migrate in place; progress, sessions, favourites and incomplete challenges are retained.

## IPA Correction

- All 1,882 vocabulary entries are revalidated as British English IPA rather than repairing only the visible examples.
- Single-word pronunciations use the MIT-licensed Britfone British English dictionary where available.
- Multiword terms are assembled from validated word pronunciations with phrase-level stress normalisation, not by inserting a primary-stress marker before every component.
- Generator-set specialist vocabulary absent from the dictionary uses a reviewed technical override list.
- Plain spelling inside `/ /`, unsupported characters and empty transcriptions fail content validation.
- The interface retains full IPA Unicode characters and uses a phonetic-safe font stack so stress, length and schwa symbols render correctly on iPhone.

## Audio Playback

- Audio logic moves into a small independently testable browser module.
- On supported Apple browsers, the module sets `navigator.audioSession.type` to `playback` before speaking. This prevents the default ambient audio category from being silenced by the iPhone Ring/Silent switch.
- Voices are refreshed at startup and on `voiceschanged`; British English remains preferred, followed by any available English voice.
- Each utterance uses explicit language, volume and rate values and is retained until completion.
- Playback starts synchronously from the visitor's tap. Listening questions no longer use delayed, non-gesture autoplay.
- The active button visibly switches from the speaker icon to a stop icon and returns to the speaker icon after completion or failure.
- Speech errors and unsupported browsers produce a concise status message instead of failing silently.
- Navigation and Stop actions cancel active speech and reset the active control.

## Icon System

- Emoji and text glyphs used as interface controls are replaced with locally hosted Lucide icons.
- Audio uses `volume-2`; playing state uses `square`; directional actions use `arrow-right` or `arrow-up-right`; favourites use `star`.
- Icons inherit the monochrome interface and remain legible in normal, hover and active states.
- Every icon-only button keeps an accessible text label.

## Data Flow

1. The application loads and migrates the local store to version 3, including old `aksa_user_data` when present.
2. If `store.profile` is missing, the Signal Grid login view blocks the application shell.
3. A valid profile submission saves locally and initializes the requested route.
4. A speech button passes text and button state callbacks to the audio module.
5. The audio module configures the platform audio session, selects a voice and reports start, finish or error back to the UI.

## Error Handling

- Empty profile fields remain on the form with field-level validation.
- Storage failure still allows the current session to continue and shows the existing storage warning.
- Missing speech APIs display a clear playback-unavailable message.
- Speech startup failure resets the button and displays a message recommending a second tap or media-volume check.
- Unsupported `navigator.audioSession` implementations fall back safely to normal speech synthesis.

## Verification

- Unit tests cover audio-session configuration, English voice selection, utterance settings and lifecycle callbacks.
- Shell tests verify the Signal Grid login, vertically stacked fields, profile controls, local icon assets and removal of emoji control glyphs.
- Content tests verify IPA format, eliminate plain-spelling placeholders and assert corrected transcriptions for representative technical and compound terms.
- Existing content, challenge and Topics tests must remain green.
- Browser QA covers first visit, returning visit, profile editing, Vocabulary playback, Dialogue playback, Listening Challenge playback, navigation cancellation and mobile overflow.
- The live GitHub Pages site is checked after deployment with a fresh browser profile and a mobile viewport.

## Out of Scope

- Password authentication, employee verification and administrator accounts.
- Cloud synchronization between devices or browsers.
- Uploading personal profile data to a server.
- Invite codes and the removed leaderboard.
- Restoring the removed microphone recording or pronunciation-assessment features.
