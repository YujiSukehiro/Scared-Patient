const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

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

const port = 8091;

server.listen(port, async () => {
  console.log(`[RESTART TEST SERVER] Running on http://localhost:${port}`);
  
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
    
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });

    page.on('console', msg => {
      console.log('PAGE LOG:', msg.text());
    });
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      if (url.includes('cdnjs.cloudflare.com')) {
        request.abort('aborted');
      } else if (url.includes('script.google.com')) {
        request.respond({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success' })
        });
      } else {
        request.continue();
      }
    });

    await page.goto(`http://localhost:${port}`);
    
    // Instrument audioManager
    await page.evaluate(() => {
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

    console.log('\n--- Running test: Start, GameOver, Reset, and check state ---');
    
    // Start game
    await page.evaluate(() => {
      window.gameInstance.reset();
      window.gameInstance.startGame();
    });
    
    // Let it run for 200ms
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Trigger Game Over
    await page.evaluate(() => {
      window.gameInstance.endGame(false);
    });
    
    // Get state immediately
    let stateAfterGameOver = await page.evaluate(() => window.gameState.state);
    console.log('State immediately after GameOver:', stateAfterGameOver);
    
    // Submit initials
    await page.evaluate(() => {
      document.getElementById('initials-input').value = 'RST';
      const form = document.getElementById('leaderboard-form');
      const submitEvent = new Event('submit', { cancelable: true });
      form.dispatchEvent(submitEvent);
    });
    
    // Wait for the reset to happen (there's a fetch mock response)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check state and distance now
    let stateAfterReset = await page.evaluate(() => window.gameState.state);
    let distanceAfterReset = await page.evaluate(() => window.gameState.distance);
    let heartbeatActiveAfterReset = await page.evaluate(() => window.audioManager.heartbeatInterval);
    
    console.log('State 300ms after Reset:', stateAfterReset);
    console.log('Distance 300ms after Reset:', distanceAfterReset);
    console.log('Heartbeat Active 300ms after Reset:', heartbeatActiveAfterReset);
    
    // Let's wait another 500ms to see if distance keeps increasing or heartbeat continues
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let distanceAfterWait = await page.evaluate(() => window.gameState.distance);
    let heartbeatActiveAfterWait = await page.evaluate(() => window.audioManager.heartbeatInterval);
    
    console.log('Distance 800ms after Reset:', distanceAfterWait);
    console.log('Heartbeat Active 800ms after Wait:', heartbeatActiveAfterWait);

  } catch (err) {
    console.error('Test script error:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(0);
  }
});
