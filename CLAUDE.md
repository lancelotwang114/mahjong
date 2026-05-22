# CLAUDE.md — 台灣麻將單機版 開發指引

> 給 Claude（AI 助手）的專案說明，讓每次對話都能快速掌握架構、規則與注意事項。
> 當前版本：**v1.7.0**

---

## 通用行為準則（Karpathy Guidelines）

> 減少常見 LLM 編碼錯誤的行為指引。**偏向謹慎而非速度**，對瑣碎任務可自行判斷取捨。

### 1. 先想清楚再動手
- 明確說明假設。不確定時，主動發問。
- 存在多種解讀時，列出選項——不要默默選一個。
- 若有更簡單的做法，說出來；有理由就推回。
- 遇到不清楚的地方，停下來，說明困惑點，再提問。

### 2. 簡單優先
- 只寫解決問題所需的最少程式碼，不做推測性擴充。
- 單一用途的程式碼不做抽象化。
- 沒被要求的「彈性」或「可配置性」一律不加。
- 200 行能寫成 50 行的，重寫。

### 3. 精準修改（Surgical Changes）
修改現有程式碼時：
- 不「順手改善」周邊的程式碼、註解或格式。
- 不重構沒壞的東西。
- 配合現有風格，即使你會用不同寫法。
- 發現無關的死碼，**提及**但不刪除。

自己改動產生的孤兒（orphan）：
- 移除**自己的修改**造成的無用 import / 變數 / 函式。
- 不移除原本就存在的死碼（除非被要求）。

**檢驗標準：每一行改動都能直接對應到使用者的需求。**

### 4. 目標導向執行
多步驟任務先說明計畫：
```
1. [步驟] → 驗證：[確認項目]
2. [步驟] → 驗證：[確認項目]
```
成功標準要可驗證，不接受「讓它能動就好」這種模糊條件。

---

## 專案概述

**mahjong-solo** 是一款純前端的台灣 16 張麻將單機遊戲，使用單一 HTML 檔案完成，無後端、無框架依賴。

- **主工作檔（直接編輯）：`index.html`**（HTML + CSS + JS 全合一）
- 牌圖：`tiles-sprite.css` + `images/` 資料夾（萬/筒/條/字/花 PNG sprite）
- `mahjong-solo.html` / `mahjong-solo.bak.html`：舊版備份，不再編輯
- ~~多人版~~：已廢棄，`js/` + `css/` 目錄為舊多人版殘留

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
- `#action-overlay` 在 `#tbl` 層，`position: absolute; right: 60px; bottom: 192px`，浮於手牌右上方，不遮蓋任何牌
- 副露牌容器 `#pa1-area, #pa3-area` 需 `overflow: visible`（避免裁切）

### Sprite CSS 注意事項

`tiles-sprite.css` 是全域套用：所有 `.t.man / .t.pin / .t.sou / .t.honor / .t.flower` 都會套用 sprite 背景，並用 `>span{display:none!important}` 隱藏 SVG overlay。

- 不限棄牌區，手牌、副露牌也走 sprite
- 尺寸 class (`sm`, `ti`, `side`) 對應不同 `background-size` 與 `background-position`
- **副露牌（`.ma .t`）不可加** `background-image: none`，否則會移除象牙漸層背景

---

## 牌面渲染規則（重要）

本專案有兩種牌面渲染方式，**必須按場景正確使用**：

| 場景 | 使用方式 | 備註 |
|------|----------|------|
| 手牌、副露牌、棄牌 | `mkTile(t, cls)` — CSS sprite + SVG 疊層 | `.t` div |
| **Tooltip / 鳴牌預覽牌** | `mkTile(t, '')` + `zoom: 0.52` | 全尺寸 mkTile 再縮放，sprite 比例正確 |
| 暗牌（背面） | `mkBack(cls)` | `.t.back` |

### Tooltip 牌面渲染（`_showCandidateTooltip` 內）

```js
const mkTipTile = (t, discTile) => {
  const e = mkTile(t, '');               // 全尺寸（62×86），sprite 正確顯示
  e.style.cssText += 'zoom:0.52;cursor:default;flex-shrink:0;';
  if (discTile && t.id === discTile.id) {
    e.style.outline = '2.5px solid var(--gold2)';
    e.style.boxShadow = '0 0 10px rgba(212,168,67,.85)';
  }
  return e;
};
```

