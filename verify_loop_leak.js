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

const port = 8096;

server.listen(port, async () => {
  console.log(`[LOOP LEAK TEST SERVER] Running on http://localhost:${port}`);
  
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

    let renderCount = 0;
    page.on('console', msg => {
      const text = msg.text();
      if (text === 'RENDER') {
        renderCount++;
      } else {
        console.log('PAGE LOG:', text);
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
    
    // Instrument window.gameInstance and window.gameState
    await page.evaluate(() => {
      window.audioManager.muted = true; // Mute audio to avoid actual context errors
      // Override renderer.render to count calls
      const originalRender = window.gameInstance.renderer.render;
      window.gameInstance.renderer.render = function(...args) {
        console.log('RENDER');
        return originalRender.apply(this, args);
      };
    });

    console.log('\n--- Initial Play (Cycle 1) ---');
    // Start game
    await page.evaluate(() => {
      window.gameInstance.reset();
      window.gameInstance.startGame();
    });
    
    renderCount = 0;
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Renders in Cycle 1: ${renderCount}`);

    console.log('\n--- Triggering GameOver and Reset/Restart (Cycle 2) ---');
    // Trigger Game Over
    await page.evaluate(() => {
      window.gameInstance.endGame(false);
    });
    // Reset and Start Game again
    await page.evaluate(() => {
      window.gameInstance.reset();
      window.gameInstance.startGame();
    });
    
    renderCount = 0;
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Renders in Cycle 2: ${renderCount}`);

    console.log('\n--- Triggering GameOver and Reset/Restart (Cycle 3) ---');
    // Trigger Game Over
    await page.evaluate(() => {
      window.gameInstance.endGame(false);
    });
    // Reset and Start Game again
    await page.evaluate(() => {
      window.gameInstance.reset();
      window.gameInstance.startGame();
    });
    
    renderCount = 0;
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Renders in Cycle 3: ${renderCount}`);

  } catch (err) {
    console.error('Test script error:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(0);
  }
});
