# Camp QR and evaluator audio acceptance

This is the React Native application only: jarchert/offerhound-rn-v2, Expo @jarchert/offerhound-v2. The owner requires an independent repository, history, dependencies, build, version and release. No web source or migration is included. Historical native port headers remain provenance, not permission to import web source. Backend changes belong to the independently reviewed web/backend repository.

## Behavior contract

- Registration staff submit a complete enrollment token with the expected authenticated actor. The server validates camp, enrollment status and expiry; repeat scans preserve the original check-in timestamp. Offline QR work remains unconfirmed until server replay.
- The QR camera requests permission only on user action, pauses after one decode, and releases the camera on blur/background. Manual entry and native QR image decoding remain available. Simulator image decoding does not certify a physical camera.
- Accepted evaluators record at most two minutes. Audio is associated with camp, enrollment, evaluator, drill and performance entry. Upload and metadata save reuse a single identity after an unconfirmed response.
- Storage is private. Saved playback obtains a 90-second URL; the URL is never persisted. Previously issued URLs may remain cached until expiry. Owner/author authorization is checked for new playback. Other evaluators cannot read another evaluator's audio.
- Cancel/discard, interruption, microphone denial, local preview, saved playback, persistence after restart, and file-before-metadata deletion are acceptance cases. Written notes remain available if recording fails.

## Verification

`npm run ci` includes nine core capture cases plus existing guest, auth, staging, push-isolation and navigation checks. An independent native SDK run against the isolated staging backend passed 18 QR/audio contract scenarios; this tests authorization and persistence, not microphone hardware.

`.eas/workflows/qa-camp-capture.yml` creates fresh simulator/APK builds and runs separate iOS/Android Maestro flows. Do not repack binaries predating expo-camera or audio plugin changes. Fixtures and QA credentials are supplied through project-scoped preview variables; passwords are encrypted and absent from source. The QR PNG is synthetic and its enrollment is removed after acceptance.

Physical iPhone and Android live camera/microphone tests remain required. A simulator run cannot certify either sensor. Do not mark capture release acceptance complete until actual build IDs, commit, role, platform and results are recorded. No production migration, merge, release, or store submission is authorized by this test workflow.
