FROM debian:13-slim

ARG VM_UID=1000
ARG VM_GID=1000

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends \
      ca-certificates \
      cloud-image-utils \
      curl \
      openssh-client \
      qemu-system-x86 \
      qemu-utils \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid "${VM_GID}" vmguest \
    && useradd --uid "${VM_UID}" --gid "${VM_GID}" --create-home --shell /usr/sbin/nologin vmguest

COPY --chmod=755 entrypoint.sh /usr/local/bin/vm-gemini-4-entrypoint

USER vmguest
WORKDIR /data
ENTRYPOINT ["/usr/local/bin/vm-gemini-4-entrypoint"]