**不可**用 `mkTile(t, 'sm')` — sm 尺寸在 tooltip 會造成 sprite 比例錯誤（圖案切出錯位）。
**不可**用舊版 `.chi-tile + tileSVG()` — 已廢棄，現在不用純 SVG tooltip。

---

## 鳴牌互動系統（v1.3+）

### 流程

1. 有人打牌 → `checkReactions()` → 找出可鳴牌的玩家
2. 輪到人類玩家 → `offerMeld(0, opts, tile)`
3. 可鳴牌的手牌浮起 + 金色脈衝（`.meld-candidate`）
4. 滑鼠移上候選牌 → `_showCandidateTooltip()` 顯示吃法預覽
5. **單一吃法**：點候選牌直接執行
6. **多種吃法**：tooltip 顯示所有吃法列（`.mt-combo.clickable`），點列執行對應吃法
7. 按「跳過」→ `clearBtns()` 清除所有高亮

### 重要：多吃法選擇

- 多吃法時 **不呼叫 `showChiPicker()`**（舊版已棄用）
- tooltip 的 `.interactive` class 讓 `pointer-events: auto` 生效
- 候選牌 `mouseleave` 有 220ms 延遲，讓滑鼠可移入 tooltip 點選
- `info.chiOpts` 存放原始 chiOpts 陣列，供 tooltip 列的 onclick 使用
- `clearBtns()` 頂部必須 `clearTimeout(this._tipLeaveTimer)` 防止 timer 遺留

### `_candidateMap` 資料結構

```js
Map<tileId, {
  label: '吃'|'碰'|'槓',
  combos: Array<tile[]>,   // 含棄牌的完整牌組（顯示用）
  action: Function,        // 點牌時執行（單吃直接 doMeld）
  chiOpts?: Array,         // 多吃法時存放原始 opts（tooltip 點選用）
  discTile?: tile          // 棄牌 tile 物件
}>
```

---

## 副露牌渲染規則

### 牌尺寸

| 玩家位置 | 尺寸 class | 實際大小 |
|----------|-----------|---------|
| p0（自己） | `sm` | 32×44px |
| p1（右家） | `sm` | 32×44px |
| p2（對家） | `ti` | 22×30px（頂欄 115px 限制） |
| p3（左家） | `sm` | 32×44px |

### 暗槓顯示

- `meld.dark === true` → 暗槓
- render 時 idx=1, idx=2 用 `mkBack(meldSz)` 反蓋
- idx=0, idx=3 用 `mkTile()` 正面 + `.dark-kong-outer` class
- `.mg.dark-kong` 套用深色邊框樣式

---

## 重要 JS 模組

| 功能 | 位置 |
|------|------|
| 牌面 SVG 渲染 | `tileSVG(tile)` |
| 建立牌元素（sprite+SVG） | `mkTile(tile, cls, click)` |
| 建立暗牌 | `mkBack(cls)` |
| 主要遊戲物件 | `const Game = { ... }` |
| AI 邏輯 | `const AI = { ... }` |
| 音效 | `const Snd = { ... }` |
| render() | `Game.render()` — 每次狀態變更後呼叫 |
| 鳴牌提示 | `Game.offerMeld(p, opts, tile)` |
| 候選牌高亮 | `Game._applyCandidateHighlights()` |
| Tooltip 顯示 | `Game._showCandidateTooltip(el, info, disc)` |
| Tooltip 隱藏 | `Game._hideCandidateTooltip()` — 移除 show+interactive，清除事件 |
| 聽牌偵測 | `Game.checkTenpai(p)` — 打牌後立即呼叫並更新面板 |
| 擲骰動畫 | `Game.showDice()` — 減速節奏 + 彈跳 + 金色光暈 |

### render() 負責更新

1. deck count / cbar / rwind（中央圓圈）
2. 四方 score badges（`#ps-N/S/E/W`）
3. turn spotlight（`#turn-light`）
4. 每位玩家：pbar（名字、金錢）、melds（`#maX`）、hand（`#htX`）
5. 四個棄牌區（`#dcX`）— 每家最後一張棄牌：`lastP` 家用 `.hi`（金色脈衝），其餘三家用 `.hi-prev`（放大+靜態金框）

