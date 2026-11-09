#!/bin/sh

set -eu

if [ "$(id -u)" -eq 0 ]; then
    exit 0
fi

config_home=${XDG_CONFIG_HOME:-"$HOME/.config"}
marker="$config_home/bastillaos/wallpaper-initialized"
wallpaper=/usr/share/wallpapers/BastillaOS/BastillaOS.svg

if [ -e "$marker" ] || [ ! -r "$wallpaper" ]; then
    exit 0
fi

if ! command -v plasma-apply-wallpaperimage >/dev/null 2>&1; then
    exit 0
fi

if plasma-apply-wallpaperimage "$wallpaper"; then
    mkdir -p "$(dirname "$marker")"
    : > "$marker"
fi
