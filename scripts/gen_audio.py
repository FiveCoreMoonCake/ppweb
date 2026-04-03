"""
Generate audio files for polyphonic characters using Edge TTS.
For each reading of each polyphonic char, generate one combined audio:
  "大夫，，大夫看病" (words joined by pause)
This avoids the unreliable SSML phoneme hack entirely — context words
naturally disambiguate pronunciation in Edge TTS.
"""
import asyncio
import os
import json
import re
import edge_tts

VOICE = "zh-CN-XiaoxiaoNeural"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "audio")


def pinyin_to_ascii(pinyin: str) -> str:
    """Convert tone-marked pinyin to ascii for filenames: 'dài' -> 'dai4'"""
    TONE_MAP = {
        'ā': ('a', '1'), 'á': ('a', '2'), 'ǎ': ('a', '3'), 'à': ('a', '4'),
        'ē': ('e', '1'), 'é': ('e', '2'), 'ě': ('e', '3'), 'è': ('e', '4'),
        'ī': ('i', '1'), 'í': ('i', '2'), 'ǐ': ('i', '3'), 'ì': ('i', '4'),
        'ō': ('o', '1'), 'ó': ('o', '2'), 'ǒ': ('o', '3'), 'ò': ('o', '4'),
        'ū': ('u', '1'), 'ú': ('u', '2'), 'ǔ': ('u', '3'), 'ù': ('u', '4'),
        'ǖ': ('v', '1'), 'ǘ': ('v', '2'), 'ǚ': ('v', '3'), 'ǜ': ('v', '4'),
    }
    tone = '5'  # neutral
    base = ''
    for ch in pinyin:
        if ch in TONE_MAP:
            letter, tone = TONE_MAP[ch]
            base += letter
        elif ch == 'ü':
            base += 'v'
        else:
            base += ch
    return f"{base}{tone}"


def extract_polyphonic():
    """Parse characters.ts to find all polyphonic characters and their readings/words"""
    ts_path = os.path.join(os.path.dirname(__file__), "..", "src", "data", "characters.ts")
    with open(ts_path, encoding="utf-8") as f:
        content = f.read()

    pattern = r'\{\s*char:\s*"(.)"\s*,\s*readings:\s*\[([\s\S]*?)\],\s*groupId'
    result = []
    for m in re.finditer(pattern, content):
        char = m.group(1)
        block = m.group(2)
        readings = list(re.finditer(
            r'\{\s*pinyin:\s*"([^"]+)"\s*,\s*words:\s*\[([^\]]*)\]', block
        ))
        if len(readings) <= 1:
            continue
        for r in readings:
            pinyin = r.group(1)
            words = re.findall(r'"([^"]+)"', r.group(2))
            result.append({"char": char, "pinyin": pinyin, "words": words})
    return result


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    readings = extract_polyphonic()
    chars = set(r["char"] for r in readings)
    print(f"Found {len(readings)} readings for {len(chars)} polyphonic characters\n")

    manifest = {}  # key: "char-pinyin" -> "/audio/filename.mp3"
    
    for r in readings:
        ascii_py = pinyin_to_ascii(r["pinyin"])
        filename = f"{r['char']}-{ascii_py}.mp3"
        outpath = os.path.join(OUTPUT_DIR, filename)
        key = f"{r['char']}-{r['pinyin']}"
        manifest[key] = f"/audio/{filename}"

        if os.path.exists(outpath):
            print(f"  Skip (exists): {filename}")
            continue
        
        # Combine words with pauses: "大夫，，大夫看病"
        text = "，，".join(r["words"])
        comm = edge_tts.Communicate(text, VOICE, rate="-20%")
        await comm.save(outpath)
        print(f"  Generated: {filename} ({r['char']} {r['pinyin']}: {text})")

    # Write manifest JSON
    manifest_path = os.path.join(OUTPUT_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"\nManifest: {manifest_path} ({len(manifest)} entries)")
    print("Done!")


asyncio.run(main())
