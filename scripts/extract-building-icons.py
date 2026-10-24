"""Extract the original embedded structure illustrations and alpha masks.
Usage: python scripts/extract-building-icons.py /path/to/EN_Gaia_rulebook_lo.pdf
"""
from pathlib import Path
import sys
import fitz

doc=fitz.open(sys.argv[1])
page=doc[2]
icons={'mine':1254,'trading_station':1278,'research_lab':1300,'academy':1334,'planetary_institute':1346,'gaiaformer':1354}
out=Path(__file__).resolve().parents[1]/'assets/icons'
for name,xref in icons.items():
    entry=next(x for x in page.get_images(full=True) if x[0]==xref)
    pix=fitz.Pixmap(doc,xref)
    if entry[1]:pix=fitz.Pixmap(pix,fitz.Pixmap(doc,entry[1]))
    pix.save(out/(name+'.png'))
    print(name,pix.width,pix.height)
