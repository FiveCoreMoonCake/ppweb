"""
Generate audio + word boundary timestamps for picture book pages.
Uses Azure Speech SDK to get precise word-level timing.

Usage:
  Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION env vars, then:
    python scripts/gen_book_audio.py public/books/rabbit-carrot/book.json
"""
import sys
import os
import json
import time
import azure.cognitiveservices.speech as speechsdk

AZURE_KEY = os.environ.get("AZURE_SPEECH_KEY", "")
AZURE_REGION = os.environ.get("AZURE_SPEECH_REGION", "eastus")
VOICE = "zh-CN-XiaoxiaoNeural"


def generate_page_audio(text: str, outpath: str) -> list[dict]:
    """Generate mp3 for a page and return word boundary timestamps."""
    config = speechsdk.SpeechConfig(subscription=AZURE_KEY, region=AZURE_REGION)
    config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3
    )
    config.speech_synthesis_voice_name = VOICE

    synthesizer = speechsdk.SpeechSynthesizer(config, audio_config=None)

    raw_boundaries = []

    def on_word_boundary(evt):
        raw_boundaries.append({
            "text": evt.text,
            "offset_ms": evt.audio_offset // 10000,
            "type": str(evt.boundary_type),
        })

    synthesizer.synthesis_word_boundary.connect(on_word_boundary)

    ssml = f"""<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis'
  xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='zh-CN'>
  <voice name='{VOICE}'>
    <prosody rate='-25%'>{text}</prosody>
  </voice>
</speak>"""

    result = synthesizer.speak_ssml_async(ssml).get()

    if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        detail = result.cancellation_details
        print(f"  ERROR: {detail.reason} - {detail.error_details}")
        return []

    with open(outpath, "wb") as f:
        f.write(result.audio_data)

    # Calculate end times: each word ends when the next one starts
    # Merge punctuation into preceding word
    words = []
    for b in raw_boundaries:
        if "Punctuation" in b["type"] and words:
            # Append punctuation text to previous word
            words[-1]["w"] += b["text"]
        else:
            words.append({"w": b["text"], "s": b["offset_ms"]})

    # Set end times
    for i in range(len(words)):
        if i < len(words) - 1:
            words[i]["e"] = words[i + 1]["s"]
        else:
            # Last word: estimate from audio length (16khz 128kbps mp3)
            audio_duration_ms = len(result.audio_data) * 8 // 128
            words[i]["e"] = audio_duration_ms

    return words


def main():
    if len(sys.argv) < 2:
        print("Usage: python gen_book_audio.py <book.json>")
        sys.exit(1)

    book_path = sys.argv[1]
    book_dir = os.path.dirname(book_path)

    with open(book_path, encoding="utf-8") as f:
        book = json.load(f)

    print(f"Book: {book['title']} ({len(book['pages'])} pages)\n")

    for i, page in enumerate(book["pages"]):
        page_num = i + 1
        # Audio path: resolve from public root
        audio_rel = page["audio"].lstrip("/")
        # Find the public dir
        public_dir = book_dir
        while not public_dir.endswith("public") and os.path.dirname(public_dir) != public_dir:
            public_dir = os.path.dirname(public_dir)
        outpath = os.path.join(public_dir, audio_rel)
        os.makedirs(os.path.dirname(outpath), exist_ok=True)

        print(f"  Page {page_num}: {page['text'][:30]}...")
        words = generate_page_audio(page["text"], outpath)
        page["words"] = words
        print(f"    → {len(words)} words, saved {os.path.basename(outpath)}")
        time.sleep(0.3)

    # Write updated book.json with timestamps
    with open(book_path, "w", encoding="utf-8") as f:
        json.dump(book, f, ensure_ascii=False, indent=2)

    print(f"\nDone! Updated {book_path} with word boundaries.")


if __name__ == "__main__":
    main()
