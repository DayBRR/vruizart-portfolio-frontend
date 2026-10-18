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
    if (process.argv.includes('--header')) {
      await send('Page.bringToFront');
      await send('Emulation.setFocusEmulationEnabled', { enabled: true });
      const key = async (key, modifiers = 0) => {
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, modifiers, ...(key === 'Enter' ? { text: '\r', windowsVirtualKeyCode: 13 } : {}) });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, modifiers });
      };
      const layout = () => evaluate(`(() => {
        const rect = s => { const e = document.querySelector(s), r = e.getBoundingClientRect(); return { x:r.x, y:r.y, right:r.right, bottom:r.bottom, width:r.width, height:r.height, scroll:e.scrollWidth, client:e.clientWidth }; };
        const links = [...document.querySelectorAll('.nav a')].map(e => { const r = e.getBoundingClientRect(); return { x:r.x, y:r.y, right:r.right, bottom:r.bottom, width:r.width, height:r.height, scroll:e.scrollWidth, client:e.clientWidth }; });
        return { brand:rect('.logo'), bar:rect('.topbar'), monogram:rect('.header-logo'), links,
          collapsed:getComputedStyle(document.querySelector('.nav')).display === 'none',
          overflow:document.documentElement.scrollWidth > innerWidth,
          position:getComputedStyle(document.querySelector('.topbar')).position };
      })()`);
      for (const route of ['/', '/obra']) {
        await send('Page.navigate', { url: origin + route });
        await waitFor('!!document.querySelector(".topbar")');
        await evaluate('document.fonts.ready');
        for (const width of [1920, 1440, 1280, 1121, 1120, 1024, 820, 390]) {
          await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
          await evaluate('scrollTo(0, 0)');
          const before = await layout();
          assert.equal(before.overflow, false, `${route} at ${width}: horizontal overflow`);
          assert.equal(before.collapsed, width <= 1120);
          assert.equal(before.position, 'relative');
          assert.ok(before.brand.right + 7 <= before.monogram.x);
          if (!before.collapsed) {
            assert.ok(before.brand.right < before.links[0].x, 'brand/menu overlap');
            assert.ok(before.links.at(-1).right < before.monogram.x, 'menu/monogram overlap');
            for (const link of before.links) {
              assert.ok(link.scroll <= link.client + 1, 'link clipped');
              assert.equal(link.y, before.links[0].y, 'links are not on one row');
            }
            assert.equal(await evaluate('document.querySelectorAll(".nav a[aria-current=page]").length'), 1);
            await evaluate('document.querySelector(".nav a").focus()');
            assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'solid');
            if (width === 1440 && route === '/') {
              const capture = await send('Page.captureScreenshot', { format: 'png' });
              fs.writeFileSync('.angular/header-desktop.png', Buffer.from(capture.data, 'base64'));
            }
          } else {
            await evaluate('document.querySelector(".menu-toggle").focus()');
            await key('Enter');
            await waitFor('!!document.querySelector(".mobile-menu")');
            assert.equal(await evaluate('document.querySelector(".menu-toggle").getAttribute("aria-expanded")'), 'true');
            assert.equal(await evaluate('document.activeElement === document.querySelector(".mobile-menu a")'), true);
            assert.equal(await evaluate('document.querySelectorAll(".mobile-menu a[aria-current=page]").length'), 1);
            assert.equal(await evaluate('document.body.style.overflow'), 'hidden');
            assert.equal(await evaluate('(() => {const e=document.querySelector(".mobile-menu a:last-child"), r=e.getBoundingClientRect(); return e.contains(document.elementFromPoint(r.x+10,r.y+10));})()'), true, 'menu clipped by hero');
            await evaluate('document.querySelector(".mobile-menu a:last-child").focus()');
            await key('Tab');
            assert.equal(await evaluate('document.activeElement.classList.contains("menu-close")'), true);
            await key('Tab', 8);
            assert.equal(await evaluate('document.activeElement === document.querySelector(".mobile-menu a:last-child")'), true);
            if (width === 390 && route === '/') {
              const capture = await send('Page.captureScreenshot', { format: 'png' });
              fs.writeFileSync('.angular/header-mobile.png', Buffer.from(capture.data, 'base64'));
            }
            await key('Escape');
            await waitFor('!document.querySelector(".mobile-menu")');
            assert.equal(await evaluate('document.activeElement.classList.contains("menu-toggle")'), true);
            assert.equal(await evaluate('document.body.style.overflow'), '');
            assert.equal(await evaluate('document.querySelector(".menu-toggle").getAttribute("aria-expanded")'), 'false');
            await evaluate('document.querySelector(".menu-toggle").click()');
            await evaluate('document.querySelector(".mobile-menu-backdrop").click()');
            await waitFor('!document.querySelector(".mobile-menu")');
          }
          await evaluate('scrollTo(0, 180)');
          await delay(50);
          const after = await layout();
          assert.equal(after.bar.width, before.bar.width);
          assert.equal(after.brand.x, before.brand.x);
          assert.equal(after.monogram.x, before.monogram.x);
          assert.ok(after.bar.y < before.bar.y, 'header unexpectedly sticky');
          console.log(`Header ${route} ${width}px: layout, active link, keyboard and scroll passed`);
        }
      }
      await evaluate('scrollTo(0, 0); document.querySelector(".menu-toggle").click()');
      await evaluate('document.querySelector(".mobile-menu a").click()');
      await waitFor('location.pathname === "/" && !!document.querySelector(".topbar")');
      assert.equal(await evaluate('document.querySelector(".mobile-menu") === null && document.body.style.overflow === ""'), true);
      await evaluate('document.querySelector(".menu-toggle").click()');
      await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
      await waitFor('!document.querySelector(".mobile-menu")');
      assert.equal(await evaluate('document.body.style.overflow'), '');
      console.log('Header navigation and resize cleanup passed');
      for (const route of ['/obra', '/exposiciones', '/publicaciones', '/sobre-mi', '/contacto', '/']) {
        await evaluate(`document.querySelector('.nav a[href="${route}"]').click()`);
        await waitFor(`location.pathname === '${route}' && !!document.querySelector('.nav a[aria-current=page]')`);
        assert.equal(await evaluate('document.querySelector(".nav a[aria-current=page]").getAttribute("href")'), route);
      }
      console.log('All six desktop navigation links and active indicators passed');
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
        await waitFor(`document.querySelector('.pagination-page[aria-current="page"]')?.textContent.trim() === '${expectedPage}'`);
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
      await waitFor('document.querySelector(".pagination-page[aria-current=page]")?.textContent.trim() === "9"');
      for (let page = 10; page <= 20; page++) {
        await evaluate('document.querySelector(".pagination-next").click()');
        await waitFor(`document.querySelector('.pagination-page[aria-current="page"]')?.textContent.trim() === '${page}'`);
      }
      assert.deepEqual(await numbers(), [16, 17, 18, 19, 20]);
      assert.equal(await evaluate('document.querySelector(".pagination-next").disabled'), true);
      await evaluate('document.querySelector(".pagination-prev").click()');
      await waitFor('document.querySelector(".pagination-page[aria-current=page]")?.textContent.trim() === "19"');
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
    await waitFor('document.querySelector(".pagination-page[aria-current=page]")?.textContent.trim() === "2"');
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
