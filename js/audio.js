class AudioManager {
  constructor() {
    this.ctx = null;
    this.heartbeatInterval = false;
    this.heartbeatRate = 60; // BPM
    this.muted = false;
    this.lastScheduledRate = null;
    this.secondThudTimeout = null;
    this.heartbeatTimeout = null;
    this.gameOverTimeouts = [];
    this.activeOscillators = [];
  }

  createOscillatorNode(gain) {
    this.init();
    if (!this.ctx) return null;
    const osc = this.ctx.createOscillator();
    this.activeOscillators.push(osc);
    osc.onended = () => {
      this.activeOscillators = this.activeOscillators.filter(item => item !== osc);
      if (gain) {
        try {
          gain.disconnect();
        } catch (e) {
          // Ignore
        }
      }
    };
    return osc;
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => {
        // ignore autoplay/permission restriction errors
      });
    }
  }

  clearGameOverTimeouts() {
    if (this.gameOverTimeouts && this.gameOverTimeouts.length > 0) {
      this.gameOverTimeouts.forEach(tid => clearTimeout(tid));
      this.gameOverTimeouts = [];
    }
  }

  playFootstep() {
    this.init();
    if (!this.ctx || this.muted) return;

    const gain = this.ctx.createGain();
    const osc = this.createOscillatorNode(gain);
    if (!osc) {
      gain.disconnect();
      return;
    }
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playHeartbeat(rate) {
    this.init();
    this.clearGameOverTimeouts();
    const clamped = Math.max(60, Math.min(180, rate));
    const roundedRate = Math.round(clamped);

    this.heartbeatRate = roundedRate;

    if (this.heartbeatInterval) {
      return;
    }

    this.heartbeatInterval = true;
    this.scheduleNextBeat();
  }

  scheduleNextBeat() {
    if (!this.heartbeatInterval) return;

    if (this.ctx && !this.muted) {
      this._playThud(100, 0.08);
      this.secondThudTimeout = setTimeout(() => {
        if (!this.heartbeatInterval) return;
        this._playThud(90, 0.08);
        this.secondThudTimeout = null;
      }, 150);
    }

    const intervalMs = (60 / this.heartbeatRate) * 1000;
    this.heartbeatTimeout = setTimeout(() => {
      this.scheduleNextBeat();
    }, intervalMs);
  }

  _playThud(freq, duration) {
    this.init();
    if (!this.ctx || this.muted) return;
    const gain = this.ctx.createGain();
    const osc = this.createOscillatorNode(gain);
    if (!osc) {
      gain.disconnect();
      return;
    }
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playCollect() {
    this.init();
    if (!this.ctx || this.muted) return;

    const gain = this.ctx.createGain();
    const osc = this.createOscillatorNode(gain);
    if (!osc) {
      gain.disconnect();
      return;
    }
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playAction(action) {
    this.init();
    if (!this.ctx || this.muted) return;

    const gain = this.ctx.createGain();
    const osc = this.createOscillatorNode(gain);
    if (!osc) {
      gain.disconnect();
      return;
    }
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (action === 'jump') {
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    } else if (action === 'slide') {
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    }

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playGameOver() {
    this.init();
    this.stopHeartbeat();
    this.clearGameOverTimeouts();
    if (!this.ctx || this.muted) return;

    const playTone = (freq, delay, dur) => {
      const tid = setTimeout(() => {
        this.init();
        if (!this.ctx) return;
        const gain = this.ctx.createGain();
        const osc = this.createOscillatorNode(gain);
        if (!osc) {
          gain.disconnect();
          return;
        }
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
        this.gameOverTimeouts = this.gameOverTimeouts.filter(t => t !== tid);
      }, delay);
      this.gameOverTimeouts.push(tid);
    };

    playTone(300, 0, 0.3);
    playTone(240, 300, 0.3);
    playTone(180, 600, 0.6);
  }

  stopHeartbeat() {
    this.heartbeatInterval = false;
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
    if (this.secondThudTimeout) {
      clearTimeout(this.secondThudTimeout);
      this.secondThudTimeout = null;
    }
    this.clearGameOverTimeouts();
    if (this.activeOscillators) {
      this.activeOscillators.forEach(osc => {
        try {
          osc.stop();
        } catch (e) {
          // Might not have started or already stopped
        }
        try {
          osc.disconnect();
        } catch (e) {
          // Ignore
        }
      });
      this.activeOscillators = [];
    }
  }
}

window.audioManager = new AudioManager();
