"""Tạo icon extension: nền tím bo góc + chữ "VF" trắng. Chạy: python extension/make-icons.py (cần pip install pillow)"""
import os
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__))
for size in (16, 48, 128):
    S = size * 4  # vẽ to rồi thu nhỏ cho mịn
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=(91, 95, 247, 255))
    font = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', int(S * 0.56))
    text = 'VF'
    box = d.textbbox((0, 0), text, font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text(((S - w) / 2 - box[0], (S - h) / 2 - box[1] - S * 0.02), text, font=font, fill=(255, 255, 255, 255))
    im.resize((size, size), Image.LANCZOS).save(os.path.join(here, f'icon{size}.png'))
print('OK icons')
