## ✅ 複查（2026-05-31）：連線層確認完整、安全關鍵邏輯兩版同步

> 本次以 `diff -w` 逐函式複查 `index.html`(2D) vs `index-3d.html`(3D)。

- **連線層已完整移植且逐字相同**：`_processAction`、`broadcastState`、`_rotateState`、`_handleMsg`(23 個 case)、`MahjongNetwork`(PeerJS 包裝) 兩版一致。**下半部 2026-05-29 報告中「3D 連線層沒接上」的結論已過時，以本節為準。**
- **計時 / 出牌鎖 / 鳴牌併發鎖**：`doDiscard`、`startTimer`/`stopTimer`、`onTile`、`_setupNonHostTurn`、`offerMeld` 系列鎖邏輯，兩版逐字相同。
- **修正：線上非房主「最後一秒雙打→相公」**：`doDiscard` 非房主分支送出 action 後沒 `stopTimer`，最後一秒出牌且房主 game_state 未回時，計時器逾時會強制解鎖再代打一張。已在 2D + 3D 同步補上 `stopTimer()`+清看門狗。
- **未發現同類未修 race**：鳴牌路徑因「按鈕 onclick 第一步即 stopTimer+clearBtns」與「房主 `_meldPendingSet` 守門」雙重防護，沒有雙打問題；`doWin` 守門後立即 `phase='ended'`+`_killAllTimers()`，不會觸發兩次。
- **待 live 雙人實測**：最後一秒按碰/胡的時序、跨裝置時鐘偏移下的鳴牌倒數、八仙/七搶一/天聽地聽線上結算。

### 3D 專屬的刻意差異（非 bug，與安全無關）

移除 wait-dots「等待中」、移除「輪到你」toast、跳過 DOM 飛牌動畫、單一鳴牌不跳預覽字卡、多吃法走 `showChiPicker`、牌背由房主統一(game_start 同步)、牌背 lazy load + 縮圖(行動裝置記憶體)、計時圓環平滑過渡(circ 120→107)、發牌從莊家起、棄牌 east/west 旋轉修正、自家手牌仰角(south.x=-32)、玩家面板輪到金脈衝+浮動/聽牌紅光。

---

## ✅ 更新（2026-05-29）：3D 連線層已移植

3D 的傳輸/控制層已從 2D 完整移植，現在 `index-3d.html`：
- 加入 PeerJS（cdnjs 1.5.2）
- `window.Online`（含 16 種訊息 case 的 _handleMsg + _processAction 房主仲裁 + broadcastState + _rotateState + 大廳建立/加入流程）由 stub 換成 2D 完整實作
- `window.MahjongNetwork`（PeerJS 包裝）由 stub 換成 2D 完整實作
- 結算「下一局」按鈕補上 `id="wov-next-btn"` 並接 `nextRoundFromOverlay`（單機行為不變）

3D Game 本來就 online-aware（newRound/_proceedNewRound/_readyPlayers/_peers… 與 2D 相同），所以只需補傳輸層。已通過 `node --check`，16 種訊息 case 與 2D 逐一對齊。**待 push 後做 live 雙人實測。**

---

## 🀄 台數計算實作對照（2026-05-29 依規則書全面校正）

> 計分集中在 `Game.doWin()`，**2D/3D 逐字相同**（每次改動後都用正規化比對驗證）。
> 花牌特殊胡另由 `_checkFlowerWin()` + `doFlowerWin()` 處理。所有改動皆以 `node --check` + 單元測試驗證。

### 32 條台型實作狀態

