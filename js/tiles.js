// ===== TILE ENGINE - Taiwan Mahjong =====
const TILE_NAMES = {
  man: ['一萬','二萬','三萬','四萬','五萬','六萬','七萬','八萬','九萬'],
  pin: ['一筒','二筒','三筒','四筒','五筒','六筒','七筒','八筒','九筒'],
  sou: ['一索','二索','三索','四索','五索','六索','七索','八索','九索'],
  honor: ['東','南','西','北','中','白','發'],
  flower: ['梅','蘭','菊','竹','春','夏','秋','冬']
};

function createFullDeck() {
  const tiles = [];
  let id = 0;
  ['man','pin','sou'].forEach(suit => {
    for (let v = 1; v <= 9; v++)
      for (let c = 0; c < 4; c++)
        tiles.push({ suit, value: v, id: id++, name: TILE_NAMES[suit][v-1] });
  });
  for (let v = 0; v < 7; v++)
    for (let c = 0; c < 4; c++)
      tiles.push({ suit: 'honor', value: v, id: id++, name: TILE_NAMES.honor[v] });
  for (let v = 0; v < 8; v++)
    tiles.push({ suit: 'flower', value: v, id: id++, name: TILE_NAMES.flower[v], isFlower: true });
  return tiles;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sortTiles(tiles) {
  return [...tiles].sort((a, b) => {
    const o = { man:0, pin:1, sou:2, honor:3, flower:4 };
    if (a.suit !== b.suit) return o[a.suit] - o[b.suit];
    return a.value - b.value;
  });
}

function isSevenPairs(tiles) {
  if (tiles.length !== 14) return false;
  const s = sortTiles(tiles);
  for (let i = 0; i < 14; i += 2) {
    if (!s[i+1] || s[i].suit !== s[i+1].suit || s[i].value !== s[i+1].value) return false;
  }
  return true;
}

function canFormAllMelds(tiles) {
  if (tiles.length === 0) return true;
  if (tiles.length % 3 !== 0) return false;
  const t = sortTiles(tiles);
  const first = t[0];
  // Try triplet
  const tripIdx = [];
  for (let i = 0; i < t.length && tripIdx.length < 3; i++)
    if (t[i].suit === first.suit && t[i].value === first.value) tripIdx.push(i);
  if (tripIdx.length === 3 && canFormAllMelds(t.filter((_,i) => !tripIdx.includes(i)))) return true;
  // Try sequence
  if (first.suit !== 'honor' && first.suit !== 'flower') {
    const seqIdx = [0];
    for (let v = first.value+1; v <= first.value+2; v++) {
      const idx = t.findIndex((ti,i) => !seqIdx.includes(i) && ti.suit === first.suit && ti.value === v);
      if (idx === -1) break;
      seqIdx.push(idx);
    }
    if (seqIdx.length === 3 && canFormAllMelds(t.filter((_,i) => !seqIdx.includes(i)))) return true;
  }
  return false;
}

function analyzeHand(hand, drawnTile = null) {
  const tiles = drawnTile ? [...hand, drawnTile] : [...hand];
  if ((tiles.length) % 3 !== 2) return { win: false };
  const sorted = sortTiles(tiles.filter(t => !t.isFlower));
  if (isSevenPairs(sorted)) return { win: true, type: '七對' };
  if (sorted.every(t => t.suit === 'honor')) return { win: true, type: '字一色' };
  // Try each pair
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].suit === sorted[i+1].suit && sorted[i].value === sorted[i+1].value) {
      const rest = sorted.filter((_,idx) => idx !== i && idx !== i+1);
      if (canFormAllMelds(rest)) return { win: true, type: '一般胡' };
    }
  }
  return { win: false };
}

function checkMeldOptions(hand, discardedTile, currentPlayer, discardPlayer) {
  const options = [];
  const matching = hand.filter(t => t.suit === discardedTile.suit && t.value === discardedTile.value);
  if (matching.length >= 2) options.push({ type: 'pong', label: '碰', tiles: [matching[0], matching[1]] });
  if (matching.length >= 3) options.push({ type: 'kong', label: '槓', tiles: [matching[0], matching[1], matching[2]] });
  const isLeft = (discardPlayer + 1) % 4 === currentPlayer;
  if (isLeft && discardedTile.suit !== 'honor' && discardedTile.suit !== 'flower') {
    const v = discardedTile.value, s = discardedTile.suit;
    [[v-2,v-1],[v-1,v+1],[v+1,v+2]].forEach(([a,b]) => {
      if (a < 1 || b > 9 || a === b) return;
      const tA = hand.find(t => t.suit === s && t.value === a);
      const tB = hand.find(t => t.suit === s && t.value === b);
      if (tA && tB) options.push({ type: 'chi', label: '吃', tiles: [tA, tB] });
    });
  }
  const winCheck = analyzeHand(hand.filter(t => !t.meld), discardedTile);
  if (winCheck.win) options.push({ type: 'win', label: '胡！', tiles: [] });
  return options;
}

window.MahjongEngine = { createFullDeck, shuffle, sortTiles, analyzeHand, checkMeldOptions, isSevenPairs, TILE_NAMES };
