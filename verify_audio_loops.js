const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Simple Node-native HTTP Server
const server = http.createServer((req, res) => {
  let relativeUrl = req.url === '/' ? '/index.html' : req.url;
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

const port = 8089;

server.listen(port, async () => {
  console.log(`[AUDIO TEST SERVER] Running on http://localhost:${port}`);
  
  let browser;
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

    // Track logs
    let thudsCount = 0;
    let thuds = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.startsWith('AUDIO_THUD:')) {
        thudsCount++;
        thuds.push(text);
        console.log('  -> ' + text);
      } else {
        console.log('PAGE LOG:', text);
      }
    });
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

    // Abort CDN requests to use the local WebGL mock
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      if (url.includes('cdnjs.cloudflare.com')) {
        request.abort('aborted');
      } else {
        request.continue();
      }
    });

    await page.goto(`http://localhost:${port}`);
    
    // Instrument Audio Manager in the page to track thuds and bypass muted or state check
    await page.evaluate(() => {
      // Override _playThud to log to console
      const originalPlayThud = window.audioManager._playThud;
      window.audioManager._playThud = function(freq, duration) {
        console.log(`AUDIO_THUD: freq=${freq}, duration=${duration}, time=${performance.now().toFixed(1)}`);
        return originalPlayThud.call(this, freq, duration);
      };
      
      // Force audio context and override muted to ensure audio logic runs in headless Chromium
      window.audioManager.muted = false;
      window.audioManager.ctx = {
        state: 'running',
        currentTime: 0,
        createOscillator() {
          return {
            connect() {},
            frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
            start() {},
            stop() {}
          };
        },
        createGain() {
          return {
            connect() {},
            gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }
          };
        },
        destination: {}
      };
    });

    console.log('\n--- SCENARIO 1: Stable Running Heartbeat ---');
    // Start game
    await page.evaluate(() => {
      window.gameInstance.reset();
      window.gameInstance.startGame();
    });
    
    // Let the game run for 1.2 seconds under normal condition (constant doctor distance = 10, BPM = 80)
    // At BPM = 80, intervalMs = 60/80 * 1000 = 750ms.
    // In 1200ms, we expect 1 heartbeat cycle (first thud, and second thud 150ms later).
    await new Promise(resolve => setTimeout(resolve, 1200));
    console.log(`Total thuds played in 1.2s stable run: ${thudsCount}`);
    const stableThudsCount = thudsCount;

    console.log('\n--- SCENARIO 2: Active Stumble (Doctor catching up rapidly) ---');
    thudsCount = 0;
    thuds = [];
    
    // We will simulate 60 frames (1 second total, 16.67ms per frame) of stumbling.
    // This will cause the doctor to catch up rapidly from distance 10 to distance 0.
    // BPM will increase from 100 to 180.
    await page.evaluate(() => {
      window.config.maxDoctorDistance = 100;
      window.gameState.doctor.distance = 100;
    });

    for (let frame = 0; frame < 60; frame++) {
      await page.evaluate((dt) => {
        // Force the game state to stumbling and decrement stumble timer
        window.gameState.state = 'STUMBLING';
        window.gameInstance.stumbleTimer = 1000;
        // Call the update method manually with small time step to simulate frame updates
        window.gameInstance.update(dt);
      }, 0.0167);
      // Wait a tiny bit to let setTimeout intervals fire if any are scheduled
      await new Promise(resolve => setTimeout(resolve, 16.67));
    }

    await page.evaluate(() => {
      window.config.maxDoctorDistance = 4.5;
    });
    
    console.log(`Total thuds played in 1s active stumble/catch-up: ${thudsCount}`);
    const stumbleThudsCount = thudsCount;

    console.log('\n--- SCENARIO 3: Game Over and Outstanding Thud Check ---');
    thudsCount = 0;
    thuds = [];
    
    // Trigger Game Over
    await page.evaluate(() => {
      window.gameInstance.endGame(false);
    });
    
    // Wait for 1 second and check if any heartbeat thuds are played after Game Over
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Total thuds played after Game Over: ${thudsCount}`);
    const postGameOverThudsCount = thudsCount;

    // Report
    console.log('\n--- AUDIO VERIFICATION SUMMARY ---');
    console.log(`Stable Running: ${stableThudsCount} thuds`);
    console.log(`Active Stumble (Catch-up): ${stumbleThudsCount} thuds`);
    console.log(`Post Game Over: ${postGameOverThudsCount} thuds`);
    
    if (stumbleThudsCount === 0) {
      console.log('❌ BUG CONFIRMED: Heartbeat is completely silenced during active stumbles/chases!');
    } else {
      console.log('✅ Heartbeat plays continuously during active stumbles/chases.');
    }
    
    if (postGameOverThudsCount > 0) {
      console.log('❌ BUG CONFIRMED: Heartbeat thuds leaked after Game Over!');
    } else {
      console.log('✅ Heartbeat stops instantly on Game Over without leaking.');
    }

  } catch (err) {
    console.error('Test script error:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(0);
  }
});
