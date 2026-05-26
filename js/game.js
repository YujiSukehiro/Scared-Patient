class Game {
  constructor() {
    this.lastTouchTime = 0;
    this.initEngine();
    this.reset();
    this.setupInput();
    this.lastTime = performance.now();
    this.animate();
  }

  initEngine() {
    const canvas = document.getElementById('game-canvas');
    let gl = null;
    try {
      gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    } catch(e) {}
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    window.worldGen = new WorldGenerator(scene);
    this.currentLookAt = new THREE.Vector3();

    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.handleContextLost();
    }, false);
  }

  getHighScore() {
    let scores = [];
    try {
      const cached = localStorage.getItem('scared_patient_scores');
      if (cached) {
        scores = JSON.parse(cached);
      }
    } catch (e) {
      scores = [];
    }
    if (!Array.isArray(scores) || scores.length === 0) {
      return 0;
    }
    let max = 0;
    scores.forEach(s => {
      if (s && typeof s.score === 'number') {
        if (s.score > max) {
          max = s.score;
        }
      }
    });
    return max;
  }

  reset() {
    const initialDocDist = Math.min(
      window.config.maxDoctorDistance || 10,
      window.config.initialDoctorDistance || 7
    );

    if (window.gameState) {
      if (window.gameState.player && window.gameState.player.mesh) {
        this.scene.remove(window.gameState.player.mesh);
        if (typeof window.gameState.player.mesh.dispose === 'function') {
          window.gameState.player.mesh.dispose();
        }
      }
      if (window.gameState.doctor && window.gameState.doctor.mesh) {
        this.scene.remove(window.gameState.doctor.mesh);
        if (typeof window.gameState.doctor.mesh.dispose === 'function') {
          window.gameState.doctor.mesh.dispose();
        }
      }
    }

    window.gameState = {
      score: 0,
      distance: 0,
      pillsCollected: 0,
      state: 'START', // 'START', 'RUNNING', 'STUMBLING', 'GAMEOVER'
      lane: 0, // -1, 0, 1
      contextLost: false,
      player: {
        position: new THREE.Vector3(0, 0, 0),
        lastPosition: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(0, 0, -1),
        isJumping: false,
        isSliding: false,
        jumpTimer: 0,
        slideTimer: 0,
        hasTurned: false,
        currentSegmentIndex: 0,
        distanceAlong: 0,
        laneOffset: 0,
        bufferedTurn: null,
        mesh: window.models.createPatient()
      },
      doctor: {
        position: new THREE.Vector3(0, 0, initialDocDist),
        distance: initialDocDist,
        startedStumbleClose: false,
        mesh: window.models.createDoctor()
      },
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer
    };

    window.worldGen.reset();
    
    this.scene.add(window.gameState.player.mesh);
    this.scene.add(window.gameState.doctor.mesh);

    // Initial corridor setup
    for (let i = 0; i < 5; i++) {
      window.worldGen.generateSegment('straight');
    }

    window.gameState.player.position.set(0, 0, 0);
    window.gameState.player.lastPosition.set(0, 0, 0);
    window.gameState.doctor.position.set(0, 0, initialDocDist);
    
    if (window.audioManager) {
      window.audioManager.stopHeartbeat();
    }

    // Update HUD overlay values
    const high = this.getHighScore();
    const hudHigh = document.getElementById('hud-highscore');
    if (hudHigh) hudHigh.textContent = high;
    const hudScore = document.getElementById('hud-score');
    if (hudScore) hudScore.textContent = 0;
    const hudDistance = document.getElementById('hud-distance');
    if (hudDistance) hudDistance.textContent = 0;
    const hudPills = document.getElementById('hud-pills');
    if (hudPills) hudPills.textContent = 0;

    this.updateCamera();
    
    document.getElementById('initials-modal').style.display = 'none';
    document.getElementById('offline-message').style.display = 'none';
    this.isPaused = false;
    this.footstepTimer = 0;
    this.lastTouchTime = 0;
  }

  setupInput() {
    const canvas = document.getElementById('game-canvas');

    window.addEventListener('keydown', (e) => {
      if (this.isPaused) return;
      if (window.gameState.state === 'GAMEOVER') return;

      if (window.gameState.state === 'START') {
        this.startGame();
        return;
      }

      const key = e.key;
      const keyLower = (key || '').toLowerCase();

      if (key === 'ArrowLeft' || keyLower === 'a') {
        if (!this.executeTurn('left')) {
          this.changeLane(-1);
        }
      } else if (key === 'ArrowRight' || keyLower === 'd') {
        if (!this.executeTurn('right')) {
          this.changeLane(1);
        }
      } else if (key === 'ArrowUp' || keyLower === 'w') {
        this.jump();
      } else if (key === 'ArrowDown' || keyLower === 's') {
        this.slide();
      }
    });

    let touchStartX = 0;
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
      if (this.isPaused) return;
      this.lastTouchTime = Date.now();
      if (e.touches && e.touches[0]) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    });

    window.addEventListener('touchend', (e) => {
      if (this.isPaused) return;
      this.lastTouchTime = Date.now();
      if (window.gameState.state === 'GAMEOVER') return;
      if (window.gameState.state === 'START') {
        this.startGame();
        return;
      }

      if (!e.changedTouches || !e.changedTouches[0]) return;
      const diffX = e.changedTouches[0].clientX - touchStartX;
      const diffY = e.changedTouches[0].clientY - touchStartY;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 50) {
          if (!this.executeTurn('right')) {
            this.changeLane(1);
          }
        } else if (diffX < -50) {
          if (!this.executeTurn('left')) {
            this.changeLane(-1);
          }
        }
      } else {
        if (diffY > 50) this.slide();
        else if (diffY < -50) this.jump();
      }
    });

    let mouseStartX = 0;
    let mouseStartY = 0;
    let isMouseDown = false;

    canvas.addEventListener('mousedown', (e) => {
      if (this.isPaused) return;
      if (Date.now() - this.lastTouchTime < 500) return;
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;
      isMouseDown = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (this.isPaused) return;
      if (!isMouseDown) return;
      isMouseDown = false;

      if (Date.now() - this.lastTouchTime < 500) return;

      if (window.gameState.state === 'GAMEOVER') return;
      if (window.gameState.state === 'START') {
        this.startGame();
        return;
      }

      const diffX = e.clientX - mouseStartX;
      const diffY = e.clientY - mouseStartY;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 50) {
          if (!this.executeTurn('right')) {
            this.changeLane(1);
          }
        } else if (diffX < -50) {
          if (!this.executeTurn('left')) {
            this.changeLane(-1);
          }
        }
      } else {
        if (diffY > 50) this.slide();
        else if (diffY < -50) this.jump();
      }
    });

    canvas.addEventListener('click', () => {
      if (window.gameState.state === 'START') {
        this.startGame();
      }
    });

    window.addEventListener('resize', () => {
      this.handleResize();
    });

    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });

    const form = document.getElementById('leaderboard-form');
    const initialsInput = document.getElementById('initials-input');
    const offlineMsg = document.getElementById('offline-message');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      let initials = initialsInput.value || '';
      
      if (!initials.trim()) {
        alert('Initials cannot be empty');
        return;
      }

      if (initials.length > 3) {
        initials = initials.substring(0, 3);
      }
      initials = initials.toUpperCase();

      const scoreData = {
        game: 'Scared Patient',
        initials: initials,
        score: window.gameState.score
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const fetchOptions = {
          method: 'POST',
          signal: controller.signal,
          body: JSON.stringify(scoreData)
        };

        if (isLocalhost) {
          fetchOptions.headers = {
            'Content-Type': 'application/json'
          };
        } else {
          fetchOptions.mode = 'no-cors';
          fetchOptions.headers = {
            'Content-Type': 'text/plain'
          };
        }

        const response = await fetch('https://script.google.com/macros/s/AKfycbxEcmKfj9-Tg5K9QlM1-LXAwycNaplQNBtrELz_qQt5LDkL27BmfntC-RnmNatfJPKs/exec', fetchOptions);

        clearTimeout(timeoutId);

        if (isLocalhost) {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }

          const result = await response.json();
          if (result.status !== 'success') {
            throw new Error('API returned failure status');
          }
        }

        this.saveLocalScore(scoreData);
        document.getElementById('initials-modal').style.display = 'none';
        this.reset();
      } catch (err) {
        clearTimeout(timeoutId);
        offlineMsg.style.display = 'block';
        offlineMsg.textContent = 'Failed to submit high score. Saved offline.';
        this.saveLocalScore(scoreData);
        setTimeout(() => {
          document.getElementById('initials-modal').style.display = 'none';
          this.reset();
        }, 2000);
      }
    });
  }

  saveLocalScore(scoreData) {
    let scores = [];
    try {
      const cached = localStorage.getItem('scared_patient_scores');
      if (cached) {
        scores = JSON.parse(cached);
      }
    } catch (e) {
      scores = [];
    }
    scores.push(scoreData);
    try {
      localStorage.setItem('scared_patient_scores', JSON.stringify(scores));
    } catch (e) {
      console.warn("Failed to save high scores to localStorage (QuotaExceededError/Disabled):", e);
    }
  }

  startGame() {
    if (window.gameState.state !== 'START') {
      return;
    }
    window.gameState.state = 'RUNNING';
    window.audioManager.init();
    window.audioManager.playHeartbeat(80);
    this.lastTime = performance.now();
  }

  changeLane(dir) {
    if (window.gameState.state === 'STUMBLING') {
      return;
    }

    const currentLane = window.gameState.lane;
    let targetLane = currentLane + dir;

    if (targetLane < -1) targetLane = -1;
    if (targetLane > 1) targetLane = 1;

    window.gameState.lane = targetLane;
  }

  jump() {
    const player = window.gameState.player;
    if (player.isJumping) return;

    if (player.isSliding) {
      player.isSliding = false;
      player.slideTimer = 0;
    }

    player.isJumping = true;
    player.jumpTimer = window.config.jumpDuration;
    window.audioManager.playAction('jump');
  }

  slide() {
    const player = window.gameState.player;
    if (player.isSliding) return;

    if (player.isJumping) {
      player.isJumping = false;
      player.jumpTimer = 0;
      player.position.y = 0;
    }

    player.isSliding = true;
    player.slideTimer = window.config.slideDuration;
    window.audioManager.playAction('slide');
  }

  executeTurn(type) {
    const player = window.gameState.player;
    const currentSeg = window.worldGen.segments.find(s => s.globalIndex === player.currentSegmentIndex);
    if (!currentSeg) return false;

    if (currentSeg.type === 'straight') {
      const nextSeg = window.worldGen.segments.find(s => s.globalIndex === player.currentSegmentIndex + 1);
      if (nextSeg && nextSeg.type === type) {
        const distToTurn = currentSeg.length - player.distanceAlong;
        if (distToTurn <= 8.0) {
          player.bufferedTurn = type;
          return true;
        }
      }
    } else if (currentSeg.type === type) {
      if (!player.hasTurned) {
        player.hasTurned = true;
        return true;
      }
    }
    return false;
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  handleVisibilityChange() {
    console.log("handleVisibilityChange called. document.hidden =", document.hidden, "audioManager exists =", !!window.audioManager);
    if (document.hidden) {
      this.isPaused = true;
      if (window.audioManager) {
        window.audioManager.stopHeartbeat();
      }
    } else {
      this.isPaused = false;
      this.lastTime = performance.now();
      if (window.audioManager && window.gameState && (window.gameState.state === 'RUNNING' || window.gameState.state === 'STUMBLING')) {
        const doctor = window.gameState.doctor;
        const maxDocDist = window.config.maxDoctorDistance || 10;
        const proximity = 1 - (doctor.distance / maxDocDist);
        const clampedProximity = Math.max(0, Math.min(1, proximity));
        const bpm = 60 + clampedProximity * 120;
        window.audioManager.playHeartbeat(bpm);
      }
    }
  }

  handleContextLost() {
    console.warn("WebGL context lost!");
    this.isPaused = true;
    if (window.gameState) {
      window.gameState.contextLost = true;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.isPaused) return;

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.inAnimateLoop = true;
    this.update(dt);
    this.inAnimateLoop = false;
  }

  getPathPositionBehindPlayer(distance) {
    const player = window.gameState.player;
    const activeSegments = window.worldGen.segments;
    
    let segIdx = activeSegments.findIndex(seg => seg.globalIndex === player.currentSegmentIndex);
    if (segIdx === -1) return player.position.clone();
    
    let remainingDistance = distance;
    let distAlong = player.distanceAlong;
    
    while (remainingDistance > 0 && segIdx >= 0) {
      const seg = activeSegments[segIdx];
      if (distAlong >= remainingDistance) {
        const coords = window.worldGen.getSegmentRelativeCoords(seg, window.gameState.lane, distAlong - remainingDistance);
        return coords.position;
      } else {
        remainingDistance -= distAlong;
        segIdx--;
        if (segIdx >= 0) {
          distAlong = activeSegments[segIdx].length;
        }
      }
    }
    
    if (activeSegments.length > 0) {
      const firstSeg = activeSegments[0];
      const dir = firstSeg.direction;
      const rightDir = new THREE.Vector3(-dir.z, 0, dir.x);
      const targetOffset = window.gameState.lane * (window.config.laneWidth || 3);
      return firstSeg.startPosition.clone()
        .addScaledVector(dir, -remainingDistance)
        .addScaledVector(rightDir, targetOffset);
    }
    return player.position.clone();
  }

  update(dt) {
    if (dt > 0.1) dt = 0.1;

    // --- SPEED RAMPING (R2) ---
    const baseSpeed = 10;
    const maxSpeed = 22;
    const rampingRate = 0.005;
    const currentDistance = (window.gameState && window.gameState.distance) || 0;
    const rampedPlayerSpeed = Math.min(maxSpeed, baseSpeed + rampingRate * currentDistance);
    const rampedStumbleSpeed = rampedPlayerSpeed * 0.5;
    
    // Scale animation speed to match actual velocity, avoiding foot-sliding
    const animationSpeedFactor = rampedPlayerSpeed / baseSpeed;
    // ---------------------------

    if (window.gameState && window.gameState.player) {
      const player = window.gameState.player;
      if (!player.lastPosition) {
        player.lastPosition = new THREE.Vector3(0, 0, 0);
      }
      if (player.position.distanceTo(player.lastPosition) > 0.01 && window.worldGen) {
        const segment = window.worldGen.getCurrentSegment(player.position);
        if (segment) {
          const relativeCoords = window.worldGen.getRelativeCoords(player.position, segment);
          if (relativeCoords) {
            player.currentSegmentIndex = segment.globalIndex;
            player.distanceAlong = relativeCoords.distAlong;
            player.laneOffset = relativeCoords.laneOffset;
            const calculatedLane = Math.round(player.laneOffset / (window.config ? window.config.laneWidth : 3));
            window.gameState.lane = Math.max(-1, Math.min(1, calculatedLane));
          }
        }
      }
    }

    if (window.gameState.state === 'START' && this.inAnimateLoop) {
      this.updateCamera(dt);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const player = window.gameState.player;
    const doctor = window.gameState.doctor;

    if (window.gameState.state === 'GAMEOVER') {
      if (player && player.mesh && typeof player.mesh.update === 'function') {
        player.mesh.update(dt, player, 'GAMEOVER');
      }
      if (doctor && doctor.mesh && typeof doctor.mesh.update === 'function') {
        doctor.mesh.update(dt, doctor, 'GAMEOVER');
      }
      this.updateCamera(dt);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (window.gameState.state === 'STUMBLING') {
      this.stumbleTimer -= dt * 1000;
      if (this.stumbleTimer <= 0) {
        window.gameState.state = 'RUNNING';
        if (doctor) {
          doctor.startedStumbleClose = false;
        }
      }
    }

    const currentSpeed = (window.gameState.state === 'STUMBLING') 
      ? rampedStumbleSpeed 
      : rampedPlayerSpeed;

    const distanceGain = currentSpeed * dt;
    
    // 1. Move player forward along track
    player.distanceAlong += distanceGain;

    // 2. Smoothly update lateral offset
    const targetOffset = window.gameState.lane * window.config.laneWidth;
    player.laneOffset += (targetOffset - player.laneOffset) * (1 - Math.exp(-15 * dt));

    // 3. Handle segment transitions
    let segment = window.worldGen.segments.find(s => s.globalIndex === player.currentSegmentIndex);
    if (segment && player.distanceAlong >= segment.length) {
      const nextSegment = window.worldGen.segments.find(s => s.globalIndex === player.currentSegmentIndex + 1);
      if (nextSegment) {
        player.currentSegmentIndex = nextSegment.globalIndex;
        player.distanceAlong -= segment.length;
        
        if (nextSegment.type === 'left' || nextSegment.type === 'right') {
          if (player.bufferedTurn === nextSegment.type) {
            player.hasTurned = true; // Smoothly follow the corner curve
            player.bufferedTurn = null;
          } else {
            player.hasTurned = false; // Run straight and hit the wall
          }
        } else {
          player.hasTurned = false;
        }
        segment = nextSegment;
      }
    }

    if (!segment) return;

    // 4. Calculate 3D position & direction
    let coords;
    if (segment.type === 'straight' || player.hasTurned) {
      coords = window.worldGen.getSegmentRelativeCoords(segment, 0, player.distanceAlong);
      const normal = new THREE.Vector3(-coords.direction.z, 0, coords.direction.x).normalize();
      coords.position.addScaledVector(normal, player.laneOffset);
    } else {
      // Run straight into the intersection (previous segment's direction)
      const prevSeg = window.worldGen.segments.find(s => s.globalIndex === segment.globalIndex - 1);
      const runDir = prevSeg ? prevSeg.direction : new THREE.Vector3(0, 0, -1);
      const right = new THREE.Vector3(-runDir.z, 0, runDir.x).normalize();
      coords = {
        position: segment.startPosition.clone()
          .addScaledVector(runDir, player.distanceAlong)
          .addScaledVector(right, player.laneOffset),
        direction: runDir.clone()
      };
      if (player.distanceAlong >= segment.width) {
        this.endGame(false); // Hit front wall
        return;
      }
    }

    player.position.copy(coords.position);
    player.direction.copy(coords.direction);

    // Accumulate total distance
    window.gameState.distance = parseFloat((window.gameState.distance + distanceGain).toFixed(2));
    
    const calculatedScore = Math.floor(window.gameState.distance * 10) + window.gameState.pillsCollected * 100;
    window.gameState.score = Math.min(999999, calculatedScore);

    // Jump simulation
    if (player.isJumping) {
      player.jumpTimer -= dt * 1000;
      const progress = 1 - (player.jumpTimer / window.config.jumpDuration);
      if (progress >= 1) {
        player.isJumping = false;
        player.position.y = 0;
      } else {
        player.position.y = Math.sin(progress * Math.PI) * 2;
      }
    }
    player.mesh.position.copy(player.position);
    player.mesh.position.y = player.position.y;

    // Slide simulation
    if (player.isSliding) {
      player.slideTimer -= dt * 1000;
      if (player.slideTimer <= 0) {
        player.isSliding = false;
      }
      player.mesh.scale.y = 0.5;
    } else {
      player.mesh.scale.y = 1.0;
    }

    if (player.mesh && typeof player.mesh.update === 'function') {
      player.mesh.update(dt * animationSpeedFactor, player, window.gameState.state);
    }

    // Doctor trailing logic
    const doctorChaseSpeed = (window.gameState.state === 'STUMBLING') 
      ? rampedPlayerSpeed * 1.5 
      : rampedPlayerSpeed * 0.95;
    const distanceChange = (doctorChaseSpeed - currentSpeed) * dt;
    let newDistance = parseFloat((doctor.distance - distanceChange).toFixed(2));
    
    const maxDocDist = window.config.maxDoctorDistance || 4.5;
    if (window.gameState.state === 'STUMBLING' && !doctor.startedStumbleClose) {
      newDistance = Math.max(1.5, newDistance);
    }
    doctor.distance = Math.max(0, Math.min(maxDocDist, newDistance));

    const targetDoctorPos = this.getPathPositionBehindPlayer(doctor.distance);
    doctor.position.copy(targetDoctorPos);
    doctor.mesh.position.copy(doctor.position);

    if (doctor.mesh && typeof doctor.mesh.update === 'function') {
      doctor.mesh.update(dt * animationSpeedFactor, doctor, window.gameState.state);
    }

    // Heartbeat audio speed scaling
    const proximity = doctor.distance <= 0.05 ? 1 : 1 - (doctor.distance / maxDocDist);
    const clampedProximity = Math.max(0, Math.min(1, proximity));
    const bpm = 60 + clampedProximity * 120;
    window.audioManager.playHeartbeat(bpm);

    // Footsteps
    this.footstepTimer = (this.footstepTimer || 0) + dt;
    const stepInterval = (window.gameState.state === 'STUMBLING') ? 0.4 : 0.25;
    if (this.footstepTimer >= stepInterval) {
      window.audioManager.playFootstep();
      this.footstepTimer = 0;
    }

    // Segment recycling and replenishment
    if (window.worldGen && window.worldGen.activePills) {
      window.worldGen.activePills.forEach(pill => {
        if (pill.mesh) {
          pill.mesh.rotation.y += 2.5 * dt;
          pill.mesh.position.y = 0.25 + Math.sin(performance.now() * 0.004 + pill.z) * 0.06;
        }
      });
    }

    const recycled = window.worldGen.recycleSegments(player.position.z);
    for (let i = 0; i < recycled; i++) {
      window.worldGen.generateSegment();
    }

    if (doctor.distance <= 0) {
      this.endGame(false);
      return;
    }

    // Check turn boundaries (if player ran past a turn segment without turning)
    if (segment && (segment.type === 'left' || segment.type === 'right')) {
      if (!player.hasTurned && player.distanceAlong >= (segment.width || 10)) {
        this.endGame(false);
        return;
      }
    }

    // Collision detection
    const collision = window.worldGen.checkCollisions({
      position: player.position,
      lane: window.gameState.lane,
      isJumping: player.isJumping,
      isSliding: player.isSliding
    });

    if (collision) {
      if (collision.type === 'pill') {
        window.gameState.pillsCollected++;
        window.audioManager.playCollect();
      } else if (collision.type === 'obstacle') {
        if (window.gameState.state === 'STUMBLING') {
          this.endGame(false);
        } else {
          window.gameState.state = 'STUMBLING';
          this.stumbleTimer = window.config.stumbleDuration;
          if (doctor) {
            doctor.startedStumbleClose = (doctor.distance <= 2.0);
          }
        }
      }
    }

    // Update HUD overlay values
    const hudScore = document.getElementById('hud-score');
    if (hudScore) hudScore.textContent = window.gameState.score;
    const hudDistance = document.getElementById('hud-distance');
    if (hudDistance) hudDistance.textContent = window.gameState.distance;
    const hudPills = document.getElementById('hud-pills');
    if (hudPills) hudPills.textContent = window.gameState.pillsCollected;

    if (window.gameState && window.gameState.player) {
      const player = window.gameState.player;
      if (!player.lastPosition) {
        player.lastPosition = new THREE.Vector3(0, 0, 0);
      }
      player.lastPosition.copy(player.position);
    }

    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  updateCamera(dt) {
    const player = window.gameState.player;
    const playerDir = player.direction || new THREE.Vector3(0, 0, -1);
    const rightDir = new THREE.Vector3(-playerDir.z, 0, playerDir.x);
    
    const segment = window.worldGen.segments.find(s => s.globalIndex === player.currentSegmentIndex);
    let camCenterBase = new THREE.Vector3();
    if (segment) {
      if (segment.type === 'straight' || player.hasTurned) {
        camCenterBase.copy(window.worldGen.getSegmentRelativeCoords(segment, 0, player.distanceAlong).position);
      } else {
        const prevSeg = window.worldGen.segments.find(s => s.globalIndex === segment.globalIndex - 1);
        const runDir = prevSeg ? prevSeg.direction : new THREE.Vector3(0, 0, -1);
        camCenterBase.copy(segment.startPosition).addScaledVector(runDir, player.distanceAlong);
      }
      camCenterBase.y = player.position.y;
    } else {
      camCenterBase.copy(player.position);
    }
    
    const targetCamPos = new THREE.Vector3()
      .copy(camCenterBase)
      .addScaledVector(playerDir, -5)
      .addScaledVector(new THREE.Vector3(0, 1, 0), 3);
    
    const targetLookAt = new THREE.Vector3()
      .copy(camCenterBase)
      .addScaledVector(playerDir, 5)
      .addScaledVector(new THREE.Vector3(0, 1, 0), 1);
    
    if (dt === undefined) {
      this.camera.position.copy(targetCamPos);
      this.currentLookAt.copy(targetLookAt);
      this.camera.lookAt(this.currentLookAt);
    } else {
      const lerpFactor = 1 - Math.exp(-10 * dt);
      this.camera.position.lerp(targetCamPos, lerpFactor);
      this.currentLookAt.lerp(targetLookAt, lerpFactor);
      this.camera.lookAt(this.currentLookAt);
    }
  }

  endGame(isWin) {
    window.gameState.state = 'GAMEOVER';
    window.audioManager.stopHeartbeat();
    window.audioManager.playGameOver();

    const modal = document.getElementById('initials-modal');
    modal.style.display = 'block';
    document.getElementById('final-score').textContent = window.gameState.score;
  }
}

window.endGame = function(isWin) {
  if (window.gameInstance) {
    window.gameInstance.endGame(isWin);
  } else {
    window.gameState.state = 'GAMEOVER';
  }
};

window.addEventListener('load', () => {
  window.gameInstance = new Game();
});
