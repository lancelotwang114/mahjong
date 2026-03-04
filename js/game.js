// ===== GAME STATE MANAGER =====
window.MahjongGame = {
  state: null,
  myIndex: 0,
  isHost: false,

  initGame(playerNames) {
    const { createFullDeck, shuffle, sortTiles } = window.MahjongEngine;
    const deck = shuffle(createFullDeck());
    
    // Deal 16 tiles to each player (Taiwan style)
    const hands = [[], [], [], []];
    let deckPos = 0;
    const flowers = [[], [], [], []];
    
    // Initial deal: 16 tiles each
    for (let p = 0; p < 4; p++) {
      while (hands[p].length < 16) {
        const tile = deck[deckPos++];
        if (tile.isFlower) {
          flowers[p].push(tile);
          // Draw replacement - but for now just continue
        } else {
          hands[p].push(tile);
        }
      }
    }

    this.state = {
      phase: 'playing',
      round: 1,
      turn: 0, // player index
      deck: deck.slice(deckPos),
      deckIndex: deckPos,
      hands: hands.map(h => sortTiles(h)),
      flowers,
      melds: [[], [], [], []],
      discards: [[], [], [], []],
      scores: [0, 0, 0, 0],
      winds: ['東', '南', '西', '北'],
      roundWind: '東',
      lastDiscard: null,
      lastDiscardPlayer: -1,
      pendingMeld: null,
      waitingFor: [], // player indices who need to respond
      gameLog: [],
      playerNames,
      winner: null
    };
    
    return this.state;
  },

  drawTile(playerIndex) {
    const state = this.state;
    if (state.deck.length === 0) {
      state.phase = 'draw'; // Nobody wins - draw
      return null;
    }
    let tile = state.deck.shift();
    // Handle flowers
    while (tile && tile.isFlower) {
      state.flowers[playerIndex].push(tile);
      state.gameLog.push(`${state.playerNames[playerIndex]} 翻到花牌: ${tile.name}`);
      tile = state.deck.shift();
    }
    if (!tile) { state.phase = 'draw'; return null; }
    return tile;
  },

  discard(playerIndex, tileId) {
    const state = this.state;
    const hand = state.hands[playerIndex];
    const tileIdx = hand.findIndex(t => t.id === tileId);
    if (tileIdx === -1) return false;
    const [tile] = hand.splice(tileIdx, 1);
    state.discards[playerIndex].push(tile);
    state.lastDiscard = tile;
    state.lastDiscardPlayer = playerIndex;
    state.gameLog.push(`${state.playerNames[playerIndex]} 打出 ${tile.name}`);
    
    // Next turn
    state.turn = (playerIndex + 1) % 4;
    return tile;
  },

  performMeld(playerIndex, meldType, tiles, discardedTile) {
    const state = this.state;
    const hand = state.hands[playerIndex];
    
    // Remove tiles from hand
    tiles.forEach(t => {
      const idx = hand.findIndex(h => h.id === t.id);
      if (idx !== -1) hand.splice(idx, 1);
    });
    
    // Remove last discard from discard pile
    const discardPile = state.discards[state.lastDiscardPlayer];
    const dIdx = discardPile.findIndex(t => t.id === discardedTile.id);
    if (dIdx !== -1) discardPile.splice(dIdx, 1);
    
    const meld = { type: meldType, tiles: [...tiles, discardedTile] };
    state.melds[playerIndex].push(meld);
    state.turn = playerIndex;
    
    state.gameLog.push(`${state.playerNames[playerIndex]} ${meldType === 'pong' ? '碰' : meldType === 'chi' ? '吃' : '槓'} ${discardedTile.name}`);
    
    // Kong gets extra draw
    if (meldType === 'kong') return 'draw_extra';
    return 'discard';
  },

  declareWin(playerIndex, isSelfDraw) {
    const state = this.state;
    state.phase = 'ended';
    state.winner = playerIndex;
    
    // Simple scoring
    const baseScore = 3;
    const flowerBonus = state.flowers[playerIndex].length;
    const selfDrawBonus = isSelfDraw ? 1 : 0;
    const total = baseScore + flowerBonus + selfDrawBonus;
    
    if (isSelfDraw) {
      // All others pay
      for (let p = 0; p < 4; p++) {
        if (p !== playerIndex) {
          state.scores[p] -= total;
          state.scores[playerIndex] += total;
        }
      }
    } else {
      // Only discard player pays
      const payer = state.lastDiscardPlayer;
      state.scores[payer] -= total * 3;
      state.scores[playerIndex] += total * 3;
    }
    
    state.gameLog.push(`🎉 ${state.playerNames[playerIndex]} 胡牌！獲得 ${total} 台`);
    return { winner: playerIndex, score: total, isSelfDraw };
  },

  getPublicState(forPlayer) {
    const s = this.state;
    return {
      phase: s.phase,
      turn: s.turn,
      myHand: s.hands[forPlayer],
      myFlowers: s.flowers[forPlayer],
      myMelds: s.melds[forPlayer],
      opponentHandCounts: s.hands.map((h, i) => i === forPlayer ? null : h.length),
      opponentMelds: s.melds,
      opponentFlowers: s.flowers,
      discards: s.discards,
      deckCount: s.deck.length,
      scores: s.scores,
      winds: s.winds,
      roundWind: s.roundWind,
      lastDiscard: s.lastDiscard,
      lastDiscardPlayer: s.lastDiscardPlayer,
      playerNames: s.playerNames,
      gameLog: s.gameLog.slice(-20),
      winner: s.winner
    };
  }
};
