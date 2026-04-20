"""
Generate pre-recorded audio for word pairs using Azure Speech API.

For each word pair, generates 3 audio files:
  1. wp_{word}.mp3        — reads the word (e.g., "喜欢")
  2. {char}_in_{word}.mp3 — reads "字，X的字。Y的字。释义" for each char

Voice: zh-CN-XiaoxiaoNeural (same as all other character audio)
Engine: Azure Speech REST API with SSML for natural prosody

Usage:
  Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION env vars, then run:
    python scripts/gen_word_pair_audio.py

Updates public/audio/manifest.json with new entries.
"""
import os
import json
import re
import requests
import time

VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-20%"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "audio")
MANIFEST_PATH = os.path.join(OUTPUT_DIR, "manifest.json")

AZURE_KEY = os.environ.get("AZURE_SPEECH_KEY", "")
AZURE_REGION = os.environ.get("AZURE_SPEECH_REGION", "eastus")


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


def build_word_ssml(word: str) -> str:
    """SSML to read a word naturally"""
    return f"""<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis'
  xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='zh-CN'>
  <voice name='{VOICE}'>
    <prosody rate='{RATE}'>
      {word}
    </prosody>
  </voice>
</speak>"""


def build_char_in_word_ssml(char: str, phrases: list[str], meaning: str) -> str:
    """
    SSML for char-in-word reading.
    Pattern: "喜，，喜欢的喜。欢喜的喜。，表示开心热爱的意思"
    """
    phrase_parts = "。".join(phrases)
    return f"""<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis'
  xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='zh-CN'>
  <voice name='{VOICE}'>
    <prosody rate='{RATE}'>
      {char}
      <break time='500ms'/>
      {phrase_parts}。
      <break time='400ms'/>
      {meaning}
    </prosody>
  </voice>
</speak>"""


def extract_word_pairs():
    """Parse word-pairs.ts to extract word pair data."""
    ts_path = os.path.join(
        os.path.dirname(__file__), "..", "src", "app", "chinese-literacy", "lib", "word-pairs.ts"
    )
    with open(ts_path, encoding="utf-8") as f:
        content = f.read()

    pairs = []
    # Find each word pair block: { word: "X", chars: ["A", "B"], ...charContexts: [...] }
    # Use a simpler approach: find word + chars + charContexts
    word_pattern = r'word:\s*"([^"]+)"'
    chars_pattern = r'chars:\s*\["([^"]+)",\s*"([^"]+)"\]'
    phrases_pattern = r'phrases:\s*\[([^\]]+)\]'
    meaning_pattern = r'meaning:\s*"((?:[^"\\]|\\.)*)"'

    # Split by word pair entries (each starts with `word:`)
    entries = re.split(r'\{\s*\n\s*word:', content)
    for entry in entries[1:]:  # skip first chunk before any word:
        entry = "word:" + entry
        wm = re.search(word_pattern, entry)
        cm = re.search(chars_pattern, entry)
        if not wm or not cm:
            continue

        word = wm.group(1)
        char_a, char_b = cm.group(1), cm.group(2)

        # Find charContexts — two sets of phrases + meaning
        phrases_matches = list(re.finditer(phrases_pattern, entry))
        meaning_matches = list(re.finditer(meaning_pattern, entry))

        if len(phrases_matches) < 2 or len(meaning_matches) < 2:
            print(f"  WARNING: Skipping {word} — couldn't parse contexts")
            continue

        def parse_phrases(match):
            return re.findall(r'"([^"]+)"', match.group(1))

        ctx_a = {
            "phrases": parse_phrases(phrases_matches[0]),
            "meaning": meaning_matches[0].group(1).replace('\\"', '"'),
        }
        ctx_b = {
            "phrases": parse_phrases(phrases_matches[1]),
            "meaning": meaning_matches[1].group(1).replace('\\"', '"'),
        }

        pairs.append({
            "word": word,
            "chars": [char_a, char_b],
            "contexts": [ctx_a, ctx_b],
        })

    return pairs


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    token = get_azure_token()
    if not token:
        print("ERROR: AZURE_SPEECH_KEY not set. Cannot generate audio.")
        print("Set environment variables:")
        print("  export AZURE_SPEECH_KEY=<your-key>")
        print("  export AZURE_SPEECH_REGION=eastus")
        return

    pairs = extract_word_pairs()
    print(f"Found {len(pairs)} word pairs\n")

    # Load existing manifest
    manifest = {}
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, encoding="utf-8") as f:
            manifest = json.load(f)

    generated = 0
    skipped = 0

    for p in pairs:
        word = p["word"]
        chars = p["chars"]
        contexts = p["contexts"]

        # 1. Word audio: wp_{word}.mp3
        wp_key = f"wp_{word}"
        wp_filename = f"wp_{word}.mp3"
        wp_path = os.path.join(OUTPUT_DIR, wp_filename)
        manifest[wp_key] = f"/audio/{wp_filename}"

        if os.path.exists(wp_path) and os.path.getsize(wp_path) > 0:
            skipped += 1
        else:
            ssml = build_word_ssml(word)
            for attempt in range(3):
                try:
                    azure_tts(ssml, wp_path, token)
                    generated += 1
                    print(f"  ✓ {wp_filename}")
                    break
                except Exception as e:
                    if attempt < 2:
                        wait = 2 ** (attempt + 1)
                        print(f"    Retry in {wait}s ({e.__class__.__name__})...")
                        time.sleep(wait)
                    else:
                        print(f"  ✗ FAILED {wp_filename}: {e}")

        # 2. Char-in-word audio: {char}_in_{word}.mp3
        for i, (char, ctx) in enumerate(zip(chars, contexts)):
            ciw_key = f"{char}_in_{word}"
            ciw_filename = f"{char}_in_{word}.mp3"
            ciw_path = os.path.join(OUTPUT_DIR, ciw_filename)
            manifest[ciw_key] = f"/audio/{ciw_filename}"

            if os.path.exists(ciw_path) and os.path.getsize(ciw_path) > 0:
                skipped += 1
            else:
                ssml = build_char_in_word_ssml(char, ctx["phrases"], ctx["meaning"])
                for attempt in range(3):
                    try:
                        azure_tts(ssml, ciw_path, token)
                        generated += 1
                        print(f"  ✓ {ciw_filename}")
                        break
                    except Exception as e:
                        if attempt < 2:
                            wait = 2 ** (attempt + 1)
                            print(f"    Retry in {wait}s ({e.__class__.__name__})...")
                            time.sleep(wait)
                        else:
                            print(f"  ✗ FAILED {ciw_filename}: {e}")

            time.sleep(0.3)  # rate limit

    # Write updated manifest
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\nDone! Generated: {generated}, Skipped: {skipped}")
    print(f"Manifest updated: {MANIFEST_PATH} ({len(manifest)} entries)")


if __name__ == "__main__":
    main()
