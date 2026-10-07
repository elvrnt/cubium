"""Rebuild the OFL numeric derivatives from the pinned upstream Golos Text TTF.

Requires fonttools[woff] and brotli in a separate tooling environment, not the app.
Usage: python scripts/build-numeric-fonts.py SOURCE.ttf public/fonts
"""

import sys
from hashlib import sha256
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


source, destination = map(Path, sys.argv[1:])
if sha256(source.read_bytes()).hexdigest() != "17bb58fb69aec2dfb047a2ebf52534023e9b688c97a6b7ac795b0a72912c2063":
    raise ValueError("Source does not match the pinned Golos Text asset")
destination.mkdir(parents=True, exist_ok=True)

for weight, style in ((400, "Regular"), (500, "Medium")):
    font = instantiateVariableFont(TTFont(source), {"wght": weight}, inplace=True)
    figures = [name for name in font.getGlyphOrder() if name.endswith(".tf")]
    # Upstream tnum maps all ten digits, but their advances are not all equal.
    advance = max(font["hmtx"][name][0] for name in figures)
    for name in figures:
        previous_advance, bearing = font["hmtx"][name]
        shift = round((advance - previous_advance) / 2)
        glyph = font["glyf"][name]
        if glyph.isComposite():
            for component in glyph.components:
                component.x += shift
        else:
            coordinates, _, _ = glyph.getCoordinates(font["glyf"])
            coordinates.translate((shift, 0))
            glyph.coordinates = coordinates
        glyph.recalcBounds(font["glyf"])
        font["hmtx"][name] = (advance, bearing + shift)

    names = {
        1: "Cubium Golos Numeric",
        2: style,
        3: f"CubiumGolosNumeric-{style}",
        4: f"Cubium Golos Numeric {style}",
        6: f"CubiumGolosNumeric-{style}",
        16: "Cubium Golos Numeric",
        17: style,
    }
    for record in font["name"].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())

    options = subset.Options()
    options.hinting = False
    options.layout_features = ["lnum", "tnum"]
    subsetter = subset.Subsetter(options)
    subsetter.populate(text="0123456789.:+-−—DNF ")
    subsetter.subset(font)
    font.flavor = "woff2"
    font.recalcTimestamp = False
    output = destination / f"cubium-golos-numeric-{style.lower()}.woff2"
    font.save(output)
    print(f"{output}: {output.stat().st_size} bytes; equal advance {advance}")
