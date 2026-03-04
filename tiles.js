// ===== TILE ENGINE v2 =====
const TILE_NAMES = {
  man:   ['一萬','二萬','三萬','四萬','五萬','六萬','七萬','八萬','九萬'],
  pin:   ['一筒','二筒','三筒','四筒','五筒','六筒','七筒','八筒','九筒'],
  sou:   ['一索','二索','三索','四索','五索','六索','七索','八索','九索'],
  honor: ['東','南','西','北','中','白','發'],
  flower:['梅','蘭','菊','竹','春','夏','秋','冬']
};

function createFullDeck() {
  const tiles = []; let id = 0;
  ['man','pin','sou'].forEach(suit => {
    for (let v=1;v<=9;v++) for (let c=0;c<4;c++)
      tiles.push({suit,value:v,id:id++,name:TILE_NAMES[suit][v-1]});
  });
  for (let v=0;v<7;v++) for (let c=0;c<4;c++)
    tiles.push({suit:'honor',value:v,id:id++,name:TILE_NAMES.honor[v]});
  for (let v=0;v<8;v++)
    tiles.push({suit:'flower',value:v,id:id++,name:TILE_NAMES.flower[v],isFlower:true});
  return tiles;
}

function shuffle(arr) {
  const a=[...arr];
  for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

function sortTiles(tiles) {
  return [...tiles].sort((a,b)=>{
    const o={man:0,pin:1,sou:2,honor:3,flower:4};
    if(a.suit!==b.suit) return o[a.suit]-o[b.suit];
    return a.value-b.value;
  });
}

function isSevenPairs(tiles) {
  if(tiles.length!==14) return false;
  const s=sortTiles(tiles);
  for(let i=0;i<14;i+=2)
    if(!s[i+1]||s[i].suit!==s[i+1].suit||s[i].value!==s[i+1].value) return false;
  return true;
}

function canFormAllMelds(tiles) {
  if(tiles.length===0) return true;
  if(tiles.length%3!==0) return false;
  const t=sortTiles(tiles);
  const first=t[0];
  // triplet
  const tri=[];
  for(let i=0;i<t.length&&tri.length<3;i++)
    if(t[i].suit===first.suit&&t[i].value===first.value) tri.push(i);
  if(tri.length===3&&canFormAllMelds(t.filter((_,i)=>!tri.includes(i)))) return true;
  // sequence
  if(first.suit!=='honor'&&first.suit!=='flower'){
    const si=[0];
    for(let v=first.value+1;v<=first.value+2;v++){
      const idx=t.findIndex((ti,i)=>!si.includes(i)&&ti.suit===first.suit&&ti.value===v);
      if(idx===-1) break; si.push(idx);
    }
    if(si.length===3&&canFormAllMelds(t.filter((_,i)=>!si.includes(i)))) return true;
  }
  return false;
}

function analyzeHand(hand, drawnTile=null) {
  const tiles = drawnTile ? [...hand,drawnTile] : [...hand];
  const playing = tiles.filter(t=>!t.isFlower);
  if(playing.length%3!==2) return {win:false};
  if(isSevenPairs(playing)) return {win:true,type:'七對'};
  if(playing.every(t=>t.suit==='honor')) return {win:true,type:'字一色'};
  const sorted=sortTiles(playing);
  for(let i=0;i<sorted.length-1;i++){
    if(sorted[i].suit===sorted[i+1].suit&&sorted[i].value===sorted[i+1].value){
      const rest=sorted.filter((_,idx)=>idx!==i&&idx!==i+1);
      if(canFormAllMelds(rest)) return {win:true,type:'一般胡'};
    }
  }
  return {win:false};
}

// Find all tiles that would complete the hand (tenpai)
function findTenpaiTiles(hand) {
  const suits = ['man','pin','sou'];
  const waiting = [];
  // Try every possible tile
  for (const suit of suits) {
    for (let v=1;v<=9;v++) {
      const testTile = {suit,value:v,id:99999,name:'test'};
      if (analyzeHand(hand, testTile).win) {
        waiting.push({suit,value:v,name:TILE_NAMES[suit][v-1]});
      }
    }
  }
  for (let v=0;v<7;v++) {
    const testTile = {suit:'honor',value:v,id:99999,name:TILE_NAMES.honor[v]};
    if (analyzeHand(hand, testTile).win) {
      waiting.push({suit:'honor',value:v,name:TILE_NAMES.honor[v]});
    }
  }
  return waiting;
}

// Count how many of a specific tile remain (in deck+unplayed)
function countTileInPiles(tile, discards) {
  let used = 0;
  discards.forEach(pile => {
    pile.forEach(t => { if(t.suit===tile.suit&&t.value===tile.value) used++; });
  });
  return 4 - used; // approximate (can't see other hands)
}

function checkMeldOptions(hand, discardedTile, currentPlayer, discardPlayer) {
  const options = [];
  const matching = hand.filter(t=>t.suit===discardedTile.suit&&t.value===discardedTile.value);
  if(matching.length>=2) options.push({type:'pong',label:'碰',tiles:[matching[0],matching[1]]});
  if(matching.length>=3) options.push({type:'kong',label:'槓',tiles:[matching[0],matching[1],matching[2]]});
  const isLeft=(discardPlayer+1)%4===currentPlayer;
  if(isLeft&&discardedTile.suit!=='honor'&&discardedTile.suit!=='flower'){
    const v=discardedTile.value,s=discardedTile.suit;
    const tried=new Set();
    [[v-2,v-1],[v-1,v+1],[v+1,v+2]].forEach(([a,b])=>{
      if(a<1||b>9||a===b) return;
      const key=`${Math.min(a,b)}-${Math.max(a,b)}`;
      if(tried.has(key)) return; tried.add(key);
      const tA=hand.find(t=>t.suit===s&&t.value===a);
      const tB=hand.find(t=>t.suit===s&&t.value===b&&(!tA||t.id!==tA.id));
      if(tA&&tB) options.push({type:'chi',label:'吃',tiles:[tA,tB]});
    });
  }
  const winCheck=analyzeHand(hand.filter(t=>!t.isFlower),discardedTile);
  if(winCheck.win) options.push({type:'win',label:'胡！',tiles:[]});
  return options;
}

window.MahjongEngine = {
  createFullDeck,shuffle,sortTiles,analyzeHand,findTenpaiTiles,
  checkMeldOptions,isSevenPairs,canFormAllMelds,countTileInPiles,TILE_NAMES
};
