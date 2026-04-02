import asyncio
import edge_tts

async def test():
    texts = [
        ("test_le_alone.mp3", "了。", "-40%"),
        ("test_haole_short.mp3", "好了。", "-30%"),
        ("test_liaojie_short.mp3", "了解。", "-30%"),
    ]
    for fname, text, rate in texts:
        comm = edge_tts.Communicate(text, "zh-CN-XiaoxiaoNeural", rate=rate)
        await comm.save(f"c:\\Anna Workspace\\ppweb\\public\\audio\\{fname}")
        print(f"Generated {fname}: \"{text}\"")

asyncio.run(test())
