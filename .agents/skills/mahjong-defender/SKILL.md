---
name: mahjong-defender
description: |
  台灣麻將單機/P2P 專案（index.html）的防禦性編碼指引。
  凡涉及以下操作時必須載入本 skill：修改 doTurn、doDiscard、startTimer、
  stopTimer、clearBtns、checkReactions、_setupNonHostTurn、_flyTile、
  onTile，或任何與「計時器」「出牌鎖」「P2P 廣播」「Loading 指示器」
  「鳴牌按鈕」相關的程式碼。
  也適用於新增功能前的防禦審查，以及 Code Review 時確認改動不引入回歸。
---

# 台灣麻將專案防禦指引 (mahjong-defender)

> 本文件濃縮自 v1.6.4 → v1.6.8 四個版本修復的真實 Bug，
> 每條規則都對應一個曾在正式版本中出現過的致命問題。

---

## 一、修改前必讀：核心不變式

這些狀態關係在任何時候都必須成立。修改相關程式碼前先確認不會破壞它們。

| 不變式 | 說明 |
|--------|------|
| `this.timer !== null` ↔ `#tbadge.style.display === 'flex'` | 計時器 setInterval 與視覺圓圈必須同步 |
| `this._isDiscarding === true` → 飛牌動畫進行中 **或** 非房主等待 host 確認 | 這個旗標是防雙打的唯一閘門，不得遺漏重設 |
| `wait-dots.show` ↔ 本回合出牌已送出、等待反應解析 | 在 `doTurn(0)` 入口必須清除，否則玩家看到舊的 Loading |
| `s.turn === 0` → `#ht0.my-turn` 存在，且 `startTimer(0)` 已被呼叫 | 人類玩家回合的 UI 狀態三位一體 |
| 非房主 **絕不** 呼叫 `doTurn()` | 非房主只透過 `game_state` handler → `_setupNonHostTurn()` 進入回合 |

---

## 二、Bug 地圖：每個已知陷阱與對應防禦

### 🔴 Bug A — wait-dots 殘留導致雙打（v1.6.8 修復）

**症狀**：房主打牌後畫面卡在 `...`，倒數完畢後又被強制打出第二張牌（相公）。

**根因時序**：
```
doDiscard(0) → stopTimer ✓ → _flyTile(230ms) → callback 顯示 wait-dots
→ checkReactions → AI 快速輪轉(~1.2s) → doTurn(0) 再次執行
→ showBtns + startTimer(0) ← 但 wait-dots 仍在！
→ 玩家誤以為 Loading，不點牌 → timer 倒數完 → 第二次 doDiscard ← 相公
```

**防禦規則**：
```javascript
// doTurn() 的 else 分支（人類玩家）最頂端必須有：
document.getElementById('wait-dots')?.classList.remove('show');
Snd.draw();
// 這一行不可在 showBtns/startTimer 之後才清，必須在最前面
```

**驗證**：grep `wait-dots.*remove` 確認在 `} else {` 分支的第一個陳述式。

---

### 🔴 Bug B — `_isDiscarding` 鎖殘留導致非房主卡死（v1.6.7 修復）

**症狀**：P2P 非房主，計時器有秀出來（代表 `startTimer` 有執行），但自動打牌和手動點牌都沒有反應。

**根因**：非房主 `doDiscard` 廣播後 `return`，留下 `_isDiscarding=true`。
若 host 的 `game_state` 回傳延遲，鎖永遠不解，下一回合所有路徑都被擋住。

**防禦規則**：
```javascript
// startTimer(p) 在所有 guard 通過後、stopTimer 之前：
this._isDiscarding = false; // 計時器啟動 = 伺服器確認輪到自己 = 安全解鎖

// _setupNonHostTurn() 的三條路徑（autoPlay / riichiMode / 一般）
// 都必須在 startTimer(0) 之前：
this._isDiscarding = false;
```

**驗證**：`startTimer` 函式體頂端（guards 通過後）必須有 `_isDiscarding=false`。

---

### 🔴 Bug C — `startTimer` Guard 誤加 `.ab.ask` 導致計時器永遠不顯示（v1.6.6 修復）

**症狀**：有聽牌/略過按鈕的情境下，#tbadge 計時圓圈完全不出現。

**根因**：`.ab.ask`（略過按鈕）被誤加入「鳴牌抉擇期」的 guard selector，
但 `.ab.ask` 同時用於「出牌階段的略過」，導致有略過按鈕時 `startTimer` 永遠提前 return。

