"""
Логотип «Ф як кільце прогресу» → assets/brand/*.svg.
Запуск: python3 scripts/build-brand.py  (потрібен fonttools: pip install fonttools)
PNG-іконки рендерить scripts/render-brand.mjs.

Геометрія (полотно 512×512, центр 256):
  дуга — коло R=136, товщина 60, 75 % від верхньої точки за годинниковою стрілкою (відкрита
  чверть — угорі ліворуч, як незакритий прогрес), круглі кінці;
  риска — вертикаль по центру, товщина 60, виходить за коло на 42 зверху й знизу.
"""
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'brand'
FONT = ROOT / 'node_modules/@expo-google-fonts/unbounded/700Bold/Unbounded_700Bold.ttf'

GRAPHITE = '#1A1D21'
CHALK = '#EEEEE8'
ACCENT = '#9A7BF2'  # акцент темної теми застосунку (src/theme/tokens.ts)
ACCENT_LIGHT = '#6F4FE0'  # акцент світлої теми — контраст на світлому фоні

C, R, W = 256, 136, 60
STEM_TOP, STEM_BOTTOM = C - R - W / 2 - 42 + W / 2, C + R + W / 2 + 42 - W / 2  # центри круглих кінців


def mark(arc: str, stem: str, scale: float = 1.0, dx: float = 0, dy: float = 0, w: float = W, r: float = R) -> str:
    """Знак у системі координат 512; scale/dx/dy — розміщення на полотні."""
    top, left = (C, C - r), (C - r, C)
    ext = r + w / 2 + 42 - w / 2
    return (
        f'<g transform="translate({dx} {dy}) scale({scale})" fill="none" stroke-linecap="round">'
        f'<path d="M{top[0]} {top[1]} A{r} {r} 0 1 1 {left[0]} {left[1]}" stroke="{arc}" stroke-width="{w}"/>'
        f'<path d="M{C} {C - ext} V{C + ext}" stroke="{stem}" stroke-width="{w}"/>'
        '</g>'
    )


def svg(body: str, w: float = 512, h: float = 512, title: str = 'Фітнес-тренер') -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:g} {h:g}" width="{w:g}" height="{h:g}" '
        f'role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'
    )


def wordmark(text: str, size: float, x: float, baseline: float, fill: str) -> tuple[str, float]:
    """Назва як контури шрифту Unbounded Bold (без залежності від шрифтів у системі)."""
    font = TTFont(FONT)
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font['head'].unitsPerEm
    k = size / upm
    paths, cursor = [], 0.0
    for ch in text:
        name = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[name].draw(TransformPen(pen, (k, 0, 0, -k, x + cursor * k, baseline)))
        paths.append(pen.getCommands())
        cursor += font['hmtx'][name][0]
    return f'<path fill="{fill}" d="{" ".join(paths)}"/>', cursor * k


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    files = {
        # Кольоровий знак (для темного фону)
        'mark.svg': svg(mark(ACCENT, CHALK)),
        # Іконка: квадрат зі скругленням 22 %, знак ~78 %
        'icon.svg': svg(f'<rect width="512" height="512" rx="112" fill="{GRAPHITE}"/>' + mark(ACCENT, CHALK, 0.78, 56.3, 56.3)),
        # Без скруглення — для iOS / Android (система сама робить маску)
        'icon-square.svg': svg(f'<rect width="512" height="512" fill="{GRAPHITE}"/>' + mark(ACCENT, CHALK, 0.72, 71.7, 71.7)),
        # Дрібні розміри (16–32 px): товстіші лінії, менший виступ
        'icon-small.svg': svg(f'<rect width="512" height="512" rx="112" fill="{GRAPHITE}"/>' + mark(ACCENT, CHALK, 0.86, 35.8, 35.8, w=84, r=124)),
        'mono-light.svg': svg(mark(CHALK, CHALK)),
        'mono-dark.svg': svg(mark(GRAPHITE, GRAPHITE)),
    }
    # Знак + назва: висота знака 120, назва — кегль 64 по оптичному центру
    name_light, width = wordmark('Фітнес-тренер', 64, 150, 83, CHALK)
    name_dark, _ = wordmark('Фітнес-тренер', 64, 150, 83, GRAPHITE)
    lw = 150 + width + 24
    files['lockup-dark.svg'] = svg(f'<rect width="{lw:g}" height="120" rx="24" fill="{GRAPHITE}"/>' + mark(ACCENT, CHALK, 0.2885, -13.8, -13.8) + name_light, lw, 120)
    files['lockup-light.svg'] = svg(mark(ACCENT_LIGHT, GRAPHITE, 0.2885, -13.8, -13.8) + name_dark, lw, 120)
    for name, content in files.items():
        (OUT / name).write_text(content, encoding='utf-8')
        print('wrote', name, len(content), 'B')


if __name__ == '__main__':
    main()
