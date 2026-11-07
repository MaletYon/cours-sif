import sys, glob, os
from PIL import Image, ImageDraw
d = sys.argv[1]; per = int(sys.argv[2]) if len(sys.argv) > 2 else 6
files = sorted(glob.glob(os.path.join(d, "s*.png")))
for k in range(0, len(files), per):
    chunk = files[k:k+per]
    W, H = 800, 450
    sheet = Image.new("RGB", (2*W+10, ((len(chunk)+1)//2)*(H+10)), "white")
    for i, f in enumerate(chunk):
        im = Image.open(f).resize((W, H))
        x, y = (i % 2)*(W+10), (i//2)*(H+10)
        sheet.paste(im, (x, y))
        ImageDraw.Draw(sheet).rectangle([x, y, x+W-1, y+H-1], outline="grey")
    out = os.path.join(d, f"sheet_{k//per+1}.jpg"); sheet.save(out, quality=80); print(out)
