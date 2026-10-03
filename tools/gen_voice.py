"""Generate pre-recorded Edge TTS voice clips for index-3d.html.

Usage (from repo root):
    pip install edge-tts
    python tools/gen_voice.py

Output: audio/voice/<text>.mp3  (file name == spoken text, looked up by Voice.play(text))
Existing files are skipped; delete audio/voice/*.mp3 first to regenerate after changing VOICE / RATE.
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
# 聊天快捷喊話（index-3d.html CHAT_PHRASES 需同步）
PHRASES = ["快一點啦", "好牌", "謝謝", "厲害", "不好意思", "等我一下", "再來一局", "哈哈"]
TEXTS = TILES + ACTIONS + SEATS + PHRASES


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for text in TEXTS:
        if (OUT / f"{text}.mp3").exists():
            continue
        await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(OUT / f"{text}.mp3"))
        print("ok", text)
    print(f"done: {len(TEXTS)} clips -> {OUT}")


if __name__ == "__main__":
    asyncio.run(main())