**防禦規則**：
```javascript
// startTimer 的鳴牌 guard 只能用這三個 class：
const _ap = document.getElementById('ap');
if (_ap && _ap.querySelectorAll('.ab.apo,.ab.ach,.ab.ako').length > 0) return;
// ✅ .ab.apo = 碰  .ab.ach = 吃  .ab.ako = 槓（暗槓）
// ❌ 絕對不能加 .ab.ask（略過）或 .ab.aw（胡/自摸）
```

**快速記憶**：鳴牌三兄弟 `apo/ach/ako`，其他按鈕都是出牌階段的按鈕，不阻擋計時。

---

### 🔴 Bug D — autoPlay Guard 在 `startTimer` 內導致計時圓圈不顯示（v1.6.6 修復）

**症狀**：開啟自動打牌後，計時圓圈消失，但自動打牌仍在背景執行。

**根因**：在 `startTimer` 加了 `if(this.autoPlay)return;`，與玩家「即便代打，圓圈仍須顯示」的期望相違。

**防禦規則**：
```javascript
// startTimer 內部禁止加 autoPlay 判斷
// 錯誤：if(this.autoPlay)return; ← 永遠不能在 startTimer 裡加這行

// autoPlay 路徑在 _setupNonHostTurn 中：
if(this.autoPlay){
  const discId = this._autoPlayDiscard(0);
  this._isDiscarding = false;
  this.startTimer(0); // ← 必須呼叫，讓圓圈顯示
  setTimeout(()=>{
    if(this.autoPlay && this.st?.phase==='playing' && this.st?.turn===0)
      this.doDiscard(0, discId);
  }, this.spd('discard'));
  return;
}
```

---

### 🟡 Bug E — `hasTimer` 判斷邏輯錯誤（v1.6.5 修復）

**症狀**：action-overlay 在不應該顯示時殘留在畫面上。

**根因**：`tbadge.style.display` 初始值是 `''`（空字串），不是 `'none'`。
用 `!== 'none'` 判斷會把空字串也當成「計時器活躍」。

**防禦規則**：
```javascript
// clearBtns() 及任何需要判斷計時器是否活躍的地方：
const hasTimer = tbadge && tbadge.style.display === 'flex'; // ✅
// ❌ 禁止：tbadge.style.display !== 'none'
```

---

## 三、P2P 架構規則（防路徑混淆）

```
房主（isHost）                    非房主（!isHost）
─────────────────────────────     ─────────────────────────────
doTurn() → 所有遊戲邏輯           永遠不呼叫 doTurn()
checkReactions()                  _setupNonHostTurn() 只從
doMeld() / doDiscard()            game_state handler 觸發
broadcastState() → 廣播           接收 game_state → render()
```

**廣播時機陷阱**：`doDiscard` 中的 `setTimeout(broadcastState, 150)` 在 `_flyTile`(230ms) callback 之前執行，此時 `s.turn` 尚未被 `checkReactions` 更新。在廣播前確認狀態是否完整。

**非房主 `_setupNonHostTurn` 三條路徑都必須**：
1. `this._isDiscarding = false` ← 解鎖
2. `this.startTimer(0)` ← 啟動計時圓圈

---

## 四、計時器生命週期（完整流程圖）

```
doTurn(0) [人類玩家回合]
  ├─ ✅ wait-dots.remove('show')   ← 清除上回合殘留
  ├─ showBtns(extraBtns)
  └─ startTimer(0)
       ├─ this._isDiscarding = false  ← 解鎖
       ├─ Guard: p!==0 → return
       ├─ Guard: phase!=='playing' → return
       ├─ Guard: .apo/.ach/.ako 存在 → return（鳴牌抉擇期）
       └─ badge.style.display = 'flex'  + setInterval
            └─ 到期：
                 ├─ Guard: _isDiscarding → return
                 ├─ Guard: wait-dots.show → return
                 └─ doDiscard(0, t2.id)

玩家點牌 → onTile(tile)
  ├─ Guard: _isDiscarding → return（動畫中）
  ├─ Guard: s.turn!==0 → return
  └─ doDiscard(0, tileId)
       ├─ _isDiscarding = true
       ├─ stopTimer() + clearBtns()
       └─ _flyTile(230ms) → callback
            ├─ _isDiscarding = false
            ├─ wait-dots.show  ← 等待反應
            └─ checkReactions() → AI 回合 → doTurn(0) 循環
```

---

## 五、`clearBtns()` 清除清單（修改前確認）

