# Manual setup only

The first-boot provisioning runner and its manifest have been removed. This repository no longer contains an installer orchestration layer or starts setup tasks automatically.

Start the web application explicitly with `npm start` after its runtime dependencies are already available. Existing model weights, service installations, personal configuration and data are not deleted by this source change.
