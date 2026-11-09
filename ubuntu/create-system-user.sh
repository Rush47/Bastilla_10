#!/usr/bin/env bash
# Create a Linux account named System with administrator (sudo/root) privileges.
# Does not replace the independent AI agent named System.
set -Eeuo pipefail
if (( EUID != 0 )); then echo "Uruchom: sudo bash ubuntu/create-system-user.sh" >&2; exit 1; fi
if ! id System >/dev/null 2>&1; then
  useradd --badname --create-home --shell /bin/bash System
fi
if ! getent group sudo >/dev/null; then
  echo "Brak grupy sudo: wymagany Ubuntu." >&2
  exit 1
fi
usermod -aG sudo System
passwd System
echo "Konto System gotowe. Uprawnienia administracyjne: sudo (po podaniu hasla)."
echo "Sprawdz: id System; sudo -l -U System"
