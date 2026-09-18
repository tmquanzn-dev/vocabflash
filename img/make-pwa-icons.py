"""Tạo icon PWA (img/icon-*.png): nền tím bo góc + chữ "VF" trắng, giống icon extension.
Chạy: python img/make-pwa-icons.py   (cần pip install pillow)
- icon-192 / icon-512: icon thường
- icon-maskable-512: nền phủ kín, chữ nhỏ hơn (Android cắt tròn / bo góc theo máy)
- apple-touch-icon (180): iOS "Thêm vào màn hình chính" """
import os
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__))
FONT = r'C:\Windows\Fonts\arialbd.ttf'

def make(size, name, maskable=False):
    S = size * 4
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if maskable: d.rectangle([0, 0, S - 1, S - 1], fill=(91, 95, 247, 255))
    else: d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=(91, 95, 247, 255))
    font = ImageFont.truetype(FONT, int(S * (0.42 if maskable else 0.56)))
    text = 'VF'
    box = d.textbbox((0, 0), text, font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text(((S - w) / 2 - box[0], (S - h) / 2 - box[1] - S * 0.02), text, font=font, fill=(255, 255, 255, 255))
    im.resize((size, size), Image.LANCZOS).save(os.path.join(here, name))

make(192, 'icon-192.png')
make(512, 'icon-512.png')
make(512, 'icon-maskable-512.png', maskable=True)
make(180, 'apple-touch-icon.png')
print('OK PWA icons')
