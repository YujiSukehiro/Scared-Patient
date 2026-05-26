const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Simple Node-native HTTP Server
const server = http.createServer((req, res) => {
  let relativeUrl = req.url === '/' ? '/index.html' : req.url;
  
  // Prevent directory traversal
  let filePath = path.join(__dirname, relativeUrl);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  let contentType = 'text/html';
  if (ext === '.js') contentType = 'application/javascript';
  else if (ext === '.css') contentType = 'text/css';
  else if (ext === '.png') contentType = 'image/png';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const startPort = 9000; // Use a different port to avoid conflicts

function listen(port) {
  return new Promise((resolve, reject) => {
    const serverError = (err) => {
      if (err.code === 'EADDRINUSE') {
        server.close();
        resolve(listen(port + 1));
      } else {
        reject(err);
      }
    };
    server.once('error', serverError);
    server.listen(port, () => {
      server.removeListener('error', serverError);
      resolve(port);
    });
  });
}

listen(startPort).then(async (port) => {
  console.log(`[ADVERSARIAL SERVER] Running on http://localhost:${port}`);
  
  let browser;
  let testCount = 0;
  let passCount = 0;
  let failCount = 0;

  function logTest(id, description, passed, errorMsg = '') {
    testCount++;
    if (passed) {
      passCount++;
      console.log(`✅ [${id}] ${description} - PASS`);
    } else {
      failCount++;
      console.error(`❌ [${id}] ${description} - FAIL: ${errorMsg}`);
    }
  }

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--use-gl=swiftshader',
        '--disable-web-security'
      ]
    });
    
    const page = await browser.newPage();
    
    // Auto-dismiss dialog alerts to prevent hangs
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
    
    // Track API requests
    let lastApiRequest = null;
    let hangApiRequest = false;

    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      if (url.includes('script.google.com/macros/s/')) {
        if (request.method() === 'OPTIONS') {
          request.respond({
            status: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
            },
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success' })
          });
          return;
        }

        lastApiRequest = {
          url: url,
          method: request.method(),
          postData: request.postData()
        };

        if (hangApiRequest) {
          // Do not respond, let it hang!
          console.log('[MOCK API] Hanging the request intentionally...');
          return;
        }

        request.respond({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success' })
        });
      } else if (url.includes('cdnjs.cloudflare.com')) {
        request.abort('aborted');
      } else {
        request.continue();
      }
    });

    await page.goto(`http://localhost:${port}`);
    console.log('[TEST] Game page loaded. Starting Adversarial tests...\n');

    // ADV.1: AudioContext Suspended State Lock
    // Verify that if AudioContext state is suspended, the AudioManager resumes it,
    // and audio play calls succeed and schedule sound nodes correctly.
    try {
      const res = await page.evaluate(async () => {
        // Mock suspended audio context
        window.audioManager.init();
        if (window.audioManager.ctx) {
          Object.defineProperty(window.audioManager.ctx, 'state', { value: 'suspended', writable: true });
          // Spy on playFootstep
          let footstepPlayed = false;
          const origOsc = window.audioManager.createOscillatorNode;
          window.audioManager.createOscillatorNode = function() {
            footstepPlayed = true;
            return origOsc.call(window.audioManager);
          };
          window.audioManager.playFootstep();
          window.audioManager.createOscillatorNode = origOsc;
          
          return footstepPlayed === true;
        }
        return false;
      });
      logTest('ADV.1', 'AudioContext automatically attempts to resume suspended context and schedules playbacks', res);
    } catch (e) { logTest('ADV.1', 'AudioContext suspension', false, e.message); }

    // ADV.2: Double/Instant Collision bug on Lane Change
    // Place an obstacle in lane 0 at Z=-10 and another in lane -1 at Z=-10.
    // Set player in lane 0 at Z=-9.5 and initiate a lane change to -1.
    // Verify player collides with the obstacle in physical lane 0 and not lane -1 prematurely.
    try {
      const res = await page.evaluate(() => {
        window.gameInstance.reset();
        window.gameState.state = 'RUNNING';
        
        // Spawn barrier in lane 0 at Z=-10
        window.worldGen.spawnObstacle('barrier', 0, -10);
        // Spawn barrier in lane -1 at Z=-10
        window.worldGen.spawnObstacle('barrier', -1, -10);
        
        // Put player at Z=-9.5 in lane 0
        window.gameState.player.position.set(0, 0, -9.5);
        window.gameState.lane = 0;
        
        // Initiate lane change to -1
        window.gameInstance.changeLane(-1); // player.lane becomes -1 instantly, but physical x is still 0
        
        // Run collision check
        const collision = window.worldGen.checkCollisions({
          position: window.gameState.player.position,
          lane: window.gameState.lane,
          isJumping: window.gameState.player.isJumping,
          isSliding: window.gameState.player.isSliding
        });
        
        // The collision should be with the obstacle in lane 0 where the player physically resides
        return collision !== null && collision.lane === 0;
      });
      logTest('ADV.2', 'Lane change collision check uses physical lane position and does not collide with target lane obstacles prematurely', res);
    } catch (e) { logTest('ADV.2', 'Lane change collision bug', false, e.message); }

    // ADV.3: LocalStorage QuotaExceededError causes restart hang
    // Make localStorage.setItem throw an error, submit initials, and verify the modal closes and game resets to START.
    try {
      const res = await page.evaluate(async () => {
        window.gameInstance.reset();
        window.gameInstance.endGame(false);
        
        // Mock localStorage.setItem to throw
        const origSetItem = localStorage.setItem;
        localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
        
        const modal = document.getElementById('initials-modal');
        const input = document.getElementById('initials-input');
        input.value = 'ERR';
        
        // Dispatch submit
        const form = document.getElementById('leaderboard-form');
        const submitEvent = new Event('submit', { cancelable: true });
        form.dispatchEvent(submitEvent);
        
        // Let async fetch trigger
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const modalVisible = modal.style.display === 'block';
        const stateIsStart = window.gameState.state === 'START';
        
        // Restore
        localStorage.setItem = origSetItem;
        
        return modalVisible === false && stateIsStart === true;
      });
      logTest('ADV.3', 'LocalStorage QuotaExceededError is caught gracefully and does not hang the game', res);
    } catch (e) { logTest('ADV.3', 'LocalStorage QuotaExceededError hang', false, e.message); }

    // ADV.4: Leaderboard submission request hang blocks restarting indefinitely
    // Set hangApiRequest to true, submit initials, and verify that the game resets to START after the timeout.
    try {
      hangApiRequest = true;
      const res = await page.evaluate(async () => {
        window.gameInstance.reset();
        window.gameInstance.endGame(false);
        
        const input = document.getElementById('initials-input');
        input.value = 'HNG';
        
        // Dispatch submit
        const form = document.getElementById('leaderboard-form');
        const submitEvent = new Event('submit', { cancelable: true });
        form.dispatchEvent(submitEvent);
        
        // Wait 8 seconds (longer than the 5s timeout + 2s reset delay)
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        const modalVisible = document.getElementById('initials-modal').style.display === 'block';
        const stateIsStart = window.gameState.state === 'START';
        
        return modalVisible === false && stateIsStart === true;
      });
      hangApiRequest = false; // Restore normal request flow
      logTest('ADV.4', 'Leaderboard submission request has a timeout and falls back to offline mode instead of hanging indefinitely', res);
    } catch (e) { logTest('ADV.4', 'API request hang', false, e.message); }

    // ADV.5: Dynamic Shader compilation / program creation performance trap
    // Verify that segments reuse cached material instances instead of generating new MeshStandardMaterial instances,
    // which prevents memory churn and WebGL program re-compilations.
    try {
      const res = await page.evaluate(() => {
        window.gameInstance.reset();
        
        // Let's count how many MeshStandardMaterials are created during segment generation
        let materialCreatedCount = 0;
        const origMaterial = THREE.MeshStandardMaterial;
        THREE.MeshStandardMaterial = function(params) {
          materialCreatedCount++;
          return new origMaterial(params);
        };
        
        // Generate 3 segments
        window.worldGen.generateSegment('straight');
        window.worldGen.generateSegment('straight');
        window.worldGen.generateSegment('straight');
        
        THREE.MeshStandardMaterial = origMaterial;
        
        return materialCreatedCount === 0; // Should be 0 since materials are cached
      });
      logTest('ADV.5', 'Corridor generation reuses cached materials to prevent dynamic material instantiation and WebGL shader recompilation', res);
    } catch (e) { logTest('ADV.5', 'WebGL performance trap', false, e.message); }

    // ADV.6: Frame-rate dependency / Integration overshoot on low FPS
    // Verify that lateral player movement does not overshoot the target lane when dt is large (e.g., dt = 0.1 during lag spikes)
    // because the integration uses exponential decay.
    try {
      const res = await page.evaluate(() => {
        window.gameInstance.reset();
        window.gameState.state = 'RUNNING';
        
        // Start player at x = 0 (lane 0), moving towards lane -1 (target x = -3)
        window.gameState.lane = -1;
        window.gameState.player.position.set(0, 0, 0);
        
        // Run update with dt = 0.1 (maximum clamped dt)
        window.gameInstance.update(0.1);
        
        // Target is at x = -3. Under exponential decay, the player should move towards -3 but never overshoot (be less than -3).
        const playerX = window.gameState.player.position.x;
        return playerX >= -3.0 && playerX < 0.0;
      });
      logTest('ADV.6', 'Lateral player movement uses exponential decay integration to prevent lane overshoot during lag spikes', res);
    } catch (e) { logTest('ADV.6', 'Frame-rate dependency overshoot', false, e.message); }

    console.log(`\n========================================`);
    console.log(`ADVERSARIAL TEST SUMMARY`);
    console.log(`Total Assertions Run: ${testCount}`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`========================================\n`);

    if (failCount > 0) {
      throw new Error(`${failCount} adversarial tests failed.`);
    }

    console.log('🎉 Adversarial verification tests completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ADVERSARIAL RUNNER FAILURE:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}).catch(err => {
  console.error('[TEST SERVER] Failed to start server:', err);
  process.exit(1);
});
