"""
Regenerate audio for characters that have an `explain` field.
The new audio includes: char + words + explain, all in one mp3.

Text format: "字，，组词1，，组词2，，，解释文字"

Only regenerates the 55 single-reading chars with explain.
For polyphonic chars with explain (if any), uses Azure SSML.

Usage:
  python scripts/gen_explain_audio.py
"""
import asyncio
import os
import re
import edge_tts

VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-20%"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "audio")


def extract_chars_with_explain():
    """Parse characters.ts to find chars that have an explain field.
    Handles both single-line and multi-line char entries."""
    ts_path = os.path.join(os.path.dirname(__file__), "..", "src", "data", "characters.ts")
    with open(ts_path, encoding="utf-8") as f:
        content = f.read()

    result = []
    # Find each char entry that has explain, by finding 'explain:' and walking backwards to find the char
    for em in re.finditer(r'explain:\s*"((?:[^"\\]|\\.)*)"', content):
        explain = em.group(1).replace('\\"', '"')
        # Walk backwards from the explain match to find the char definition
        before = content[:em.start()]
        char_m = list(re.finditer(r'char:\s*"(.)"', before))
        if not char_m:
            continue
        char = char_m[-1].group(1)  # closest char: before this explain

        # Find the readings block between this char and explain
        char_start = char_m[-1].start()
        segment = content[char_start:em.start()]
        # Extract all readings from this segment
        readings = list(re.finditer(
            r'\{\s*pinyin:\s*"([^"]+)"\s*,\s*words:\s*\[([^\]]*)\]', segment
        ))
        char_readings = []
        for r in readings:
            pinyin = r.group(1)
            words = re.findall(r'"([^"]+)"', r.group(2))
            char_readings.append({"pinyin": pinyin, "words": words})
        result.append({"char": char, "readings": char_readings, "explain": explain})
    return result


async def generate_one(text, outpath, retries=3):
    """Generate a single mp3 file with retry logic"""
    for attempt in range(retries):
        try:
            comm = edge_tts.Communicate(text, VOICE, rate=RATE)
            await comm.save(outpath)
            return
        except Exception as e:
            if attempt < retries - 1:
                wait = 2 ** (attempt + 1)
                print(f"    Retry in {wait}s ({e.__class__.__name__})...")
                await asyncio.sleep(wait)
            else:
                raise


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    chars = extract_chars_with_explain()
    print(f"Found {len(chars)} chars with explain\n")

    generated = 0

    for c in chars:
        if len(c["readings"]) == 1:
            # Single-reading: regenerate main audio with char + words + explain
            r = c["readings"][0]
            filename = f"{c['char']}.mp3"
            outpath = os.path.join(OUTPUT_DIR, filename)
            words_text = "，，".join(r["words"])
            text = f"{c['char']}，，{words_text}，，，{c['explain']}"
            print(f"  [{generated+1}] {c['char']}.mp3: {text[:60]}...")
            await generate_one(text, outpath)
            generated += 1
            await asyncio.sleep(0.3)
        else:
            # Polyphonic: generate a separate explain-only audio
            filename = f"{c['char']}_explain.mp3"
            outpath = os.path.join(OUTPUT_DIR, filename)
            text = c["explain"]
            print(f"  [{generated+1}] {c['char']}_explain.mp3: {text[:60]}...")
            await generate_one(text, outpath)
            generated += 1
            await asyncio.sleep(0.3)

    print(f"\nDone! Regenerated {generated} audio files.")


if __name__ == "__main__":
    asyncio.run(main())