`clearBtns()` 負責清除以下所有 UI 狀態：
- ✅ `wait-dots` classList.remove('show')
- ✅ `#ap` 子元素（保留 `#tbadge`）
- ✅ `meld-candidate` class
- ✅ `meld-timer-bar` 歸零
- ✅ `my-turn` class（從 `#ht0`）
- ✅ `_tipLeaveTimer` clearTimeout
- ✅ `_meldCountInterval` clearInterval
- ✅ `action-overlay` active（若無 timer 且無 hbar）

**注意**：`showBtns()` 只清 `#ap` 子元素，**不清** `wait-dots`。
這是 Bug A 的直接成因——不要誤以為 `showBtns` 等同 `clearBtns`。

---

## 六、Git 規則（.gitignore + Commit 前確認）

### .gitignore 原則

| 檔案 / 目錄 | 進 git？ | 原因 |
|-------------|---------|------|
| `index.html` | ✅ | 主程式，必須追蹤 |
| `CHANGELOG.md` / `README.md` | ✅ | 文件 |
| `.Codex/` | ✅ | 專案 skill，協作者共用 |
| `tiles-sprite.css` / `images/` | ❌ ignore | 已內嵌，不對外公開 |
| `AGENTS.md` | ❌ ignore | 本地 AI 開發指引 |
| `*.skill` | ❌ ignore | 由 `.Codex/` 生成的二進位包，可隨時重建 |
| `layout*.png` / `preview*.png` | ❌ ignore | 開發用截圖，非遊戲資源 |
| `*-preview.html` | ❌ ignore | 開發用暫時預覽頁 |
| `mahjong-solo.bak.html` | 視情況 | 舊版備份，可 ignore |
| zip 失敗殘留（無副檔名隨機檔）| ❌ ignore + 手動刪除 | 如 `ziChN8IB`、`zikIe0bP` |

### Commit 前三道檢查

```bash
# ① 確認無 console.log / console.warn 殘留（允許 BGM/Voice 相關）：
grep -n "console\.\(log\|warn\|error\|debug\)" index.html

# ② 確認 Math.random() 只在動畫/延遲中：
grep -n "Math\.random" index.html | grep -v "fly\|Tile\|drawMs\|rotate\|deg"

# ③ 確認版本號已更新：
grep "lver" index.html
```

**每次 Commit 必須附上**：
1. 繁體中文說明的 commit message
2. `Co-Authored-By: Codex Sonnet 4.6 <noreply@anthropic.com>`
3. `lver` div 版本號已遞增（例：v1.6.8 → v1.6.9）
4. 無 hardcoded IP、測試帳號、寫死測試資料

---

## 七、修改後全域檢查清單（改 A 漏 B）

修改任何函式後，逐一確認以下影響點：

| 修改了 | 要同時確認 |
|--------|-----------|
| `startTimer` | `stopTimer`、`clearBtns hasTimer 判斷`、timer 到期代打邏輯 |
| `doDiscard` | `onTile guard`、`_isDiscarding 流程`、`wait-dots 清除` |
| `_setupNonHostTurn` | `_isDiscarding reset`、`startTimer(0) 呼叫順序`、三條分支是否全部覆蓋 |
| `clearBtns` | `showBtns 是否誤用`、`wait-dots 是否漏清` |
| `checkReactions` | `broadcastState 時機`、`s.turn 何時更新` |
| `offerMeld` | `meld-timer-bar`、`_meldTimeout`、`clearBtns 呼叫` |
| P2P 廣播邏輯 | `_isHost guard`、非房主路徑是否有對應 `game_state` handler |

---

## 八、常見錯誤模式速查

```javascript
// ❌ 錯誤：在 startTimer 加 autoPlay guard
if(this.autoPlay) return;

// ❌ 錯誤：hasTimer 用 !== 'none'
const hasTimer = tbadge && tbadge.style.display !== 'none';

// ❌ 錯誤：timer guard 加 .ab.ask 或 .ab.aw
if(_ap.querySelectorAll('.ab.apo,.ab.ach,.ab.ako,.ab.ask,.ab.aw').length > 0) return;

// ❌ 錯誤：doTurn(0) 玩家分支不清 wait-dots 直接 showBtns
} else {
  Snd.draw(); // ← wait-dots 殘留！

// ❌ 錯誤：_setupNonHostTurn 未重設鎖就呼叫 startTimer
this.startTimer(0); // ← _isDiscarding 可能仍是 true

// ✅ 正確示範：
} else {
  document.getElementById('wait-dots')?.classList.remove('show'); // 先清
  Snd.draw();
  // ...
  this._isDiscarding = false; // 解鎖
  this.startTimer(0);
```

---

*本 skill 版本對應遊戲版本 v1.6.8。若遊戲版本更新後有新的 Bug 修復模式，請同步更新本文件。*
