"""Đóng gói extension thành vocabflash-extension.zip để người dùng tải từ web (Cài đặt → Tải extension).
Chạy lại file này mỗi khi sửa extension/: python extension/build-zip.py"""
import os, zipfile
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, 'vocabflash-extension.zip')
skip = {'build-zip.py', 'vocabflash-extension.zip'}
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in sorted(os.listdir(here)):
        if name in skip or name.startswith('.'): continue
        z.write(os.path.join(here, name), 'vocabflash-extension/' + name)
print('OK:', out)
