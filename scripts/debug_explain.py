import re

ts = open('src/data/characters.ts', encoding='utf-8').read()

result = []
for em in re.finditer(r'explain:\s*"((?:[^"\\]|\\.)*)"', ts):
    explain = em.group(1).replace('\\"', '"')
    before = ts[:em.start()]
    char_m = list(re.finditer(r'char:\s*"(.)"', before))
    if not char_m:
        continue
    char = char_m[-1].group(1)
    char_start = char_m[-1].start()
    segment = ts[char_start:em.start()]
    readings = list(re.finditer(r'\{\s*pinyin:\s*"([^"]+)"\s*,\s*words:\s*\[([^\]]*)\]', segment))
    result.append({"char": char, "readings_count": len(readings), "explain": explain[:30]})

print(f"Total: {len(result)}")
single = [c for c in result if c["readings_count"] == 1]
poly = [c for c in result if c["readings_count"] > 1]
print(f"Single: {len(single)}, Polyphonic: {len(poly)}")
for c in poly:
    print(f"  Polyphonic: {c['char']} ({c['readings_count']} readings) - {c['explain']}")
for c in single:
    print(f"  {c['char']}: {c['explain']}")
