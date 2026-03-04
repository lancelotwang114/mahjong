// ===== GAME STATE MANAGER v2 =====
window.MahjongGame = {
  state: null,

  initGame(playerNames, settings) {
    const { createFullDeck, shuffle, sortTiles } = window.MahjongEngine;
    const deck = shuffle(createFullDeck());
    const hands = [[],[],[],[]];
    const flowers = [[],[],[],[]];
    let pos = 0;

    // Deal 16 tiles, separate flowers
    for (let p = 0; p < 4; p++) {
      while (hands[p].length < 16 && pos < deck.length) {
        const t = deck[pos++];
        if (t.isFlower) flowers[p].push(t);
        else hands[p].push(t);
      }
    }

    // Replace flowers: each flower gets a replacement from end of deck
    // We mark pending replacements
    const pendingReplace = flowers.map(f => f.length);

    const startMoney = settings?.startMoney || 10000;
    this.state = {
      phase: 'flower_replace',   // start with flower replacement phase
      round: 1,
      turn: 0,
      drawnTileId: null,         // ID of the tile just drawn this turn
      preDrawHand: null,         // hand before draw (for display)
      deck: deck.slice(pos),
      hands: hands.map(h => sortTiles(h)),
      flowers,
      pendingReplace,            // how many replacement draws each player needs
      melds: [[],[],[],[]],
      discards: [[],[],[],[]],
      money: [startMoney, startMoney, startMoney, startMoney],
      settings: {
        startMoney,
        base: settings?.base || 1,        // 底
        taiValue: settings?.taiValue || 100, // 每台多少錢
        turnTime: settings?.turnTime || 20,  // seconds per turn
      },
      winds: ['東','南','西','北'],
      roundWind: '東',
      lastDiscard: null,
      lastDiscardPlayer: -1,
      tenpai: [false,false,false,false], // 聽牌狀態
      tenpaiTiles: [null,null,null,null], // 聽什麼牌
      gameLog: [],
      playerNames,
      winner: null,
      winData: null,
      diceResult: null,
    };
    return this.state;
  },

  // Roll dice (simulate)
  rollDice() {
    const d1 = Math.floor(Math.random()*6)+1;
    const d2 = Math.floor(Math.random()*6)+1;
    this.state.diceResult = [d1, d2];
    return [d1, d2];
  },

  // Give replacement tile for flower
  giveFlowerReplacement(playerIndex) {
    const state = this.state;
    if (state.pendingReplace[playerIndex] <= 0) return null;
    let tile = state.deck.shift();
    while (tile && tile.isFlower) {
      state.flowers[playerIndex].push(tile);
      state.pendingReplace[playerIndex]++;
      state.gameLog.push(`${state.playerNames[playerIndex]} 又翻到花牌: ${tile.name}`);
      tile = state.deck.shift();
    }
    if (!tile) return null;
    state.pendingReplace[playerIndex]--;
    state.hands[playerIndex] = window.MahjongEngine.sortTiles([...state.hands[playerIndex], tile]);
    return tile;
  },

  startPlayPhase() {
    this.state.phase = 'playing';
    this.state.turn = 0;
  },

  drawTile(playerIndex) {
    const state = this.state;
    if (state.deck.length === 0) { state.phase = 'draw'; return null; }
    let tile = state.deck.shift();
    while (tile && tile.isFlower) {
      state.flowers[playerIndex].push(tile);
      state.gameLog.push(`${state.playerNames[playerIndex]} 補花: ${tile.name}`);
      tile = state.deck.shift();
    }
    if (!tile) { state.phase = 'draw'; return null; }
    // Append to end (rightmost), do NOT sort yet
    state.hands[playerIndex].push(tile);
    state.drawnTileId = tile.id;
    return tile;
  },

  // Sort hand but keep drawn tile at end
  sortHandKeepDrawn(playerIndex) {
    const state = this.state;
    const drawnId = state.drawnTileId;
    const hand = state.hands[playerIndex];
    const drawn = drawnId ? hand.find(t => t.id === drawnId) : null;
    const rest = drawn ? hand.filter(t => t.id !== drawnId) : hand;
    const sorted = window.MahjongEngine.sortTiles(rest);
    state.hands[playerIndex] = drawn ? [...sorted, drawn] : sorted;
  },

  discard(playerIndex, tileId) {
    const state = this.state;
    const hand = state.hands[playerIndex];
    const idx = hand.findIndex(t => t.id === tileId);
    if (idx === -1) return false;
    const [tile] = hand.splice(idx, 1);
    // After discard, sort the remaining hand
    state.hands[playerIndex] = window.MahjongEngine.sortTiles(state.hands[playerIndex]);
    state.discards[playerIndex].push(tile);
    state.lastDiscard = tile;
    state.lastDiscardPlayer = playerIndex;
    state.drawnTileId = null;
    state.gameLog.push(`${state.playerNames[playerIndex]} 打出 ${tile.name}`);
    state.turn = (playerIndex + 1) % 4;
    // Recheck tenpai for this player
    this.checkTenpai(playerIndex);
    return tile;
  },

  // Check tenpai for a player
  checkTenpai(playerIndex) {
    const state = this.state;
    const hand = state.hands[playerIndex].filter(t => !t.isFlower);
    const melds = state.melds[playerIndex];
    // Only check if in correct tile count for tenpai (13 tiles in hand when no melds, etc)
    const expectedHandSize = 13 - melds.length * 3;
    if (hand.length !== expectedHandSize) {
      state.tenpai[playerIndex] = false;
      state.tenpaiTiles[playerIndex] = null;
      return;
    }
    const waiting = window.MahjongEngine.findTenpaiTiles(hand);
    state.tenpai[playerIndex] = waiting.length > 0;
    state.tenpaiTiles[playerIndex] = waiting.length > 0 ? waiting : null;
  },

  // Count remaining tiles in deck + other hands for a given tile type
  countRemainingTile(tile, excludePlayer) {
    const state = this.state;
    let count = state.deck.filter(t => t.suit === tile.suit && t.value === tile.value).length;
    state.discards.forEach(pile => {
      // tiles in discard piles are gone
    });
    // tiles in other players hands we can't see, but tiles in own visible discards are gone
    return count;
  },

  performMeld(playerIndex, meldType, tiles, discardedTile) {
    const state = this.state;
    const hand = state.hands[playerIndex];
    tiles.forEach(t => {
      const i = hand.findIndex(h => h.id === t.id);
      if (i !== -1) hand.splice(i, 1);
    });
    const pile = state.discards[state.lastDiscardPlayer];
    const di = pile.findIndex(t => t.id === discardedTile.id);
    if (di !== -1) pile.splice(di, 1);
    const allTiles = [...tiles, discardedTile].sort((a,b)=>a.value-b.value);
    state.melds[playerIndex].push({ type: meldType, tiles: allTiles });
    state.turn = playerIndex;
    state.drawnTileId = null;
    state.hands[playerIndex] = window.MahjongEngine.sortTiles(state.hands[playerIndex]);
    const label = {pong:'碰',chi:'吃',kong:'槓'}[meldType]||meldType;
    state.gameLog.push(`${state.playerNames[playerIndex]} ${label} ${discardedTile.name}`);
    if (meldType === 'kong') return 'draw_extra';
    return 'discard';
  },

  declareWin(playerIndex, isSelfDraw) {
    const state = this.state;
    state.phase = 'ended';
    state.winner = playerIndex;
    const hand = state.hands[playerIndex].filter(t=>!t.isFlower);
    const melds = state.melds[playerIndex];
    const flowerCount = state.flowers[playerIndex].length;
    const { isSevenPairs, analyzeHand } = window.MahjongEngine;

    let tai = 0;
    const bonuses = [];
    const base = state.settings.base || 1;
    const taiVal = state.settings.taiValue || 100;

    tai += base;
    bonuses.push(`底 ${base}台`);
    if (flowerCount > 0) { tai += flowerCount; bonuses.push(`花牌 ${flowerCount}台`); }
    if (isSelfDraw) { tai += 1; bonuses.push('自摸 1台'); }
    if (melds.length === 0) { tai += 1; bonuses.push('門清 1台'); }

    const allTiles = [...hand];
    melds.forEach(m => allTiles.push(...m.tiles));
    if (isSevenPairs(allTiles.filter(t=>!t.isFlower))) { tai += 3; bonuses.push('七對 3台'); }
    const suits = new Set(allTiles.filter(t=>!t.isFlower).map(t=>t.suit));
    if (suits.size===1 && !suits.has('honor')) { tai += 3; bonuses.push('清一色 3台'); }
    if (allTiles.every(t=>t.suit==='honor')) { tai += 5; bonuses.push('字一色 5台'); }

    const perTai = taiVal;
    const total = tai * perTai;

    if (isSelfDraw) {
      for (let p=0;p<4;p++) if(p!==playerIndex) {
        state.money[p] -= total;
        state.money[playerIndex] += total;
      }
    } else {
      const payer = state.lastDiscardPlayer;
      const pay = total * 3;
      state.money[payer] -= pay;
      state.money[playerIndex] += pay;
    }

    state.winData = {
      playerIndex, isSelfDraw,
      tai, bonuses,
      perTai, total,
      payerIndex: isSelfDraw ? -1 : state.lastDiscardPlayer
    };
    state.gameLog.push(`🎉 ${state.playerNames[playerIndex]} 胡牌！${tai}台 共${isSelfDraw?'各付':'付'}$${total}`);
    return state.winData;
  },

  getPublicState(forPlayer) {
    const s = this.state;
    return {
      phase: s.phase,
      turn: s.turn,
      drawnTileId: s.drawnTileId,
      myHand: s.hands[forPlayer],
      myFlowers: s.flowers[forPlayer],
      myMelds: s.melds[forPlayer],
      allHands: s.phase === 'ended' ? s.hands : null,
      opponentHandCounts: s.hands.map((h,i)=>i===forPlayer?null:h.length),
      opponentMelds: s.melds,
      opponentFlowers: s.flowers,
      discards: s.discards,
      deckCount: s.deck.length,
      money: s.money,
      settings: s.settings,
      winds: s.winds,
      roundWind: s.roundWind,
      lastDiscard: s.lastDiscard,
      lastDiscardPlayer: s.lastDiscardPlayer,
      tenpai: s.tenpai,
      tenpaiTiles: s.tenpaiTiles,
      playerNames: s.playerNames,
      gameLog: s.gameLog.slice(-25),
      winner: s.winner,
      winData: s.winData,
      diceResult: s.diceResult,
    };
  }
};
