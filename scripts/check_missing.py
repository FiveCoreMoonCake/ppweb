import os, re

ts = open('src/app/chinese-literacy/lib/word-pairs.ts', encoding='utf-8').read()
words = re.findall(r'word:\s*"([^"]+)"', ts)
chars_pairs = re.findall(r'chars:\s*\["([^"]+)",\s*"([^"]+)"\]', ts)
missing = []
for w, (a, b) in zip(words, chars_pairs):
    for f in [f'wp_{w}.mp3', f'{a}_in_{w}.mp3', f'{b}_in_{w}.mp3']:
        p = os.path.join('public/audio', f)
        if not os.path.exists(p) or os.path.getsize(p) == 0:
            missing.append(f)
print(f'{len(missing)} missing:')
for m in missing:
    print(f'  {m}')