---

## 已知陷阱 / 注意事項

1. **棄牌不顯示** → 檢查 `#dcX` 是否有對應 `z-*d` class；`#pool .t` 的大小要配合 sprite（28×39px）
2. **副露牌透明** → 勿在 `.ma .t` 加 `background-image: none`
3. **action-overlay 擋住牌** → 定位在 `#tbl` 層 `right:60px bottom:192px`，`position:absolute`，不可放回 `#p0-zone` 內
4. **重複 id** → `#turn-light` 只能有一個
5. **Sprite 全域套用** → 所有 `.t.man/.pin/.sou/.honor/.flower` 都走 sprite，tooltip 牌用 `mkTile+zoom:0.52` 而非純 SVG
6. **Tooltip 牌面花牌問題** → 用 `mkTile(t,'')` + `zoom:0.52`，**不可**用舊版 `.chi-tile + tileSVG()`
7. **多吃法不開 chi-picker** → 多種吃法一律透過 tooltip 列點選，`showChiPicker()` 僅保留備用，正常流程不呼叫。`吃` 按鈕 onclick 對 `chiOpts.length > 1` 必須執行 `doMeld`（用 `calcBlockScore` 選最佳組合），**不可只停 timer 不做吃** — 否則按鈕殘留 → 相公
8. **聽牌即時顯示** → `doDiscard` 與 `doMeld` 中打牌後立即 `checkTenpai` + `showTenpai`，不等下次摸牌
9. **clearBtns 必須清 timer** → `clearTimeout(this._tipLeaveTimer)` 在 `clearBtns()` 最頂，避免 tooltip timer 殘留

---

## 開發時常用指令

```bash
# 本地預覽（需在 mahjong/ 目錄）
python3 -m http.server 8080
# 然後開 http://localhost:8080/index.html
```

---

## v1.4.0 新增功能

### 骰子 3D 動畫（`showDice()`）
- CSS `perspective` 旋轉 + 落定彈跳 + 金色光環（`diceRing`）+ 火花粒子（`sparkFly`，每顆骰子 6 顆）
- `_addDiceFx(el)` 在骰子外側建立粒子與光環 DOM
- 點數字元用 `charReveal` 動畫逐一飛入

### 打牌飛行動畫（`_flyTile(tileId, targetDcId, done)`）
- 克隆手牌元素，以 `getBoundingClientRect()` 取得視窗座標（已含 `transform:scale`）
- 設為 `position:fixed`，以 CSS transition 飛至棄牌區後淡出移除
- `doDiscard()` 中 p===0 路徑：先呼叫 `_flyTile`，動畫結束才呼叫 `render()` + `checkReactions()`

### 主題換皮
- CSS `[data-theme="wood/jade/noir"]` 覆蓋 `--felt/--wood/--felt2` 等變數
- `Game.setTheme(name)` 設定 `document.documentElement.dataset.theme` 並存 localStorage
- 頁面載入時從 localStorage 還原主題

### 完整台型計分
- 海底撈月（自摸最後一張）+1、河底撈魚（打出最後一張）+1
- 槓上開花 +2（`s._afterKong` + `s._kongWin` 旗標）
- 十三么 +13（`isShiSanYao` 偵測，不含開放副露）

### AI 個性（`AI.meld(opts, hand, melds, style)` / `AI.discard(..., style)`）
- `style`: `'attack'`（積極鳴牌）/ `'balanced'`（依 block score 決策）/ `'defense'`（僅可聽牌時鳴）
- 大廳三個 AI 玩家各有獨立個性選單

### `calcBlockScore(hand)`
- 貪心計算牌型分數：完整順子/刻子 +3，搭子 +2，對子 +1
- 用於 AI 鳴牌與打牌決策

### 東風局完賽結算（`_showMatchSummary()`）
- `newRound()` 偵測 `prevRound >= 4` → 改呼叫 `_showMatchSummary()`
- `#match-ov` 全螢幕 overlay 顯示四人排名與最終籌碼
- 「再來一局」重新 `initRound()`；「回大廳」顯示 `#lobby`

### 統計折線圖（`Stats.renderChart()`）
- `Stats.data.history[]` 記錄每局累積損益
- SVG 折線圖繪製於 `#stats-chart`

