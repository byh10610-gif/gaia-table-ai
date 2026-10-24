"""Extract original embedded artwork + its PDF alpha mask, without redrawing.
Usage: python3 scripts/extract-game-icons.py /absolute/path/EN_Gaia_rulebook_lo.pdf
"""
from pathlib import Path
import sys
import fitz

doc = fitz.open(sys.argv[1])
out = Path(__file__).resolve().parents[1] / 'assets/icons'
out.mkdir(parents=True, exist_ok=True)
icons = {
    'ore': (24, 7389), 'credits': (24, 7393), 'knowledge': (24, 7397),
    'qic': (24, 7401), 'power': (24, 7405), 'vp': (24, 7409),
    'terraforming': (22, 6923), 'navigation': (22, 6899),
    'artificial_intelligence': (22, 6903), 'gaia_project': (22, 6927),
    'economy': (22, 6891), 'science': (22, 6895),
}
for name, (page, xref) in icons.items():
    entry = next(im for im in doc[page-1].get_images(full=True) if im[0] == xref)
    pix = fitz.Pixmap(doc, xref)
    if entry[1]:
        pix = fitz.Pixmap(pix, fitz.Pixmap(doc, entry[1]))
    pix.save(out / (name + '.png'))
    print(name, pix.width, pix.height)
