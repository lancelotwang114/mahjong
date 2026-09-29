"""Generate pre-recorded Edge TTS voice clips for index-3d.html.

Usage (from repo root):
    pip install edge-tts
    python tools/gen_voice.py

Output: audio/voice/<text>.mp3  (file name == spoken text, looked up by Voice.play(text))
Re-run after changing VOICE / RATE; existing files are overwritten.
"""
import asyncio
import pathlib

import edge_tts

VOICE = "zh-TW-HsiaoChenNeural"
RATE = "+10%"
OUT = pathlib.Path(__file__).resolve().parent.parent / "audio" / "voice"

NUMS = "一二三四五六七八九"
TILES = [n + s for s in ("萬", "筒", "索") for n in NUMS] + list("東南西北中白發")
ACTIONS = ["碰", "吃", "槓", "胡牌", "聽牌", "自摸", "補花"]
SEATS = [w + "家" + a for w in "東南西北" for a in ("聽牌", "胡牌", "自摸")]
TEXTS = TILES + ACTIONS + SEATS


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for text in TEXTS:
        await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(OUT / f"{text}.mp3"))
        print("ok", text)
    print(f"done: {len(TEXTS)} clips -> {OUT}")


if __name__ == "__main__":
    asyncio.run(main())
