// Read-only verification against a running backend; no fixture data.
// node scripts/verify-techniques-live.cjs [http://localhost:8080/api/public]
const assert = require('node:assert/strict');
const base = process.argv[2] || 'http://localhost:8080/api/public';
async function get(path, values = {}) {
  const url = new URL(base + path);
  for (const [key, value] of Object.entries(values)) if (value !== undefined) url.searchParams.set(key, value);
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, `${url.pathname}: HTTP ${response.status}`);
  return response.json();
}
(async () => {
  const collections = await get('/collections');
  let verified = 0;
  for (const collection of [undefined, ...collections.slice(0, 2).map(c => c.slug)]) {
    const techniques = await get('/artworks/techniques', { collection });
    assert.ok(Array.isArray(techniques));
    assert.ok(techniques.every(t => typeof t === 'string' && t.trim()));
    assert.equal(new Set(techniques).size, techniques.length);
    for (const technique of techniques.slice(0, 2)) {
      const first = await get('/artworks', { collection, technique, page: 0, size: 12 });
      let count = first.content.length;
      const check = works => works.forEach(w => {
        assert.equal(w.technique, technique);
        if (collection) assert.equal(w.collectionSlug, collection);
      });
      check(first.content);
      for (let page = 1; page < first.page.totalPages; page++) {
        const next = await get('/artworks', { collection, technique, page, size: 12 });
        check(next.content);
        assert.equal(next.page.totalElements, first.page.totalElements);
        count += next.content.length;
      }
      assert.equal(count, first.page.totalElements);
      verified++;
    }
    const empty = await get('/artworks', { collection, technique: '__vruizart_contract_test_unknown__', page: 0, size: 12 });
    assert.deepEqual(empty.content, []);
    assert.equal(empty.page.totalElements, 0);
    assert.equal(empty.page.totalPages, 0);
    console.log(`Live contract: ${collection || 'catalog'}, ${techniques.length} techniques; unknown technique returns zero results`);
  }
  console.log(`Live contract passed: ${verified} technique/context combinations, exact technique names, collection scope and paginated totals`);
})().catch(error => { console.error(error); process.exitCode = 1; });
