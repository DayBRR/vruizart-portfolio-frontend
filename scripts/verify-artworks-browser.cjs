// Build first, then run: node scripts/verify-artworks-browser.cjs
// Uses installed Chrome, CDP and Node built-ins; API responses are fixtures.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve('dist/vruizart-portfolio-frontend/browser');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const image = '/assets/images/collections/collection-1.jpg';
const collections = ['serie', 'corta'].map((slug, i) => ({ slug, name: slug, description: 'Descripcion', sortOrder: i, coverImageUrl: image }));
const works = Array.from({ length: 16 }, (_, i) => ({
  slug: `obra-${String(i).padStart(2, '0')}`, title: `Obra ${i} con un titulo largo para comprobar el espacio`,
  collectionSlug: i < 14 ? 'serie' : 'corta', collectionName: i < 14 ? 'serie' : 'corta',
  images: [], mainImageUrl: image, year: 2025, technique: 'Oleo', status: 'AVAILABLE', price: 100
}));
let paginatedWorks = works;
let failTechniques = false;
let failArtworks = false;
let emptyFilteredResults = false;
const requests = [];
function fixture(url) {
  const p = url.pathname.split('/api/public/')[1];
  if (p === 'profile') return { name: 'Vicente Ruiz', instagram: '', email: '' };
  if (p === 'collections') return collections;
  if (p === 'content/hero') return [{ imageUrl: image, altText: 'Obra', sortOrder: 0 }];
  if (p === 'artworks/hero') return works.slice(0, 3);
  if (p === 'artworks/featured') return works.slice(0, 2);
  if (p === 'artworks/techniques') return [...new Set(paginatedWorks
    .filter(w => !url.searchParams.get('collection') || w.collectionSlug === url.searchParams.get('collection'))
    .map(w => w.technique))].sort();
  if (p === 'artworks') {
    const all = paginatedWorks.filter(w =>
      (!url.searchParams.get('collection') || w.collectionSlug === url.searchParams.get('collection')) &&
      (!url.searchParams.get('technique') || (!emptyFilteredResults && w.technique === url.searchParams.get('technique'))));
    const number = Number(url.searchParams.get('page')), size = Number(url.searchParams.get('size'));
    return { content: all.slice(number * size, (number + 1) * size), page: { number, size, totalElements: all.length, totalPages: Math.ceil(all.length / size) } };
  }
  if (p?.startsWith('artworks/')) return works.find(w => w.slug === p.split('/')[1]);
  return [];
}
const server = http.createServer((req, res) => {
  let file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg' };
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0',
    `--user-data-dir=${path.resolve('.angular/artworks-browser-profile')}`, 'about:blank'
  ], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let socket;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error('Chrome launch timed out')), 15000);
      chrome.stderr.on('data', data => {
        output += data;
        const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      chrome.on('error', reject);
    });
    socket = new WebSocket(endpoint);
    await new Promise(resolve => socket.addEventListener('open', resolve));
    let id = 0, sessionId;
    const pending = new Map();
    const send = (method, params = {}, session = sessionId) => new Promise((resolve, reject) => {
      const callId = ++id; pending.set(callId, { resolve, reject });
      socket.send(JSON.stringify({ id: callId, method, params, ...(session ? { sessionId: session } : {}) }));
    });
    socket.addEventListener('message', async event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const p = pending.get(message.id); pending.delete(message.id);
        if (message.error) p.reject(message.error); else p.resolve(message.result);
      } else if (message.method === 'Fetch.requestPaused') {
        const url = new URL(message.params.request.url);
        requests.push(url);
        const failed = failTechniques && url.pathname.endsWith('/techniques') || failArtworks && url.pathname.endsWith('/artworks');
        await send('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: failed ? 503 : 200,
          responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }],
          body: Buffer.from(JSON.stringify(fixture(new URL(message.params.request.url)))).toString('base64') });
      }
    });
    const target = await send('Target.createTarget', { url: 'about:blank' });
    sessionId = (await send('Target.attachToTarget', { targetId: target.targetId, flatten: true })).sessionId;
    await send('Page.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*api/public/*' }] });
    const evaluate = async expression => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    const waitFor = async expression => {
      for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await delay(100); }
      throw new Error('Timed out: ' + expression);
    };
    const navigate = async route => { await send('Page.navigate', { url: origin + route }); await waitFor('!!document.querySelector(".collection-cover, .gallery-section") && !document.querySelector(".gallery-loading")'); };
    if (process.argv.includes('--viewer')) {
      const portrait = '/assets/images/artworks/leyendas-de-la-musica/Amaral.jpg';
      const landscape = '/assets/images/artworks/paisaje-urbano/Casa%20Perico.jpg';
      const square = '/assets/images/artworks/20x20/After%20Painting.jpg';
      works.forEach((w, i) => { w.mainImageUrl = [portrait, landscape, square][i % 3]; w.description = 'Descripción de prueba. '; w.widthCm = 60; w.heightCm = 80; });
      works[0].images = [{ imageUrl: portrait, sortOrder: 0, main: true }, { imageUrl: landscape, sortOrder: 1, main: false }];
      await send('Page.bringToFront');
      await send('Emulation.setFocusEmulationEnabled', { enabled: true });
      const key = async (key, modifiers = 0) => {
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, modifiers });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, modifiers });
      };
      const openFirst = async () => {
        await evaluate('(() => {const c=document.querySelector(".art-card");c.scrollIntoView({block:"center"});c.focus();c.click();})()');
        await waitFor('!!document.querySelector(".lightbox-image img.loaded")');
      };
      const title = () => evaluate('document.querySelector("#viewer-title").textContent.trim()');
      const checkBounds = async () => {
        const result = await evaluate(`(() => {
          const r=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
          return { shell:r('.lightbox-shell'), image:r('.lightbox-image img'), stage:r('.lightbox-image'), close:r('.lb-close'),
            viewport:{width:innerWidth,height:innerHeight}, fit:getComputedStyle(document.querySelector('.lightbox-image img')).objectFit,
            shellOverflow:document.querySelector('.lightbox-shell').scrollHeight > document.querySelector('.lightbox-shell').clientHeight,
            overflow:document.documentElement.scrollWidth > innerWidth };
        })()`);
        assert.equal(result.fit, 'contain');
        assert.equal(result.overflow, false);
        assert.equal(result.shellOverflow, false);
        assert.ok(result.shell.y >= 0 && result.shell.bottom <= result.viewport.height + 1, 'modal outside viewport');
        assert.ok(result.image.x >= result.stage.x && result.image.right <= result.stage.right + 1 && result.image.y >= result.stage.y && result.image.bottom <= result.stage.bottom + 1, 'painting clipped');
        assert.ok(result.close.width >= 44 && result.close.height >= 44 && result.close.y >= 0 && result.close.bottom <= result.viewport.height, 'close button inaccessible');
        return result;
      };
      for (const [width, height] of [[1440,900],[1280,720],[1024,600],[820,900],[390,844],[844,390],[390,600]]) {
        await send('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:false});
        await navigate('/obra/catalogo');
        await openFirst();
        const initial = await checkBounds();
        assert.equal(await evaluate('document.activeElement.classList.contains("lb-close")'), true);
        assert.equal(await evaluate('document.querySelector("main").inert'), true);
        assert.equal(await evaluate('document.body.style.overflow'), 'hidden');
        const requestCount = requests.length;
        assert.equal(await evaluate('document.querySelector(".artwork-previous").disabled'), true);
        assert.equal(await evaluate('document.querySelector(".artwork-position").textContent.trim()'), '1 / 12');
        const firstTitle = await title();
        await evaluate('document.querySelector(".lb-next").click()');
        await waitFor('document.querySelector(".image-navigation span").textContent.includes("2 de 2") && !!document.querySelector(".lightbox-image img.loaded")');
        assert.equal(await title(), firstTitle, 'image navigation changed artwork');
        await evaluate('document.querySelectorAll(".lb-thumb")[0].click()');
        await waitFor('document.querySelectorAll(".lb-thumb")[0].getAttribute("aria-pressed") === "true" && !!document.querySelector(".lightbox-image img.loaded")');
        await evaluate('document.querySelector(".artwork-next").click()');
        await waitFor('document.querySelector(".artwork-position").textContent.trim() === "2 / 12" && !!document.querySelector(".lightbox-image img.loaded")');
        await key('ArrowRight');
        await waitFor('document.querySelector(".artwork-position").textContent.trim() === "3 / 12" && !!document.querySelector(".lightbox-image img.loaded")');
        await checkBounds();
        await key('ArrowLeft');
        await waitFor('document.querySelector(".artwork-position").textContent.trim() === "2 / 12"');
        assert.equal(requests.length, requestCount, 'viewer requested backend data');
        await evaluate('document.querySelector(".lb-info").focus()');
        await key('Tab');
        assert.equal(await evaluate('document.activeElement.classList.contains("lb-close")'), true);
        await key('Tab',8);
        assert.equal(await evaluate('document.activeElement.classList.contains("lb-info")'), true);
        if (width === 1440 || width === 390 && height === 844) {
          await waitFor('!!document.querySelector(".lightbox-image img.loaded")');
          const capture = await send('Page.captureScreenshot', {format:'png'});
          fs.writeFileSync(`.angular/artwork-viewer-${width === 1440 ? 'desktop' : 'mobile'}.png`,Buffer.from(capture.data,'base64'));
        }
        const scrollBefore = await evaluate('scrollY');
        await key('Escape');
        await waitFor('!document.querySelector(".lightbox")');
        assert.equal(await evaluate('document.body.style.overflow'), '');
        assert.equal(await evaluate('document.documentElement.style.overflow'), '');
        assert.equal(await evaluate('document.activeElement === document.querySelector(".art-card")'), true);
        assert.equal(await evaluate('document.querySelector("main").inert'), false);
        assert.equal(await evaluate('scrollY'), scrollBefore);
        console.log(`Viewer ${width}x${height}: bounds, artwork/image navigation, focus trap, Escape, scroll and zero backend requests passed`);
      }
      works[0].description = 'Descripción larga de prueba. '.repeat(200);
      await navigate('/obra/catalogo');
      await openFirst();
      const before = await checkBounds();
      assert.equal(await evaluate('document.querySelector(".lb-info").scrollHeight > document.querySelector(".lb-info").clientHeight'), true);
      await evaluate('document.querySelector(".lb-info").scrollTop = 10000');
      const after = await checkBounds();
      assert.deepEqual(after.stage,before.stage,'info scroll moved painting');
      await evaluate('document.querySelector(".lb-close").click()');
      await navigate('/obra/obra-00');
      await waitFor('!!document.querySelector(".lightbox-image img.loaded")');
      assert.equal(await evaluate('document.querySelector(".artwork-navigation") === null'), true, 'single direct detail exposes unrelated results');
      await key('Escape');
      works[0].description = 'Descripción de prueba';
      await navigate('/obra');
      await openFirst();
      assert.equal(await evaluate('document.querySelector(".artwork-position").textContent.trim()'), '1 / 4');
      await key('Escape');
      await send('Page.navigate', {url:origin+'/'});
      await waitFor('!!document.querySelector(".featured-work")');
      await evaluate('document.querySelector(".featured-work").click()');
      await waitFor('!!document.querySelector(".lightbox-image img.loaded")');
      assert.equal(await evaluate('document.querySelector(".artwork-position").textContent.trim()'), '1 / 2');
      assert.equal(await evaluate('document.querySelector(".lb-info").textContent.includes("Estado")'), true);
      await key('Escape');
      assert.equal(await evaluate('document.body.style.overflow'), '');
      console.log('Viewer long description, standalone detail, collection preview and Home shared behavior passed');
      return;
    }
    if (process.argv.includes('--cards')) {
      const asset = file => '/assets/images/artworks/' + file.split('/').map(encodeURIComponent).join('/');
      const portraits = ['Amaral', 'Bowie II', 'Bunbury II', 'Cyrus'].map(name => asset(`leyendas-de-la-musica/${name}.jpg`));
      const landscapes = [asset('otras-obras/Mi primer Rembrandt.jpg'), asset('otras-obras/Nadie me abraza.jpg'), asset('paisaje-urbano/Casa Perico.jpg'), asset('paisaje-urbano/Fábrica abandonada.jpg')];
      if (process.argv.includes('--urban')) {
        portraits.splice(0, portraits.length, ...['Cara oculta de Piazza San Marco', 'Entrando al Tercer Milenio', 'Imagine', 'Paseo por Tetuan'].map(name => asset(`paisaje-urbano/${name}.jpg`)));
        landscapes.splice(0, landscapes.length, ...['Casa Perico', 'Fábrica abandonada', 'Incomunicacion', 'The Big Apple'].map(name => asset(`paisaje-urbano/${name}.jpg`)));
      }
      const mixed = [portraits[0], landscapes[0], asset('20x20/After Painting.jpg'), portraits[1]];
      if (process.argv.includes('--urban')) mixed[2] = asset('paisaje-urbano/Basílica del Pilar.jpg');
      works.splice(0, works.length, ...[...portraits, ...landscapes, ...mixed].map((mainImageUrl, i) => ({
        ...works[0], slug: `visual-${String(i).padStart(2, '0')}`, collectionSlug: 'serie', mainImageUrl,
        title: i % 3 === 0 ? 'Una obra con un título largo que necesita varias líneas para mostrarse completo' : `Obra ${i + 1}`
      })));
      const loaded = async () => {
        const count = await evaluate('document.querySelectorAll(".art-card").length');
        for (let i = 0; i < count; i++) await evaluate(`document.querySelectorAll('.art-card')[${i}].scrollIntoView({block:'center'})`);
        await waitFor('[...document.querySelectorAll(".art-card img")].every(i => i.complete && i.naturalWidth > 0)');
      };
      const metrics = () => evaluate(`(() => {
        const rect = e => {const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
        return [...document.querySelectorAll('.art-card')].map(c => {
          const img=c.querySelector('img'); return { card:rect(c), zone:rect(c.querySelector('.art-image-wrap')),
            title:rect(c.querySelector('h3')), meta:rect(c.querySelector('.art-caption p')), image:rect(img),
            naturalWidth:img.naturalWidth, naturalHeight:img.naturalHeight, fit:getComputedStyle(img).objectFit };
        });
      })()`);
      const check = async columns => {
        const cards = await metrics();
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i], first = cards[i - i % columns];
          assert.ok(Math.abs(c.zone.y - first.zone.y) < 1, 'image zones not aligned');
          assert.ok(Math.abs(c.zone.height - first.zone.height) < 1, 'image zones differ in height');
          assert.ok(Math.abs(c.title.y - first.title.y) < 1, 'titles not aligned');
          assert.ok(Math.abs(c.meta.y - first.meta.y) < 1, 'metadata not aligned');
          assert.ok(c.title.bottom <= c.meta.y, 'title overlaps metadata');
          assert.ok(c.image.x >= c.zone.x && c.image.right <= c.zone.right, 'image clipped horizontally');
          assert.ok(c.image.y >= c.zone.y && c.image.bottom <= c.zone.bottom, 'image clipped vertically');
          assert.ok(Math.abs(c.image.x + c.image.width/2 - c.zone.x - c.zone.width/2) < 1, 'image not centered horizontally');
          assert.ok(Math.abs(c.image.y + c.image.height/2 - c.zone.y - c.zone.height/2) < 1, 'image not centered vertically');
          assert.ok(Math.abs(c.image.width/c.image.height - c.naturalWidth/c.naturalHeight) < .01, 'image distorted');
          assert.ok(c.image.width <= c.naturalWidth + 1, 'image enlarged beyond natural size');
          assert.equal(c.fit, 'contain');
          if (i + columns < cards.length) assert.ok(c.meta.bottom < cards[i + columns].zone.y, 'rows overlap');
        }
      };
      const screenshot = async name => {
        const clip = await evaluate(`(() => {const r=document.querySelector('.art-grid').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1};})()`);
        const capture = await send('Page.captureScreenshot', { format:'png', captureBeyondViewport:true, clip });
        fs.writeFileSync(`.angular/artwork-cards-${name}.png`, Buffer.from(capture.data,'base64'));
      };
      for (const route of ['/obra/catalogo', '/obra/coleccion/serie']) {
        await navigate(route);
        for (const [width, columns, name] of [[1440,4,'desktop'],[820,2,'tablet'],[390,1,'mobile']]) {
          await send('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:false});
          await loaded();
          await check(columns);
          if (route === '/obra/catalogo') await screenshot(name);
          console.log(`Cards ${route} ${width}px: portrait/landscape/mixed, title and metadata alignment, proportions, centering and no overflow passed`);
        }
      }
      await send('Emulation.setDeviceMetricsOverride', {width:1440,height:900,deviceScaleFactor:1,mobile:false});
      await evaluate('document.querySelector(".art-card").scrollIntoView({block:"center"})');
      const before = await metrics();
      const c = before[0].zone;
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:c.x+c.width/2,y:c.y+c.height/2});
      await delay(300);
      const after = await metrics();
      assert.deepEqual(after.map(c=>[c.card,c.zone,c.title,c.meta]),before.map(c=>[c.card,c.zone,c.title,c.meta]),'hover shifts layout');
      assert.ok(Math.abs(after[0].image.width/before[0].image.width - 1.02) < .001);
      assert.ok(after[0].image.x >= c.x && after[0].image.right <= c.right && after[0].image.y >= c.y && after[0].image.bottom <= c.bottom, 'hover clips painting');
      await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".art-card img")).transform'),'none');
      await evaluate('document.querySelector(".art-card").focus()');
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".art-image-wrap")).outlineStyle'),'solid');
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',windowsVirtualKeyCode:13});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
      await waitFor('!!document.querySelector(".lightbox")');
      await evaluate('document.querySelector(".lb-close").click()');
      // Exercise mixed formats in the four-item collection preview as well.
      works.forEach((w,i)=>{w.mainImageUrl=mixed[i%4];});
      await navigate('/obra');
      await loaded();
      await check(4);
      await screenshot('collection-preview');
      await evaluate('document.querySelector(".art-card").click()');
      await waitFor('!!document.querySelector(".lightbox")');
      console.log('Cards hover 1.02 without clipping/layout shift, reduced motion, keyboard/detail and collection preview passed');
      return;
    }
    await navigate('/obra');
    assert.deepEqual(await evaluate('[...document.querySelectorAll(".collection-preview")].map(s=>s.querySelectorAll(".art-card").length)'), [4, 2]);
    for (const width of [1440, 820, 390]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".art-card img")).objectFit'), 'contain');
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".art-grid")).gridTemplateColumns.split(" ").length'), width === 1440 ? 4 : width === 820 ? 2 : 1);
      console.log(`Responsive ${width}px: no horizontal overflow, artwork contained`);
    }
    await evaluate('document.querySelector(".art-card").click()');
    await waitFor('!!document.querySelector(".lightbox")');
    assert.equal(await evaluate('document.querySelector(".lb-info").textContent.includes("Precio")'), false);
    await evaluate('document.querySelector(".lb-close").click()');
    await evaluate('document.querySelector(".collection-action a").click()');
    await waitFor('location.pathname === "/obra/coleccion/serie" && !!document.querySelector(".gallery-section")');
    await waitFor('document.querySelectorAll(".art-card").length === 12');
    assert.equal(await evaluate('document.querySelectorAll(".art-card").length'), 12);
    await evaluate('document.querySelector(".pagination-next").click()');
    await waitFor('document.querySelectorAll(".art-card").length === 2');
    await evaluate('document.querySelector(".back-navigation a").click()');
    await waitFor('!!document.querySelector(".collection-cover")');
    await evaluate('document.querySelector(".catalog-action a").click()');
    await waitFor('!!document.querySelector(".filters")');
    await evaluate('document.querySelectorAll(".chip")[2].click()');
    await waitFor('document.querySelectorAll(".art-card").length === 2');
    await navigate('/obra/obra-00');
    await waitFor('!!document.querySelector(".lightbox")');
    await send('Page.navigate', { url: origin + '/' });
    await waitFor('!!document.querySelector(".collection-grid a")');
    assert.equal(await evaluate('document.querySelector(".collection-grid a").getAttribute("href")'), '/obra/coleccion/serie');
    await evaluate('document.querySelector(".collection-grid a").click()');
    await waitFor('location.pathname === "/obra/coleccion/serie" && !!document.querySelector(".gallery-section")');
    await navigate('/obra?collection=corta');
    assert.equal(await evaluate('document.querySelectorAll(".art-card").length'), 2);
    console.log('Browser checks passed: previews, collection navigation, pagination, return, catalog filters, direct detail, Home links and legacy collection queries.');
    paginatedWorks = Array.from({ length: 240 }, (_, i) => ({ ...works[0], slug: `large-${i}`, title: `Obra ${i}` }));
    for (const route of ['/obra/catalogo', '/obra/coleccion/serie']) {
      await navigate(route);
      const numbers = () => evaluate('[...document.querySelectorAll(".pagination-page")].map(b=>Number(b.textContent.trim()))');
      assert.deepEqual(await numbers(), [1, 2, 3, 4, 5]);
      assert.equal(await evaluate('document.querySelector(".pagination-prev").disabled'), true);
      for (const expectedPage of [2, 3, 4, 5, 6, 7, 8]) {
        await evaluate('document.querySelector(".pagination-next").click()');
        await waitFor(`document.querySelector('[aria-current="page"]')?.textContent.trim() === '${expectedPage}'`);
        assert.equal((await numbers()).length, 5);
      }
      assert.deepEqual(await numbers(), [6, 7, 8, 9, 10]);
      // Activate page 9 via keyboard and verify the actual page value, not window index.
      await send('Page.bringToFront');
      await send('Emulation.setFocusEmulationEnabled', { enabled: true });
      await evaluate('document.querySelectorAll(".pagination-page")[3].focus()');
      assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineStyle !== "none"'), true);
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      await waitFor('document.querySelector("[aria-current=page]")?.textContent.trim() === "9"');
      for (let page = 10; page <= 20; page++) {
        await evaluate('document.querySelector(".pagination-next").click()');
        await waitFor(`document.querySelector('[aria-current="page"]')?.textContent.trim() === '${page}'`);
      }
      assert.deepEqual(await numbers(), [16, 17, 18, 19, 20]);
      assert.equal(await evaluate('document.querySelector(".pagination-next").disabled'), true);
      await evaluate('document.querySelector(".pagination-prev").click()');
      await waitFor('document.querySelector("[aria-current=page]")?.textContent.trim() === "19"');
      for (const width of [1440, 820, 390]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
      }
      console.log(`Pagination browser checks passed: ${route}, 20 pages, five numbers, keyboard/focus, aria-current, bounds, responsive`);
    }
    const exactTechnique = 'Óleo  y lápiz / papel & tinta';
    paginatedWorks = paginatedWorks.map((w, i) => ({ ...w, technique: i < 200 ? exactTechnique : 'Pastel sobre papel' }));
    const selectTechnique = async value => {
      await evaluate(`(() => { const s = document.querySelector('#artwork-technique'); s.value = ${JSON.stringify(value)}; s.dispatchEvent(new Event('change')); })()`);
      await waitFor('!document.querySelector(".gallery-loading")');
    };
    await navigate('/obra/catalogo');
    assert.equal(await evaluate('document.querySelector("label[for=artwork-technique]") !== null'), true);
    await selectTechnique(exactTechnique);
    assert.equal(requests.at(-1).searchParams.get('technique'), exactTechnique);
    await evaluate('document.querySelector(".pagination-next").click()');
    await waitFor('document.querySelector("[aria-current=page]")?.textContent.trim() === "2"');
    assert.equal(requests.at(-1).searchParams.get('technique'), exactTechnique);
    await selectTechnique('Pastel sobre papel');
    assert.equal(requests.at(-1).searchParams.get('page'), '0');
    assert.equal(await evaluate('document.querySelector(".result-count").textContent.includes("40")'), true);
    await selectTechnique('');
    assert.equal(requests.at(-1).searchParams.has('technique'), false);
    await navigate('/obra/coleccion/serie');
    assert.equal(await evaluate('document.querySelector(".filter-row") === null'), true);
    assert.ok(requests.some(u => u.pathname.endsWith('/techniques') && u.searchParams.get('collection') === 'serie'));
    emptyFilteredResults = true;
    await selectTechnique(exactTechnique);
    assert.equal(await evaluate('document.querySelector(".empty").textContent.includes("No se han encontrado obras con los filtros seleccionados")'), true);
    assert.equal(await evaluate('document.querySelectorAll(".pagination-page").length'), 0);
    assert.equal(requests.at(-1).searchParams.get('collection'), 'serie');
    await evaluate('document.querySelector(".empty button").click()');
    await waitFor('document.querySelectorAll(".art-card").length === 12');
    assert.equal(requests.at(-1).searchParams.has('technique'), false);
    emptyFilteredResults = false;
    failTechniques = true;
    await navigate('/obra/catalogo');
    assert.equal(await evaluate('document.querySelector("#technique-status").textContent.includes("No se han podido")'), true);
    failTechniques = false;
    await evaluate('document.querySelector(".technique-filter button").click()');
    await waitFor('document.querySelectorAll("#artwork-technique option").length === 3');
    failArtworks = true;
    await selectTechnique(exactTechnique);
    assert.equal(await evaluate('document.querySelector(".empty").textContent.includes("No se han podido cargar las obras")'), true);
    failArtworks = false;
    await evaluate('document.querySelector(".empty button").click()');
    await waitFor('document.querySelectorAll(".art-card").length === 12');
    for (const width of [1440, 820, 390]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    }
    console.log('Technique browser checks passed: exact names/encoding, combined filters, contextual options, page reset/persistence, empty state/clear, errors/retry and responsive');
  } finally {
    socket?.close(); chrome.kill(); server.closeAllConnections(); server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
