FROM debian:13-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      cpio \
      debootstrap \
      dpkg-dev \
      gnupg \
      debian-archive-keyring \
      dosfstools \
      grub-common \
      grub-efi-amd64-bin \
      isolinux \
      live-build \
      mtools \
      squashfs-tools \
      syslinux \
      syslinux-common \
      xz-utils \
      zstd \
      xorriso \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
