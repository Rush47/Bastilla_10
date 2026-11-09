# SVL System Debian package

This directory builds the local SVL System panel as
`bastillaos-system_<version>_amd64.deb` for the Debian amd64 ISO target.
The build consumes the repository's existing `dist/` and `node_modules/`; it does
not build the frontend. It fails early if either is missing.

```sh
./bastillaos/system-package/build-package.sh
./bastillaos/system-package/test-package.sh
```

`build-package.sh` follows the `build-iso.sh` contract: it consumes the
repository's already-generated `dist/` and
`bastillaos/build/server.mjs` (from `npm run build:server`), validates
production runtime dependencies and the resulting `.deb`, and writes exactly
one package to `OUTPUT_DIR`. The default is `bastillaos/build`. For example:

```sh
OUTPUT_DIR="$HOME/debs" ./bastillaos/system-package/build-package.sh
```

The systemd service runs as `root` so the Triad's `root exec` terminal can
modify the installed BastillaOS system. It listens only on `127.0.0.1:3000`;
do not expose this service to a network. Any local process that can reach its
HTTP API can execute commands with root privileges. Its CWD is
`/var/lib/bastillaos/system`. On each start, the service helper copies only
missing default files from
`/usr/share/bastillaos/system-defaults`; existing datastore and application
files are never replaced. The service has full host filesystem access.
Optional API credentials belong in `/etc/bastillaos/system.env`, owned by root
and not writable by the desktop user.
Executable code and the generated frontend live under
`/usr/lib/bastillaos/system`. No desktop launcher is included; KDE launcher
integration belongs to the separate branding package.
