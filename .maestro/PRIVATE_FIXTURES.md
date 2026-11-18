# Private QR acceptance fixture

The capture QR image contains a test check-in identifier. It is excluded from Git and project uploads. Configure the preview environment secret **file** variable `QA_CAPTURE_QR_IMAGE` with the exact synthetic staging fixture PNG before running `staging-capture-qr.yaml`. Maestro reads the provisioned file path; no payload belongs in source, logs, public artifacts or client-visible environment variables.

The file must match the isolated staging fixture manifest. Missing configuration is a blocked test, never a pass. Do not substitute production registrations or personal QR images. Refresh or remove the secret only with the corresponding test fixture lifecycle. `qa-gallery.png` is a non-sensitive synthetic image and remains committed.

Ordinary app builds and the other read-only tests require no capture QR image. No release branch or production backend is changed by fixture configuration.

Expo reference: https://docs.expo.dev/eas/environment-variables/manage/#secrets-and-file-variables
