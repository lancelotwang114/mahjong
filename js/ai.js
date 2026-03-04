// ===== AI PLAYER ENGINE =====
window.MahjongAI = {
  // Decide which tile to discard
  chooseDiscard(hand, melds, gameState) {
    const playable = hand.filter(t => !t.isFlower);
    if (playable.length === 0) return hand[0];
    
    // Score each tile for discarding (lower = better to discard)
    const scores = playable.map(tile => ({
      tile,
      score: this.tileValue(tile, playable, melds)
    }));
    scores.sort((a, b) => a.score - b.score);
    
    // Small random variance so AI isn't perfectly predictable
    const topN = Math.min(3, scores.length);
    const pick = Math.floor(Math.random() * topN);
    return scores[pick].tile;
  },

  tileValue(tile, hand, melds) {
    let score = 0;
    // Isolated honor tiles are worth less
    if (tile.suit === 'honor') {
      const count = hand.filter(t => t.suit === tile.suit && t.value === tile.value).length;
      return count >= 2 ? 5 : 1; // pairs OK, singles discard
    }
    // Count connections
    const suit = tile.suit, v = tile.value;
    const neighbors = hand.filter(t => 
      t.suit === suit && t !== tile &&
      Math.abs(t.value - v) <= 2
    ).length;
    score = neighbors * 3;
    // Pairs have value
    const pairs = hand.filter(t => t.suit === suit && t.value === v && t !== tile).length;
    score += pairs * 4;
    return score;
  },

  // Decide whether to Pong/Chi/Kong/Win on a discard
  decideMeld(options, hand, melds) {
    if (!options.length) return null;
    // Always win
    const win = options.find(o => o.type === 'win');
    if (win) return win;
    // Kong if available
    const kong = options.find(o => o.type === 'kong');
    if (kong && Math.random() > 0.3) return kong;
    // Pong if it helps
    const pong = options.find(o => o.type === 'pong');
    if (pong && Math.random() > 0.5) return pong;
    // Chi rarely
    const chi = options.find(o => o.type === 'chi');
    if (chi && Math.random() > 0.7) return chi;
    return null;
  },

  // Self-draw kong check
  checkSelfKong(hand, melds) {
    const counts = {};
    hand.forEach(t => {
      const key = `${t.suit}_${t.value}`;
      counts[key] = (counts[key] || []);
      counts[key].push(t);
    });
    for (const key in counts) {
      if (counts[key].length === 4) return counts[key];
    }
    // Check adding to existing pong
    const pongs = melds.filter(m => m.type === 'pong');
    for (const pong of pongs) {
      const extra = hand.find(t => t.suit === pong.tiles[0].suit && t.value === pong.tiles[0].value);
      if (extra) return [...pong.tiles, extra];
    }
    return null;
  }
};
