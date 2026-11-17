"""Build small brand assets and illustrative service graphics from local sources."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/images'
FONT = Path('/usr/share/fonts/truetype/dejavu')
def font(size, bold=False):
    return ImageFont.truetype(str(FONT / ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')), size)

# A text monogram for small browser icons; it does not replace the site wordmark.
icon = Image.new('RGB', (512, 512), '#0b0f1a')
d = ImageDraw.Draw(icon)
d.rounded_rectangle((20, 20, 492, 492), radius=96, outline='#f3b331', width=20)
d.text((256, 260), 'MRS', font=font(150, True), anchor='mm', fill='#f3b331')
icon.save(ROOT/'favicon.ico', sizes=[(16,16),(32,32),(48,48),(64,64)])
icon.resize((180,180), Image.Resampling.LANCZOS).save(ROOT/'apple-touch-icon.png', optimize=True)
icon.resize((512,512), Image.Resampling.LANCZOS).save(OUT/'mrs-monogram.png', optimize=True)

# Simple component silhouettes are illustrations, not workshop photographs.
im = Image.new('RGB', (1200, 630), '#0b0f1a')
d = ImageDraw.Draw(im)
for x in range(0,1200,40): d.line((x,0,x,630), fill='#141d2b')
for y in range(0,630,40): d.line((0,y,1200,y), fill='#141d2b')
d.text((54,40),'MOUNTAIN RACE SHOP',font=font(28,True),fill='#f3b331')
d.text((54,90),'Forks, shocks and valving',font=font(44,True),fill='white')
for x in [155, 300]:
    d.rounded_rectangle((x,190,x+54,375),radius=8,fill='#b7c3ce')
    d.rectangle((x+11,375,x+43,510),fill='#e7edf2')
    d.rounded_rectangle((x-3,490,x+66,539),radius=9,fill='#515e6c')
    d.rectangle((x-4,194,x+58,213),fill='#f3b331')
d.text((165,570),'FORKS',font=font(22,True),fill='#c7d0dc')
# Shock shaft, damper body and spring.
d.ellipse((586,169,630,213),outline='#b7c3ce',width=10)
d.rectangle((598,208,618,277),fill='#d5dce3')
d.rounded_rectangle((577,267,641,482),radius=12,fill='#515e6c')
for y in range(280,470,24):
    d.line((560,y,656,y+16),fill='#f3b331',width=13)
d.rectangle((593,482,623,512),fill='#d5dce3')
d.ellipse((587,507,631,551),outline='#b7c3ce',width=10)
d.text((562,570),'SHOCK',font=font(22,True),fill='#c7d0dc')
# Exploded shim-stack illustration with central holes.
for i in range(6):
    y=250+i*37
    half=100-i*10
    d.ellipse((960-half,y,960+half,y+36),fill='#a8b6c5',outline='#e5ebf1',width=2)
    d.ellipse((950,y+11,970,y+25),fill='#0b0f1a')
d.text((857,570),'SHIM STACK',font=font(22,True),fill='#c7d0dc')
im.save(OUT/'suspension-service.webp',quality=83,method=6)
im.save(OUT/'suspension-service-social.jpg',quality=87,optimize=True)

# Sharing card assembled from the actual book artwork already used on the site.
card=Image.new('RGB',(1200,630),'#0b0f1a');d=ImageDraw.Draw(card)
d.text((50,40),'MOUNTAIN RACE SHOP',font=font(28,True),fill='#f3b331')
d.text((50,100),'Suspension books',font=font(48,True),fill='white')
d.text((50,164),'By Craig Dixon',font=font(25),fill='#b8c3da')
for x,name in [(70,'book-cover-tuning-simple.png'),(450,'book-cover-front.jpg'),(830,'shim-stack-engineering-cover.jpg')]:
    cover=Image.open(OUT/name).convert('RGB')
    cover.thumbnail((300,340),Image.Resampling.LANCZOS)
    card.paste(cover,(x+(300-cover.width)//2,235+(340-cover.height)//2))
card.save(OUT/'suspension-books-social.jpg',quality=88,optimize=True)
print('Generated icons and service/book images')
