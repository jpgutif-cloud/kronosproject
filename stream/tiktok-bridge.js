/* tiktok-bridge.js — TikTok Live WebSocket bridge (stub) */

class TikTokBridge {
  constructor() {
    this._chatCallbacks = [];
    this._giftCallbacks = [];
    this._connected = false;
  }

  connect(roomId) {
    console.log(`[TikTok] Stub: would connect to room ${roomId}`);
    // TODO: connect to wss://webcast.tiktok.com/webcast/im/fetch/
    // Requires server-side proxy to handle auth + protobuf decoding
  }

  onChat(callback) { this._chatCallbacks.push(callback); }
  onGift(callback) { this._giftCallbacks.push(callback); }

  _emitChat(username, message) {
    this._chatCallbacks.forEach(cb => cb(username, message));
  }

  _emitGift(username, giftName, valueUsd) {
    this._giftCallbacks.forEach(cb => cb(username, giftName, valueUsd));
    const state = window.KRONOS_STATE;
    if (state) {
      state.revenue += valueUsd;
      if (window.updateHUD) window.updateHUD();
    }
    if (window.showToast) {
      window.showToast(`🎁 @${username} mandó un ${giftName} (+$${valueUsd.toFixed(2)} al fondo)`, '#EF9F27');
    }
    if (window.officeScene) window.officeScene.triggerArloTalk('¡Gracias por el regalo! 🎉 Cada centavo cuenta.');
  }
}

window.tiktokBridge = new TikTokBridge();

// Wire TikTok chat into ARLO chat
window.tiktokBridge.onChat((username, message) => {
  if (window.sendToArlo) window.sendToArlo(message, username);
});
