"""
Generate pre-recorded TTS audio for ALL characters.

Single-reading chars: Edge TTS — "山，，山上，，大山"
Polyphonic chars:     Azure Speech with SSML <phoneme> — precise pronunciation control

Manifest format:
  Single:     "山" → "/audio/山.mp3"
  Polyphonic: "大-dà" → "/audio/大-da4.mp3"

Usage:
  Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION env vars, then run:
    python scripts/gen_audio.py
"""
import asyncio
import os
import json
import re
import edge_tts
import requests

VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-20%"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "audio")

# Azure Speech config (from env vars)
AZURE_KEY = os.environ.get("AZURE_SPEECH_KEY", "")
AZURE_REGION = os.environ.get("AZURE_SPEECH_REGION", "eastus")


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


def pinyin_to_sapi(pinyin: str) -> str:
    """Convert tone-marked pinyin to SAPI phoneme format: 'dài' -> 'dai 4'"""
    ascii_py = pinyin_to_ascii(pinyin)  # e.g. 'dai4'
    return f"{ascii_py[:-1]} {ascii_py[-1]}"  # e.g. 'dai 4'


def get_azure_token():
    """Get Azure Speech API bearer token"""
    if not AZURE_KEY:
        return None
    resp = requests.post(
        f"https://{AZURE_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken",
        headers={"Ocp-Apim-Subscription-Key": AZURE_KEY},
    )
    resp.raise_for_status()
    return resp.text


def azure_tts(ssml: str, outpath: str, token: str):
    """Call Azure Speech API with SSML, save mp3"""
    resp = requests.post(
        f"https://{AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
        },
        data=ssml.encode("utf-8"),
    )
    resp.raise_for_status()
    with open(outpath, "wb") as f:
        f.write(resp.content)


def build_polyphonic_ssml(char: str, pinyin: str, words: list[str]) -> str:
    """Build SSML with <phoneme> for the char, then words with pauses"""
    sapi_ph = pinyin_to_sapi(pinyin)
    words_xml = '<break time="600ms"/>'.join(words)
    return f"""<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis'
  xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='zh-CN'>
  <voice name='{VOICE}'>
    <prosody rate='{RATE}'>
      <phoneme alphabet='sapi' ph='{sapi_ph}'>{char}</phoneme>
      <break time='600ms'/>
      {words_xml}
    </prosody>
  </voice>
</speak>"""


def extract_all_chars():
    """Parse characters.ts to find ALL characters with their readings/words"""
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
        char_readings = []
        for r in readings:
            pinyin = r.group(1)
            words = re.findall(r'"([^"]+)"', r.group(2))
            char_readings.append({"pinyin": pinyin, "words": words})
        result.append({"char": char, "readings": char_readings})
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
    chars = extract_all_chars()
    polyphonic = [c for c in chars if len(c["readings"]) > 1]
    single = [c for c in chars if len(c["readings"]) == 1]
    print(f"Total: {len(chars)} chars ({len(single)} single + {len(polyphonic)} polyphonic)\n")

    manifest = {}
    generated = 0
    skipped = 0

    # === Single-reading chars ===
    print("── Single-reading chars ──")
    for c in single:
        r = c["readings"][0]
        filename = f"{c['char']}.mp3"
        outpath = os.path.join(OUTPUT_DIR, filename)
        manifest[c["char"]] = f"/audio/{filename}"

        if os.path.exists(outpath) and os.path.getsize(outpath) > 0:
            skipped += 1
            continue

        text = f"{c['char']}，，{r['words'][0]}，，{r['words'][1]}" if len(r["words"]) >= 2 else f"{c['char']}，，{'，，'.join(r['words'])}"
        await generate_one(text, outpath)
        generated += 1
        if generated % 20 == 0:
            print(f"  Generated {generated} files...")
        await asyncio.sleep(0.5)  # rate limit

    print(f"  Single: {generated} generated, {skipped} skipped\n")

    # === Polyphonic chars (Azure Speech with SSML phoneme) ===
    print("── Polyphonic chars (Azure Speech) ──")
    token = get_azure_token()
    if not token:
        print("  WARNING: AZURE_SPEECH_KEY not set, skipping polyphonic regeneration")
        # Still add existing files to manifest
        for c in polyphonic:
            for r in c["readings"]:
                ascii_py = pinyin_to_ascii(r["pinyin"])
                filename = f"{c['char']}-{ascii_py}.mp3"
                key = f"{c['char']}-{r['pinyin']}"
                manifest[key] = f"/audio/{filename}"
    else:
        poly_gen = 0
        for c in polyphonic:
            for r in c["readings"]:
                ascii_py = pinyin_to_ascii(r["pinyin"])
                filename = f"{c['char']}-{ascii_py}.mp3"
                outpath = os.path.join(OUTPUT_DIR, filename)
                key = f"{c['char']}-{r['pinyin']}"
                manifest[key] = f"/audio/{filename}"

                ssml = build_polyphonic_ssml(c["char"], r["pinyin"], r["words"])
                for attempt in range(3):
                    try:
                        azure_tts(ssml, outpath, token)
                        break
                    except Exception as e:
                        if attempt < 2:
                            print(f"    Retry ({e.__class__.__name__})...")
                            import time; time.sleep(2)
                        else:
                            print(f"    FAILED: {filename} - {e}")
                            continue

                poly_gen += 1
                print(f"  {filename} ({c['char']} {r['pinyin']}: {', '.join(r['words'])})")

        print(f"  Polyphonic: {poly_gen} generated\n")

    # Write manifest
    manifest_path = os.path.join(OUTPUT_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    total_gen = generated
    print(f"Manifest: {len(manifest)} entries")
    print(f"Single chars: {generated} generated, {skipped} skipped")
    print("Done!")


asyncio.run(main())