---

## v1.5.0 新增功能

### 遊戲內輔助面板（`Game.toggleAssistPanel()`）
- `#assist-toggle`（⚙）→ 展開 `#assist-panel`，包含 4 個 toggle
- `calcShanten(hand, melds)` / `calcShantenStd(tiles, meldCount)`：精確遞迴向聽數算法
- `Game.updateShantenLabel()`：更新 `#shanten-label`，顏色按 -1(金)/0(綠)/1(橙)/2+(白)
- `Game.updateDangerDots()`：對手副露/聽牌分析，每張牌右下角顯示 `.danger-low/mid/high` 圓點
- `#tile-tracker` overlay：34 種牌剩餘張數 grid，🀄 按鈕切換顯示
- `Game.sortHand()`：手牌按花色+點數排序，S 鍵快捷
- 狀態存 `localStorage('mj_assist_v1')`

### 牌桌背景動態效果（`Game._initDustParticles()`）
- 注入 12 個 `.dust-particle` div，`@keyframes dustFloat` 緩慢漂浮
- 主題配色：預設金、wood 棕、jade 綠、noir 紫

### 快速開局模式（`Game.settings.quickStart`）
- `showDice()` 開頭判斷 quickStart → 跳過動畫
- `_flashFlower()` 同理跳過 overlay
- 存 `localStorage('mj_quick_v1')`

### 觸控手勢（Pointer Events API）
- `pointerdown/move/up` 在 `#ht0` 監聽：上滑 (ΔY<-40) → `doDiscard()`，長按 500ms → toast
- `#ht0 .t { touch-action: none }` CSS 允許覆蓋預設滾動

### 音效主題包（`Snd.theme` / `Snd.setTheme(t)`）
- `classic`（低頻厚重）/ `modern`（高頻清脆，預設）/ `mute`（靜音）
- 各音效方法（draw/discard/pong/chi）內部依 theme 切換頻率
- 存 `localStorage('mj_snd_theme_v1')`

### 背景音樂（`const Bgm`）
- `start()`：55Hz drone+LFO、五聲音階撥弦+Convolver 混響、白噪底層
- `stop()` / `setVolume(v)` / `setEnabled(bool)`
- 遊戲開始自動呼叫，大廳有開關+音量滑桿
- 存 `localStorage('mj_bgm_v1')`

---

## v1.5.4 新增功能（UX 優化）

### 高優先
- **等待中 dots**：p0 打牌後飛牌動畫結束時，`#wait-dots` 顯示三顆跳動點，`clearBtns()` 清除
- **Space 鍵跳過**：找 `#ap .ab.ask` 並 click
- **聽牌橫幅**：`#tenpai-banner` 絕對定位於 `bottom:178px`，`_showTenpaiBanner(remCount, waitTileCount)` 顯示，3 秒自動消失

### 中優先
- **流局詳情**：顯示罰款公式（有聽×N 各收 ¥X　無聽×M 各付 ¥Y）、每位聽牌玩家的等待牌（帶剩餘張數）
- **勝利手牌高亮**：胡牌者手牌依牌型分組渲染（順子/刻子/雀頭），組間加間距，底部顯示顏色圖例

### 低優先（鍵盤快捷鍵）
- `H` = 胡！（click `.ab.aw`）
- `←/→` = 導覽手牌（在 `.t` 上套 `.sel` class）
- `Enter` = 打出已選取的牌
- `Space` = 跳過（已在高優先實作）
- `S` = 排序（v1.5.0 已有）

### 鍵盤快捷鍵完整列表
| 按鍵 | 效果 | 條件 |
|------|------|------|
| `S` | 排序手牌 | 輔助面板排序開啟、輪到自己 |
| `Space` | 跳過 | 跳過按鈕可見 |
| `H` | 胡！ | 胡按鈕可見 |
| `←/→` | 選牌 | 自己的回合，無鳴牌按鈕 |
| `Enter` | 打出選取的牌 | 有 `.sel` 高亮的牌 |

---

## 待辦 / 未來功能

- [ ] 行動版獨立版面（直版手機排版）
- [ ] 多人連線版整合
- [ ] 牌局錄影回放
- [ ] 成就系統
