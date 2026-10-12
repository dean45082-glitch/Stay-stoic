# Audio offline — NY sofisticado

Voice ID: `WbNN0ZquKxio6sawH5yC`. Model: `eleven_multilingual_v2`.

The initial authorized batch contains 455 unique MP3s: 363 expressions (8,122 estimated credits), 79 vocabulary items (991), and 13 structures (620). Total: **9,733 estimated credits**, below the approved cap of **9,771**. Shared phrases reuse one file. Three incomplete prompts remain on native TTS. Spoken text omits Spanish teaching annotations; displayed learning content remains unchanged.

The API secret exists only in GitHub Secrets. The generation workflow sends one request per missing recording and stops on failure; it does not automatically retry an uncertain billable request. `audio-assets` stores the durable ledger, checksums, audio, and playback index. Never delete the ledger to bypass its retry protection. Every MP3 is decoded and verified before packaging. Studying uses packaged files and makes no ElevenLabs calls. Missing files use Android/browser TTS.

Android APKs contain all completed audio. The offline web artifact contains the same files and a service worker; use **Guardar audios para usar sin conexión** after hosting it over HTTPS. Browser storage must have enough space. Native fallback offline availability depends on the installed device voice.

## Monthly continuation

The account was observed with a 10,000-credit monthly allowance, next reset November 12, 2026. Check the renewed balance before each subsequent batch, since other account activity also consumes credits. No recurring paid generation is scheduled.

After the initial batch, the current reviewed corpus has 532 files pending, estimated at 22,991 credits. With up to 9,800 credits per later cycle and unchanged content/pricing:

| Cycle after renewal | Additional files | Estimated credits |
| --- | ---: | ---: |
| November | 241 | 9,783 |
| December | 222 | 9,798 |
| January | 69 | 3,410 |

Prepare the next batch from a current checkout of `audio-assets` using `node scripts/plan-next-audio.cjs audio-store 9800`. This command only proposes missing files and never calls the API. Use a smaller budget if the account has fewer credits available. A later approved cycle must explicitly update the manifest batch and generator budget guard before live execution. Rerunning the initial batch after completion spends zero credits.

The complete reviewed runtime corpus is 987 unique recordings, estimated at 32,724 credits. These estimates exclude arbitrary user-entered text and currently inaccessible bank entries. Adding future content or changing voice/model/settings creates new recording identities. Keep existing assets for earlier releases.

If a run stops, retain its checkpoint artifact. Reconcile reserved/in-flight entries with the saved MP3s and ElevenLabs history before deciding whether a request can safely be retried. Do not automatically erase unresolved entries.
