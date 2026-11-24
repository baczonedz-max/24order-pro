# For every product photo (and "choose one" option photo) in public/data/paradis.json, writes a 512×512 JPEG on a
# white background to public/img/dish/src/<sha1(url)[:16]>.jpg. The live server sends these to the AI photo editor
# (it can't resize images or flatten transparency itself). Run after importing a menu:
#   python scripts/dish-sources.py
import hashlib, io, json, os, urllib.request
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public')
OUT = os.path.join(ROOT, 'img', 'dish', 'src')
os.makedirs(OUT, exist_ok=True)
data = json.load(open(os.path.join(ROOT, 'data', 'paradis.json'), encoding='utf-8'))

urls = set()
for c in data['categories']:
    for f in c['foods']:
        if f.get('image'): urls.add(f['image'])
        for cp in f.get('components', []):
            if cp.get('image'): urls.add(cp['image'])

def load(url):
    if url.startswith('/'):
        return Image.open(os.path.join(ROOT, url.lstrip('/')))
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'image/webp,*/*'})
    return Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=60).read()))

made = 0
for url in sorted(urls):
    name = hashlib.sha1(url.encode('utf-8')).hexdigest()[:16] + '.jpg'
    path = os.path.join(OUT, name)
    if os.path.exists(path):
        continue
    im = load(url).convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    bg.convert('RGB').resize((512, 512), Image.LANCZOS).save(path, 'JPEG', quality=90)
    made += 1
print('sources', len(urls), 'new', made)
