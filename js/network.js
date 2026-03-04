// ===== P2P NETWORK LAYER (PeerJS) =====
window.MahjongNetwork = {
  peer: null,
  connections: [],
  roomId: null,
  isHost: false,
  playerId: null,
  playerName: null,
  onMessage: null,
  onPlayerJoin: null,
  onPlayerLeave: null,
  onReady: null,

  init(playerName) {
    this.playerName = playerName;
    this.playerId = 'mj_' + Math.random().toString(36).substr(2, 9);
    return new Promise((resolve, reject) => {
      this.peer = new Peer(this.playerId, {
        host: 'peerjs.92k.de', port: 443, secure: true,
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
      });
      this.peer.on('open', id => { resolve(id); });
      this.peer.on('error', err => {
        // Fallback to default PeerJS server
        console.log('Trying default PeerJS server...');
        this.peer = new Peer(this.playerId);
        this.peer.on('open', id => resolve(id));
        this.peer.on('error', err2 => reject(err2));
        this.peer.on('connection', conn => this._handleIncoming(conn));
      });
      this.peer.on('connection', conn => this._handleIncoming(conn));
    });
  },

  createRoom() {
    this.isHost = true;
    this.roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    return this.roomId;
  },

  joinRoom(roomId, hostId) {
    this.roomId = roomId;
    this.isHost = false;
    return new Promise((resolve, reject) => {
      const conn = this.peer.connect(hostId, { reliable: true, metadata: { name: this.playerName, roomId } });
      conn.on('open', () => {
        this._setupConnection(conn);
        resolve(conn);
      });
      conn.on('error', reject);
    });
  },

  _handleIncoming(conn) {
    conn.on('open', () => {
      this._setupConnection(conn);
      if (this.onPlayerJoin) this.onPlayerJoin(conn.peer, conn.metadata?.name || 'Player');
    });
  },

  _setupConnection(conn) {
    this.connections.push(conn);
    conn.on('data', data => {
      if (this.onMessage) this.onMessage(conn.peer, data);
    });
    conn.on('close', () => {
      this.connections = this.connections.filter(c => c !== conn);
      if (this.onPlayerLeave) this.onPlayerLeave(conn.peer);
    });
  },

  broadcast(data) {
    this.connections.forEach(conn => {
      if (conn.open) conn.send(data);
    });
  },

  sendTo(peerId, data) {
    const conn = this.connections.find(c => c.peer === peerId);
    if (conn && conn.open) conn.send(data);
  },

  disconnect() {
    this.connections.forEach(c => c.close());
    if (this.peer) this.peer.destroy();
  }
};
