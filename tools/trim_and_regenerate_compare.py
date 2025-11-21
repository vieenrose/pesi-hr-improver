#!/usr/bin/env python3
from PIL import Image, ImageChops, ImageDraw, ImageFont
import sys
import os

pairs = [
    ("extension/screenshots/real_leave_application_clean.png", "extension/screenshots/real_leave_application_reenhanced.png", "extension/screenshots/real_leave_application_clean_compare.png"),
    ("extension/screenshots/real_business_trip_application_clean.png", "extension/screenshots/real_business_trip_application_reenhanced.png", "extension/screenshots/real_business_trip_application_clean_compare.png"),
]

def trim(im, bg_color=(255,255,255)):
    # ensure RGB
    if im.mode != 'RGB':
        im = im.convert('RGB')
    bg = Image.new('RGB', im.size, bg_color)
    diff = ImageChops.difference(im, bg)
    bbox = diff.getbbox()
    if bbox:
        return im.crop(bbox)
    return im


def make_compare(img1_path, img2_path, out_path, gap=20, label_height=28):
    im1 = Image.open(img1_path).convert('RGB')
    im2 = Image.open(img2_path).convert('RGB')

    trimmed1 = trim(im1)
    trimmed2 = trim(im2)

    # decide width/height
    w = trimmed1.width + trimmed2.width + gap
    h = max(trimmed1.height, trimmed2.height) + label_height + 10

    out = Image.new('RGB', (w, h), (255,255,255))

    # draw labels
    draw = ImageDraw.Draw(out)
    try:
        font = ImageFont.load_default()
    except:
        font = None

    # paste images with small top offset to leave room for label
    y = label_height + 6
    out.paste(trimmed1, (0, y))
    out.paste(trimmed2, (trimmed1.width + gap, y))

    # labels centered over each image
    label1 = 'Clean (no extension DOM)'
    label2 = 'With Extension (reapplied)'
    # compute text positions
    try:
        bbox1 = draw.textbbox((0,0), label1, font=font)
        bbox2 = draw.textbbox((0,0), label2, font=font)
        w1 = bbox1[2]-bbox1[0]; h1 = bbox1[3]-bbox1[1]
        w2 = bbox2[2]-bbox2[0]; h2 = bbox2[3]-bbox2[1]
    except Exception:
        # Fallback approximation
        w1 = len(label1) * 6
        w2 = len(label2) * 6
        h1 = h2 = 10

    x1 = max(0, (trimmed1.width - w1)//2)
    x2 = trimmed1.width + gap + max(0, (trimmed2.width - w2)//2)

    draw.text((x1, 6), label1, fill=(51,51,51), font=font)
    draw.text((x2, 6), label2, fill=(51,51,51), font=font)

    out.save(out_path)
    print(f"Wrote {out_path} (size: {os.path.getsize(out_path)} bytes)")


if __name__ == '__main__':
    def make_stacked(img1_path, img2_path, out_path, gap=10, label_height=28):
        im1 = Image.open(img1_path).convert('RGB')
        im2 = Image.open(img2_path).convert('RGB')

        t1 = trim(im1)
        t2 = trim(im2)

        width = max(t1.width, t2.width)
        height = label_height + t1.height + gap + label_height + t2.height + 10

        out = Image.new('RGB', (width, height), (255,255,255))
        draw = ImageDraw.Draw(out)
        try:
            font = ImageFont.load_default()
        except:
            font = None

        # Labels
        label1 = 'Clean (no extension DOM)'
        label2 = 'With Extension (reapplied)'
        try:
            bbox1 = draw.textbbox((0,0), label1, font=font)
            bbox2 = draw.textbbox((0,0), label2, font=font)
            w1 = bbox1[2]-bbox1[0]
            w2 = bbox2[2]-bbox2[0]
        except Exception:
            w1 = len(label1)*6; w2 = len(label2)*6

        # Draw first label centered
        x1 = (width - w1)//2
        draw.text((x1, 6), label1, fill=(51,51,51), font=font)

        y = label_height + 6
        out.paste(t1, ( (width - t1.width)//2, y ))

        y += t1.height + gap
        x2 = (width - w2)//2
        draw.text((x2, y - label_height + 6), label2, fill=(51,51,51), font=font)

        out.paste(t2, ( (width - t2.width)//2, y ))

        out.save(out_path)
        print(f"Wrote stacked {out_path} (size: {os.path.getsize(out_path)} bytes)")

    for a,b,o in pairs:
        if not os.path.exists(a) or not os.path.exists(b):
            print(f"Missing source: {a} or {b}")
            continue
        make_compare(a,b,o)
        base = o.rsplit('.',1)[0]
        stacked_out = base + '_stacked.png'
        make_stacked(a,b,stacked_out)

