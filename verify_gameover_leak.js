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

const port = 8092;

server.listen(port, async () => {
  console.log(`[LEAK TEST SERVER] Running on http://localhost:${port}`);
  
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

    let oscLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.startsWith('OSC_CREATE:')) {
        oscLogs.push(text);
        console.log('  -> ' + text);
      } else {
        // console.log('PAGE LOG:', text);
      }
    });
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('cdnjs.cloudflare.com')) {
        request.abort('aborted');
      } else {
        request.continue();
      }
    });

    await page.goto(`http://localhost:${port}`);
    
    // Instrument audioManager to intercept oscillator creation
    await page.evaluate(() => {
      window.audioManager.muted = false;
      window.audioManager.ctx = {
        state: 'running',
        currentTime: 0,
        createOscillator() {
          let osc = {
            _freq: null,
            connect() {},
            frequency: {
              setValueAtTime(val) {
                osc._freq = val;
              },
              exponentialRampToValueAtTime() {}
            },
            start() {
              console.log(`OSC_CREATE: freq=${osc._freq}, state=${window.gameState.state}, time=${performance.now().toFixed(1)}`);
            },
            stop() {}
          };
          return osc;
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

    console.log('\n--- Triggering Game Over and Restarting in 200ms ---');
    
    // Trigger Game Over
    await page.evaluate(() => {
      window.gameInstance.endGame(false);
    });

    // Wait 200ms
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('--- Restarting game now (reset and startGame) ---');
    // Restart game
    await page.evaluate(() => {
      window.gameInstance.reset();
      window.gameInstance.startGame();
    });

    // Wait another 800ms to capture any late-firing oscillators
    await new Promise(resolve => setTimeout(resolve, 800));

    console.log('\n--- Evaluating Leaks ---');
    
    // Check if any oscillators for gameover tune (frequencies 300, 240, 180) were created after startGame
    // Note: startGame sets state to RUNNING. So if state is RUNNING or START (if it is restarting), we check.
    // Actually, after startGame, the state is RUNNING (or STUMBLING).
    // Let's filter oscLogs.
    console.log(`Total oscillators created: ${oscLogs.length}`);

  } catch (err) {
    console.error('Test script error:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(0);
  }
});
