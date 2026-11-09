#!/bin/sh
set -eu

IMAGE_NAME="debian-13-genericcloud-amd64.qcow2"
IMAGE_BASE_URL="https://cloud.debian.org/images/cloud/trixie/latest"
BASE_IMAGE="/data/${IMAGE_NAME}"
CHECKSUM_FILE="/tmp/SHA512SUMS"
IMAGE_TEMP="/data/.${IMAGE_NAME}.download"
SSH_KEY="/data/id_ed25519"
USER_DATA="/tmp/user-data"
META_DATA="/tmp/meta-data"
SEED_IMAGE="/data/seed.iso"
DISK_IMAGE="/data/vm-gemini-4-restricted.qcow2"

if [ ! -s "$BASE_IMAGE" ]; then
  curl --fail --location --retry 3 --silent --show-error \
    "${IMAGE_BASE_URL}/SHA512SUMS" --output "$CHECKSUM_FILE"
  expected_checksum="$(awk -v filename="$IMAGE_NAME" '$2 == filename || $2 == "*" filename { print $1; exit }' "$CHECKSUM_FILE")"
  case "$expected_checksum" in
    ''|*[!0-9a-fA-F]*)
      echo "Official Debian image checksum is missing or invalid." >&2
      exit 1
      ;;
  esac
  if [ "${#expected_checksum}" -ne 128 ]; then
    echo "Official Debian image checksum has an unexpected length." >&2
    exit 1
  fi
  trap 'rm -f "$IMAGE_TEMP"' EXIT HUP INT TERM
  curl --fail --location --retry 3 --silent --show-error \
    "${IMAGE_BASE_URL}/${IMAGE_NAME}" --output "$IMAGE_TEMP"
  printf '%s  %s\n' "$expected_checksum" "$IMAGE_TEMP" | sha512sum --check --status
  mv "$IMAGE_TEMP" "$BASE_IMAGE"
  trap - EXIT HUP INT TERM
fi

if [ ! -s "$SSH_KEY" ]; then
  ssh-keygen -q -t ed25519 -N '' -C vm-gemini-4 -f "$SSH_KEY"
fi

if [ ! -s "${SSH_KEY}.pub" ]; then
  ssh-keygen -y -f "$SSH_KEY" > "${SSH_KEY}.pub"
fi

public_key="$(cat "${SSH_KEY}.pub")"
cat > "$USER_DATA" <<EOF
#cloud-config
users:
  - default
  - name: debian
    groups: [adm]
    shell: /bin/bash
    sudo: false
  - name: svl-agent
    shell: /bin/bash
    lock_passwd: true
    sudo: false
    ssh_authorized_keys:
      - ${public_key}
ssh_pwauth: false
disable_root: true
runcmd:
  - [usermod, -G, adm, debian]
  - [rm, -f, /etc/sudoers.d/90-cloud-init-users]
EOF

cat > "$META_DATA" <<'EOF'
instance-id: vm-gemini-4
local-hostname: VM_Gemini_4
EOF
cloud-localds "$SEED_IMAGE" "$USER_DATA" "$META_DATA"

if [ ! -s "$DISK_IMAGE" ]; then
  qemu-img create -f qcow2 -F qcow2 -b "$BASE_IMAGE" "$DISK_IMAGE" 20G
fi

if [ -r /dev/kvm ] && [ -w /dev/kvm ]; then
  accel="kvm"
  cpu="host"
else
  accel="tcg"
  cpu="max"
fi

exec qemu-system-x86_64 \
  -name VM_Gemini_4 \
  -machine type=q35,accel=${accel} \
  -cpu ${cpu} \
  -smp 2 \
  -m 2048 \
  -drive "file=${DISK_IMAGE},if=virtio,format=qcow2" \
  -drive "file=${SEED_IMAGE},media=cdrom,readonly=on" \
  -netdev user,id=net0,hostfwd=tcp:0.0.0.0:2222-:22 \
  -device virtio-net-pci,netdev=net0 \
  -display none \
  -serial mon:stdio \
  -monitor none \
  -no-reboot
