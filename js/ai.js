// ===== AI PLAYER ENGINE =====
window.MahjongAI = {
  // Decide which tile to discard
  chooseDiscard(hand, melds, gameState) {
    const playable = hand.filter(t => !t.isFlower);
    if (playable.length === 0) return hand[0];

    // Score each tile for discarding (lower = better to discard)
    const scores = playable.map(tile => ({
      tile,
      score: this.tileValue(tile, playable, melds, gameState)
    }));
    scores.sort((a, b) => a.score - b.score);

    // Small random variance so AI isn't perfectly predictable
    const topN = Math.min(3, scores.length);
    const pick = Math.floor(Math.random() * topN);
    return scores[pick].tile;
  },

  tileValue(tile, hand, melds, gameState) {
    let score = 0;

    // Danger penalty: if any opponent is tenpai, increase danger for certain tiles
    let dangerBonus = 0;
    if (gameState && gameState.tenpai) {
      const discards = gameState.discards || [];
      for (let i = 0; i < 4; i++) {
        if (!gameState.tenpai[i]) continue;
        const oppMelds = (gameState.opponentMelds || gameState.melds || [])[i] || [];
        // Check if tile is in the suit neighborhood of opponent's melds
        oppMelds.forEach(m => {
          if (m.tiles && m.tiles.length > 0) {
            const mSuit = m.tiles[0].suit;
            const mVal = m.tiles[0].value;
            if (tile.suit === mSuit && Math.abs(tile.value - mVal) <= 2) {
              dangerBonus += 2;
            }
          }
        });
        // Honor tiles not seen in discards are slightly dangerous
        if (tile.suit === 'honor') {
          const seenInDiscards = (discards[i] || []).some(t => t.suit === tile.suit && t.value === tile.value);
          if (!seenInDiscards) dangerBonus += 1;
        }
      }
    }

    // Isolated honor tiles are worth less
    if (tile.suit === 'honor') {
      const count = hand.filter(t => t.suit === tile.suit && t.value === tile.value).length;
      return (count >= 2 ? 5 : 1) + dangerBonus;
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
    return score + dangerBonus;
  },

  // Calculate block score for a hand (greedy)
  calcBlockScore(tiles) {
    const playable = tiles.filter(t => !t.isFlower);
    let score = 0;
    const used = new Set();
    const sorted = [...playable].sort((a,b)=>{ const o={man:0,pin:1,sou:2,honor:3}; if(a.suit!==b.suit) return o[a.suit]-o[b.suit]; return a.value-b.value; });

    // Find triplets
    const cnt = {};
    sorted.forEach((t,i)=>{ const k=t.suit+'_'+t.value; cnt[k]=cnt[k]||[]; cnt[k].push(i); });
    for (const k in cnt) {
      if (cnt[k].length >= 3) {
        cnt[k].slice(0,3).forEach(i=>used.add(i));
        score += 3;
      }
    }
    // Find sequences in unused tiles
    const remaining = sorted.filter((_,i)=>!used.has(i));
    for (let i=0; i<remaining.length; i++) {
      if (used.has(i)) continue;
      const t = remaining[i];
      if (t.suit === 'honor') continue;
      const n1 = remaining.findIndex((x,j)=>j>i && !used.has(j) && x.suit===t.suit && x.value===t.value+1);
      if (n1 !== -1) {
        const n2 = remaining.findIndex((x,j)=>j>n1 && !used.has(j) && x.suit===t.suit && x.value===t.value+2);
        if (n2 !== -1) { used.add(i); used.add(n1); used.add(n2); score += 3; continue; }
        // Partial sequence (搭子) +2
        used.add(i); used.add(n1); score += 2; continue;
      }
      const n2skip = remaining.findIndex((x,j)=>j>i && !used.has(j) && x.suit===t.suit && x.value===t.value+2);
      if (n2skip !== -1) { used.add(i); used.add(n2skip); score += 2; continue; }
    }
    // Pairs in leftover
    const leftover = sorted.filter((_,i)=>!used.has(i));
    const pairCnt = {};
    leftover.forEach(t=>{ const k=t.suit+'_'+t.value; pairCnt[k]=(pairCnt[k]||0)+1; });
    for (const k in pairCnt) if (pairCnt[k] >= 2) score += 1;

    return score;
  },

  // Decide whether to Pong/Chi/Kong/Win on a discard
  decideMeld(options, hand, melds, style) {
    if (!options.length) return null;
    // Always win
    const win = options.find(o => o.type === 'win');
    if (win) return win;

    style = style || 'balanced';

    if (style === 'attack') {
      // Aggressive: always meld if possible
      const kong = options.find(o => o.type === 'kong');
      if (kong) return kong;
      const pong = options.find(o => o.type === 'pong');
      if (pong) return pong;
      const chi = options.find(o => o.type === 'chi');
      if (chi) return chi;
      return null;
    }

    if (style === 'defense') {
      // Conservative: only meld when very close to winning
      const blockScore = this.calcBlockScore(hand);
      // Only meld if block score is high (many complete sets)
      const threshold = Math.max(6, (13 - melds.length * 3) * 0.5);
      if (blockScore < threshold) return null;
      const kong = options.find(o => o.type === 'kong');
      if (kong) return kong;
      const pong = options.find(o => o.type === 'pong');
      if (pong) return pong;
      return null;
    }

    // 'balanced' (default): existing logic
    const kong = options.find(o => o.type === 'kong');
    if (kong && Math.random() > 0.3) return kong;
    const pong = options.find(o => o.type === 'pong');
    if (pong && Math.random() > 0.5) return pong;
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
