# BastillaOS live-build

This directory contains a Debian `live-build` configuration for an amd64
hybrid ISO based on Debian 13.7 (Trixie), with KDE Plasma, Debian Installer,
non-free firmware, Wi-Fi support, and PipeWire audio.

## Build

The supported full ISO build is orchestrated from the repository root:

```sh
bash bastillaos/build-iso.sh
```

See [`../README.md`](../README.md) for host prerequisites. The wrapper builds
the frontend and production server, creates the Debian system package, stages
that package together with the branding and security files, and runs
`live-build` inside the Debian 13 builder container. Running `lb build` from
this directory alone does not produce the complete BastillaOS image; the
wrapper stages required inputs before invoking live-build.

`auto/config` configures both the live system and Debian Installer to use
Trixie. Its normal Debian mirrors track the current Trixie archive, including
security and point-release updates. Thus the recipe is repeatable in its
architecture, suite, and package selection, but builds are not bit-for-bit
reproducible as archive contents advance. The ISO name/volume retain the 13.7
baseline label; they do not freeze package versions at the 13.7 release date.

The BastillaOS runtime list provides Python 3, a venv, sudo, and general
system-management dependencies. The wrapper places the generated
`bastillaos-system` package in `config/packages.chroot/`; its Debian control
file declares package-specific dependencies.

## Validation

The configuration can be checked without building the full image:

```sh
sh -n auto/config
lb config --validate
```

The second command requires the Debian `live-build` package and should be run
from this directory. A complete build additionally requires network access,
root privileges, and sufficient disk space for a full KDE image.