| # | 台型 | 台數 | 狀態 | 實作位置／備註 |
|---|------|------|------|----------------|
| 1 | 莊家台 | +1 | ✅校正 | doWin；莊家**胡或放槍皆計**（`p===dealer \|\| (!selfDraw && lastP===dealer)`） |
| 2 | 連莊台 | 連n拉n=2n+1 | ✅校正 | doWin；原 `1+n` 改為 `2*hb+1`（連一3/連二5…） |
| 3 | 三元牌刻 | +1 | ✅符合 | doWin 役牌段；字牌須成刻（眼不計） |
| 4 | 風牌（本風+圈風） | 各+1,至多2 | ✅符合 | doWin 役牌段（圈風=roundWind、自風=seatWind） |
| 5 | 自摸 | +1 | ✅符合 | doWin |
| 6 | 門清 | +1 | ✅符合 | 暗槓不破門清 |
| 7 | 門清一摸三 | 3 | ✅符合 | 含自摸+門清不重複 |
| 8 | 花牌（正花） | 每隻+1,**至多2** | ✅校正 | doWin；只計「`v%4===門風`」的正花（君子組+季組各一），原本「見花就+1」已修正 |
| 9 | 同組花牌（花槓） | +2 | ✅校正 | 集滿梅蘭竹菊/春夏秋冬一組 +2，取代該組正花（不另計花位） |
| 10 | 獨聽 | +1 | ✅符合 | 含絕章補充（用原始聽牌張判定） |
| 11 | 槓上開花 | +1 | ✅符合 | `_kongWin` |
| 12 | 海底撈月 | +1 | ✅符合 | （河底撈魚 +1 亦有） |
| 13 | 搶槓胡 | +1 | ✅符合 | `_robKong` |
| 14 | 全求／半求 | 2／半求另計 | ✅校正 | 放槍=全求+2；**自摸版=半求+1**（合自摸+單吊=3） |
| 15 | 平胡 | +2 | ✅校正 | **排除自摸**（加 `!selfDraw`） |
| 16 | 三暗刻 | +2 | ✅校正 | **放槍補成的刻子視為明刻**不計暗 |
| 17 | 四暗刻 | +5 | ✅符合 | |
| 18 | 五暗刻 | +8 | ✅校正 | 原誤給 +16，改 **+8** |
| 19 | 碰碰胡 | +4 | ✅符合 | |
| 20 | 混一色 | +4 | ✅符合 | |
| 21 | 清一色 | +8 | ✅符合 | |
| 22 | 字一色 | +16 | ✅符合 | |
| 23 | 小三元 | +4 | ✅校正 | **不另計三元牌役牌** |
| 24 | 大三元 | +8 | ✅校正 | **不另計三元牌役牌**（原會多計） |
| 25 | 小四喜 | +8 | ✅校正 | **不另計風牌役牌**（原只擋大四喜） |
| 26 | 大四喜 | +16 | ✅符合 | 役牌正確抑制 |
| 27 | 八仙過海 | +8 | ✅新增 | `_checkFlowerWin`/`doFlowerWin`；集滿8花自動判胡（各家付）；手牌同時成牌則走正常 doWin |
| 28 | 七搶一 | +8 | ✅新增 | 花出齊7-1分配→7花者搶胡、1花者放槍；線上簡化版（無相公/藏牌） |
| 29 | 地聽 | +4 | ✅新增 | 宣告聽牌當下標記 `s._tingType`（第一巡+全場無鳴牌，閒家）；doWin 計分，不另計門清 |
| 30 | 天聽 | +8 | ✅新增 | 同上（莊家、遊戲首棄牌前宣告） |
| 31 | 地胡 | +16 | ✅新增 | doWin；閒家第一巡內胡牌（含人胡），不另計門清/自摸 |
| 32 | 天胡 | +16 | ✅符合 | （順手修正原本天胡會多計門清的小瑕疵） |
| 補充2 | MIGI 咪幾 | 一律8 | ⚪未採用 | 選用合併慣例；目前依主文地聽4/天聽8 分開計。需要可一行切換 |

### 關鍵實作函式
- `doWin(p,selfDraw)`：主計分（底/花/門清/自摸/天胡/地胡/天聽/地聽/役牌/暗刻/牌型/三元四喜…）
- `_checkFlowerWin(curP)`：補花後偵測 8-0(八仙)/7-1(七搶一)，房主/單機判定
- `doFlowerWin(p,type,payer)`：花牌特殊胡結算（不動 doWin，含線上 game_over 廣播）
- `s._tingType[p]`：天聽/地聽旗標，於 `confirmRiichi`(p0) 與房主 `declareRiichi` handler 標記
- hook：`doTurn` 摸花後、`_doFlowerReplacement` 初始補花後 各一行 `_checkFlowerWin`

### 待 live 雙人實測項目
八仙過海、七搶一、天聽/地聽、地胡的線上結算與付籌（這些動到補花/出牌/宣告流程，靜態驗證已過，仍建議開兩個瀏覽器實測一次）。

---

# 2D ↔ 3D 遊戲邏輯比對報告

> 比對對象：`index.html`(2D) vs `index-3d.html`(3D)
> 方法：brace-matching 抽出函式 → 去註解、壓空白後正規化比對
> 日期：2026-05-29

