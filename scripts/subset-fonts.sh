#!/usr/bin/env bash
# Шрифти інтерфейсу лише з потрібними символами: латиниця, кирилиця, розділові знаки, ₴, №, стрілки.
# Unbounded: 370 → 69 КБ, Manrope: 98 → 44 КБ. Потрібен fonttools: pip install fonttools
set -euo pipefail
cd "$(dirname "$0")/.."
NM=node_modules/@expo-google-fonts
U="U+0000-00FF,U+0131,U+0152-0153,U+02BC,U+02C6,U+02DA,U+02DC,U+0400-04FF,U+2000-206F,U+20B4,U+20AC,U+2116,U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD"
for f in unbounded/600SemiBold/Unbounded_600SemiBold unbounded/700Bold/Unbounded_700Bold \
         manrope/500Medium/Manrope_500Medium manrope/600SemiBold/Manrope_600SemiBold manrope/700Bold/Manrope_700Bold; do
  pyftsubset "$NM/$f.ttf" --unicodes="$U" --layout-features='kern,liga,calt,tnum,lnum,case' \
    --output-file="assets/fonts/$(basename "$f").ttf"
done
ls -la assets/fonts
