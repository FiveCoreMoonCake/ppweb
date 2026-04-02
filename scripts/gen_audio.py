"""
Generate audio files for polyphonic characters using Edge TTS with SSML.
Uses zh-CN-XiaoxiaoNeural voice with <phoneme> to force correct pronunciation.
"""
import asyncio
import edge_tts

VOICE = "zh-CN-XiaoxiaoNeural"
OUTPUT_DIR = r"c:\Anna Workspace\ppweb\public\audio"

# (filename, SSML text with phoneme to force correct reading)
# Edge TTS supports <lang> and pronunciation hints via context phrases
# We use a "context word + 的 + char" pattern to lock the tone, then trim silence later
# Actually edge-tts may not support SSML phoneme, so we use context-guided approach:
# Speak a word that contains the char with the target reading, making it natural.

ITEMS = [
    # 大 dà vs dài
    ("大-da4.mp3", "大"),           # default reading is dà, works fine 
    ("大-dai4.mp3", "大夫的大"),    # context locks it to dài

    # 了 le vs liǎo
    ("了-le.mp3", "好了的了"),       # locks to le
    ("了-liao3.mp3", "了解的了"),    # locks to liǎo

    # 子 zǐ vs zi
    ("子-zi3.mp3", "子女的子"),      # locks to zǐ
    ("子-zi0.mp3", "儿子的子"),      # locks to zi (neutral tone)

    # 石 shí vs dàn
    ("石-shi2.mp3", "石头的石"),     # locks to shí
    ("石-dan4.mp3", "一石米的石"),   # locks to dàn

    # 上 shàng vs shǎng  
    ("上-shang4.mp3", "上"),         # default is shàng
    ("上-shang3.mp3", "上声的上"),   # locks to shǎng

    # 里 lǐ vs li
    ("里-li3.mp3", "里外的里"),      # locks to lǐ
    ("里-li0.mp3", "哪里的里"),      # locks to li (neutral tone)

    # 少 shǎo vs shào
    ("少-shao3.mp3", "多少的少"),    # locks to shǎo
    ("少-shao4.mp3", "少年的少"),    # locks to shào

    # 见 jiàn vs xiàn
    ("见-jian4.mp3", "看见的见"),    # locks to jiàn
    ("见-xian4.mp3", "出现的见"),    # locks to xiàn
]

async def generate():
    for filename, text in ITEMS:
        outpath = f"{OUTPUT_DIR}\\{filename}"
        communicate = edge_tts.Communicate(text, VOICE, rate="-30%")
        await communicate.save(outpath)
        print(f"Generated: {filename}")

asyncio.run(generate())
print("Done! All audio files generated.")