## 結論一句話

> ⚠️ 本段為 2026-05-29 初版結論，**關於「連線層沒接上」已過時**，請以本檔最上方 2026-05-31 複查為準（連線層已完整移植、逐字相同）。

**所有遊戲規則、計分、AI、單機流程、計時器、鳴牌併發鎖邏輯，兩版「逐字相同」。**（初版誤判連線層未接上，實際已移植完成。）

---

## 逐函式比對表

### 純規則 / 計分輔助 — 全部相同 ✅

| 函式 | 結果 |
|------|------|
| canWin / canForm / is7p / isShiSanYaoHand | ✅ 相同 |
| meldOpts / tenpaiTiles / discRemaining / sortH | ✅ 相同 |
| calcBlockScore / calcShanten / calcShantenStd | ✅ 相同 |
| selfKongPreservesTenpai | ✅ 相同 |

### 遊戲流程 / 計時 / 鳴牌 — 幾乎全相同 ✅

| 函式 | 結果 |
|------|------|
| doTurn (159行) / doDiscard / checkReactions / doMeld | ✅ 相同 |
| **doWin (222行，含全部台型計分)** | ✅ 相同 |
| nextTurn / doSelfKong / checkTenpai | ✅ 相同 |
| startTimer / stopTimer / clearBtns | ✅ 相同 |
| _setupNonHostTurn | ✅ 相同 |
| _offerNonHostMeld / _startMeldLock / _submitMeldResponse / _resolveMeldLock | ✅ 相同 |
| **offerMeld** | ⚠️ 差異（**純 UI**，見下） |

### AI — 全部相同 ✅

| 函式 | 結果 |
|------|------|
| AI.meld / AI.discard / AI.selfKong | ✅ 相同 |

### 連線 / P2P — 已移植，逐字相同 ✅（2026-05-31 複查更正）

| 項目 | 2D | 3D |
|------|----|----|
| `_processAction`(房主處理收到的動作) | ✅ 有完整定義 | ✅ **逐字相同** |
| `_handleMsg` 訊息分發(23 個 case，含 'meld_offer'/'action'/'game_state') | ✅ | ✅ **case 集合一致** |
| `broadcastState()`(房主廣播狀態) | ✅ 完整實作 | ✅ **逐字相同** |
| `_rotateState`(座位旋轉) | ✅ 有 | ✅ 有（相同） |
| `_offerNonHostMeld` / `_startMeldLock` / `_submitMeldResponse` / `_resolveMeldLock` | ✅ 有 | ✅ **逐字相同** |
| `MahjongNetwork`(PeerJS 包裝) | ✅ | ✅ **逐字相同**（僅 `const` vs `window.` 宣告差異） |

---

## 兩處差異的說明

### 1. offerMeld — 只是 UI 差異，不是邏輯差異

3D 在 v1.7.13 刻意**移除了「碰 / 吃 / 明槓」三顆按鈕**（改成只能點手牌候選或 popup 字卡確認）。被移除的只有那三段 `createElement('button')`；**胡按鈕、跳過按鈕、候選牌高亮、鳴牌倒數邏輯兩版仍相同**。屬於你說的「UI 不動」範圍，無需同步。

### 2. 連線層 — 已移植完成（2026-05-31 更正：初版此處結論已作廢）

初版（2026-05-29）此處原寫「3D 連線層沒接上、只能單機」。**該結論已過時並更正**：經 `diff -w` 複查，3D 的 `_processAction` + `_handleMsg`(23 case) + `broadcastState` + `_rotateState` + `MahjongNetwork` 皆已從 2D 完整移植、**逐字相同**，3D 線上對戰可用。詳見本檔最上方 2026-05-31 複查節。

---

## 給你的同步建議

1. **規則 / 計分 / AI / 單機流程 / 計時 / 出牌鎖 / 鳴牌鎖 / 連線層**：兩版已完全同步、逐字相同。日後若改其中一個**共用**函式（新增台型、修 AI、改連線仲裁），**同一份改動原封不動套到另一版即可**。
2. **只有「刻意的 3D 視覺/UX」是兩版分歧**（清單見本檔最上方）：改這些只動 3D、不要同步回 2D。
3. **改動共用安全關鍵函式時**（doDiscard/startTimer/offerMeld/_setupNonHostTurn/連線仲裁），務必兩版一起改並各跑一次 `node --check`，再開兩台 live 實測。
