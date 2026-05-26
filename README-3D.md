# 麻將 3D Demo

## 啟動方式

ES Modules 需要透過 HTTP server 才能載入。本地用 Python 或 Node 起一個靜態 server：

```bash
# Python 3
python -m http.server 8000

# Node (需要安裝 http-server)
npx http-server -p 8000
```

然後瀏覽 http://localhost:8000/mahjong-3d-demo.html

## 檔案說明

- `mahjong-3d-demo.html` — 主程式（含 CSS、HTML、JS）
- `assets/man.png|pin.png|sou.png|honor.png|flower.png` — 牌面 sprite
- `assets/table.png` — 桌布背景
- `assets/tile-back-style2.png` — 牌背木紋（風格二）
- `assets/tile-back-tex.png` — 舊牌背貼圖（保留為 fallback）

## 微調指南

詳見聊天紀錄總結。常用調整參數：

- 鏡頭：搜尋 `camera.position.set`
- 桌布位置：搜尋 `background-position` 或 `50% 28%`
- 牌牆抽牌狀態：搜尋 `buildWall` 內的 `const drop`
- 手牌角度：搜尋 `tiltX`
- 棄牌仰角：搜尋 `DTILT`
- 鳴牌/花牌位置：搜尋 `meldLx/meldLz/flowerLx/flowerLz`
- 牌局數據：在 `init()` 裡的 `youHand`、`buildDiscard`、`buildFlowers`、`buildMelds`
- HUD 剩牌數字：搜尋 `剩牌`
