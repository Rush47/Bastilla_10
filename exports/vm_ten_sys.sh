#!/usr/bin/env bash
set -e
# VM_Ten_System Production Daemon (v8.1.0-VM_Ten_System)
npm ci
npm run start &> /var/log/vm_ten_sys.stdout &
tail -f /var/log/vm_ten_sys.stdout &
