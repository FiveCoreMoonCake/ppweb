"""
Generate single-character audio files for polyphonic characters using Edge TTS + SSML.
Each file contains ONLY the single character pronounced with the correct tone.
We bypass edge-tts's text escaping to inject raw SSML <phoneme> tags.
"""
import asyncio
import edge_tts

VOICE = "zh-CN-XiaoxiaoNeural"
OUTPUT_DIR = r"c:\Anna Workspace\ppweb\public\audio"

# (filename, char, sapi pinyin with tone number)
# sapi pinyin: tone 1-4 = normal tones, tone 5 = neutral tone (轻声)
ITEMS = [
    ("大-da4.mp3", "大", "da 4"),
    ("大-dai4.mp3", "大", "dai 4"),
    ("了-le.mp3", "了", "le 5"),
    ("了-liao3.mp3", "了", "liao 3"),
    ("子-zi3.mp3", "子", "zi 3"),
    ("子-zi0.mp3", "子", "zi 5"),
    ("石-shi2.mp3", "石", "shi 2"),
    ("石-dan4.mp3", "石", "dan 4"),
    ("上-shang4.mp3", "上", "shang 4"),
    ("上-shang3.mp3", "上", "shang 3"),
    ("里-li3.mp3", "里", "li 3"),
    ("里-li0.mp3", "里", "li 5"),
    ("少-shao3.mp3", "少", "shao 3"),
    ("少-shao4.mp3", "少", "shao 4"),
    ("见-jian4.mp3", "见", "jian 4"),
    ("见-xian4.mp3", "见", "xian 4"),
]

async def generate():
    for filename, char, sapi_pinyin in ITEMS:
        outpath = f"{OUTPUT_DIR}\\{filename}"

        # Create Communicate with dummy text, then replace its internal
        # pre-escaped text list with raw SSML containing <phoneme> tag.
        # This bypasses the escape() call in __init__.
        phoneme_ssml = (
            f"<phoneme alphabet='sapi' ph='{sapi_pinyin}'>{char}</phoneme>"
        )
        comm = edge_tts.Communicate("dummy", VOICE, rate="-20%")
        # Override the split/escaped texts with our raw SSML fragment
        comm.texts = [phoneme_ssml.encode("utf-8")]
        await comm.save(outpath)
        print(f"Generated: {filename} ({char} -> {sapi_pinyin})")

asyncio.run(generate())
print("Done!")
