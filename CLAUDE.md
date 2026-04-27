# CLAUDE.md — 台灣麻將單機版 開發指引

> 給 Claude（AI 助手）的專案說明，讓每次對話都能快速掌握架構、規則與注意事項。

---

## 專案概述

**mahjong-solo** 是一款純前端的台灣 16 張麻將單機遊戲，使用單一 HTML 檔案完成，無後端、無框架依賴。

- 主檔案：`mahjong-solo.html`（HTML + CSS + JS 全合一）
- 牌圖：`tiles-sprite.css` + `images/` 資料夾（萬/筒/條/字/花 PNG sprite）
- 多人版（另一套舊版）：`index.html` + `js/` + `css/`

---

## 版面架構（1280×720 固定設計尺寸）

JS 在啟動時對 `#tbl` 套用 `transform: scale()` 讓它適應任意視窗。

```
┌──────────────────────────────────────────────────────┐  y=0
│  #pa2-area  (top, 115px)  — 對家 p2（西家）         │
│  #pa3-area  (left, 200px wide)  — 左家 p3（北家）   │  y=115
│                                                      │
│        #pool  (880×430, left:200 top:115)            │
│          ┌──────────────────────────────┐            │
│          │  #dc2  (p2 棄牌，top zone)   │            │
│          │  .cp  (center circle)         │            │
│          │  #dc3  #dc1  (left/right)     │            │
│          │  #dc0  (p0 棄牌，bottom zone) │            │
│          │  #ps-N/S/W/E (score badges)   │            │
│          └──────────────────────────────┘            │
│  #pa1-area  (right, 200px wide)  — 右家 p1（南家）  │  y=545
│  #p0-zone  (bottom, 175px)  — 自己 p0（東家）       │
└──────────────────────────────────────────────────────┘  y=720
```

### 關鍵 CSS 規則

- `#tbl` 用 `position: relative; display: block`（非 grid）
- 所有玩家區塊用 `position: absolute` 定位
- `#pool` 有 `overflow: hidden`，棄牌 sprite 靠 `.z-td/.z-bd/.z-ld/.z-rd` class 套用
- `#action-overlay` 是 `position: absolute; bottom: 180px`（相對 `#pa0`），在副露牌 / 手牌之上、不遮蓋 `#ma0`
- 副露牌容器 `#pa1-area, #pa3-area` 需 `overflow: visible`（避免裁切）

### Sprite CSS 注意事項

`tiles-sprite.css` 只對以下 class 內的 `.t` 套用 sprite：
- `.z-td`（dc2 — p2 棄牌）
- `.z-bd`（dc0 — p0 棄牌）
- `.z-ld`（dc3 — p3 棄牌）
- `.z-rd`（dc1 — p1 棄牌）

**副露牌（`.ma .t`）不在 sprite 範圍**，所以 `.ma .t` **不可加** `background-image: none`，否則會移除 `.t` 的象牙漸層背景（`background:` shorthand = `background-image`），讓牌變透明。

---

## 重要 JS 模組

| 功能 | 位置 |
|------|------|
| 牌面 SVG 渲染 | `tileSVG(tile)` |
| 建立牌元素 | `mkTile(tile, cls, click)` |
| 建立暗牌 | `mkBack(cls)` |
| 主要遊戲物件 | `const Game = { ... }` |
| AI 邏輯 | `const AI = { ... }` |
| 音效 | `const Snd = { ... }` |
| render() | `Game.render()` — 每次狀態變更後呼叫 |

### render() 負責更新

1. deck count / cbar / rwind（中央圓圈）
2. 四方 score badges（`#ps-N/S/E/W`）
3. turn spotlight（`#turn-light`）
4. 每位玩家：pbar（名字、金錢、tenpai badge）、melds（`#maX`）、hand（`#htX`）
5. 四個棄牌區（`#dcX`）

---

## 已知陷阱 / 注意事項

1. **棄牌不顯示** → 檢查 `#dcX` 是否有對應 `z-*d` class；`#pool .t` 的大小要配合 sprite（28×39px）
2. **副露牌透明** → 勿在 `.ma .t` 加 `background-image: none`
3. **action-overlay 擋住牌** → `position: absolute; bottom: 180px`（在 #pa0 內），不可改為 in-flow
4. **重複 id** → `#turn-light` 只能有一個，舊版多餘的已移除
5. **JS `bottom` 定位** → `ov.style.bottom` 相關程式碼已全部移除，改用 CSS 固定值
6. **Sprite 只作用於棄牌區** → 副露牌、手牌背面等不走 sprite

---

## 開發時常用指令

```bash
# 本地預覽（需在 mahjong/ 目錄）
python3 -m http.server 8080
# 然後開 http://localhost:8080/mahjong-solo.html
```

---

## 待辦 / 未來功能

- [ ] 聽牌指示更清楚
- [ ] 花牌動畫
- [ ] 聲音音量控制
- [ ] 行動版適配（目前僅 transform:scale 縮放）
- [ ] 統計資料持久化（localStorage）
