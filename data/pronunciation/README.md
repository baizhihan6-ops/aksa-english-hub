# British pronunciation data

Vocabulary IPA is rebuilt from two deterministic sources:

1. `britfone-used.json` is the subset used by this project from Britfone 3.0.1, pinned at commit `1062be14adc96c358f2087ac5449d72130c7a6f4`. Britfone is MIT licensed and provides British RP / Standard Southern British IPA.
2. `technical-overrides.json` contains reviewed generator-set terms, brand names, abbreviations and compounds where a general dictionary or grapheme-to-phoneme fallback is not reliable.

Unknown tokens fall back to `phonemize@2.0.1` with `language: en-GB`. Its output must be reviewed when the rebuild report marks a technical or compound term as a fallback.

To refresh the reduced Britfone subset from the pinned checkout:

```powershell
$env:BRITFONE_CSV = 'path\to\britfone.main.3.0.1.csv'
node scripts/extract-britfone-used.js
node scripts/rebuild-ipa.js
```

Do not hand-edit `data/words.js` IPA fields. Update an override or the pinned source and rebuild instead.
