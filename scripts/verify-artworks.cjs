// Focused behavior checks using the existing TypeScript and RxJS dependencies.
// Run with: node --test scripts/verify-artworks.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const rx = require('rxjs');

let dependencies;
function load(file, exportName) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true }
  }).outputText;
  const module = { exports: {} };
  const mockRequire = name => {
    if (name === 'rxjs') return rx;
    if (name === '@angular/core') return {
      Component: () => value => value, Injectable: () => value => value,
      inject: token => dependencies[token?.name] || {}
    };
    if (name === '@angular/router') return { ActivatedRoute: class ActivatedRoute {}, Router: class Router {} };
    if (name === '@angular/common/http') return { HttpClient: class HttpClient {}, HttpParams: class HttpParams {
      constructor(values = {}) { this.values = values; }
      set(key, value) { return new this.constructor({ ...this.values, [key]: String(value) }); }
      get(key) { return this.values[key] ?? null; }
      has(key) { return key in this.values; }
    } };
    if (name.endsWith('/portfolio-api.service')) return { PortfolioApiService: class PortfolioApiService {} };
    if (name.endsWith('/environment')) return { environment: { apiUrl: '/api/public' } };
    if (name === '@angular/core/rxjs-interop') return { takeUntilDestroyed: () => value => value };
    return {};
  };
  new Function('require', 'module', 'exports', source)(mockRequire, module, module.exports);
  return module.exports[exportName];
}
const Component = load('src/app/features/artworks/artworks.component.ts', 'ArtworksComponent');
const Service = load('src/app/core/services/portfolio-api.service.ts', 'PortfolioApiService');
const artwork = (slug, collectionSlug = 'serie') => ({ slug, collectionSlug, title: slug, images: [] });
const collection = { slug: 'serie', name: 'Serie', sortOrder: 1 };
const page = (content, number = 0, totalPages = 1) => ({ content, page: { number, totalPages, totalElements: content.length, size: 12 } });
const params = values => ({ get: key => values[key] || null, has: key => key in values });
function setup(routeParams = {}, queryParams = {}, data = {}, overrides = {}) {
  const calls = [];
  const paramMap = new rx.BehaviorSubject(params(routeParams));
  const queryParamMap = new rx.BehaviorSubject(params(queryParams));
  const works = Array.from({ length: 7 }, (_, i) => artwork(String(i)));
  const api = {
    getProfile: () => rx.of({}), getCollections: () => rx.of([collection]), getHeroArtworks: () => rx.of([]),
    getAllArtworks: () => rx.of(works),
    getArtworkTechniques: () => rx.of(["Pastel sobre papel", "Acuarela"]),
    getArtworks: (...args) => { if (args.length === 4 && args[3] === undefined) args.pop(); calls.push(args); return rx.of(page(works, args[1], 2)); },
    getArtwork: slug => rx.of(artwork(slug)),
    ...overrides
  };
  dependencies = {
    PortfolioApiService: api,
    ActivatedRoute: { paramMap, queryParamMap, snapshot: { data } },
    Router: { navigate: (...args) => { calls.push(args); return Promise.resolve(true); } }
  };
  const component = new Component();
  component.ngOnInit();
  return { component, calls, paramMap, queryParamMap, api };
}

test('cover selects four deterministically without mutating input; handles short and empty collections', () => {
  const { component } = setup();
  assert.equal(component.collectionPreviews[0].artworks.length, 4);
  const works = ['z', 'b', 'e', 'a', 'd'].map(slug => artwork(slug));
  const original = [...works];
  assert.deepEqual(component.selectCollectionPreview(works, 'serie').map(a => a.slug), ['a', 'b', 'd', 'e']);
  assert.deepEqual(works, original);
  assert.equal(component.selectCollectionPreview(works.slice(0, 2), 'serie').length, 2);
  assert.deepEqual(component.selectCollectionPreview(works, 'missing'), []);
});

test('collection gallery filters the API and retains pagination to all artworks', () => {
  const { component, calls } = setup({ collectionSlug: 'serie' });
  assert.equal(component.isCollectionGallery, true);
  assert.equal(component.selectedCollectionData.name, 'Serie');
  assert.deepEqual(calls[0], ['serie', 0, 12]);
  component.nextPage();
  assert.deepEqual(calls[1], ['serie', 1, 12]);
  assert.equal(component.currentPage, 1);
});

test('catalog and legacy query links retain filters; query navigation reloads results', () => {
  const { component, calls, queryParamMap } = setup({}, {}, { catalog: true });
  assert.equal(component.isCollectionCover, false);
  assert.deepEqual(calls[0], [undefined, 0, 12]);
  component.filterByCollection('serie');
  assert.deepEqual(calls[1], [['/obra/catalogo'], { queryParams: { collection: 'serie' } }]);
  queryParamMap.next(params({ collection: 'serie' }));
  assert.deepEqual(calls[2], ['serie', 0, 12]);
  assert.equal(setup({}, { collection: 'serie' }).component.isCollectionCover, false);
});

test('direct detail links still open the viewer; close returns to underlying collections', () => {
  const { component } = setup({ slug: 'obra-antigua' });
  assert.equal(component.selectedArtwork.slug, 'obra-antigua');
  component.closeArtwork();
  assert.equal(component.selectedArtwork, undefined);
  assert.equal(component.isCollectionCover, true);
});

test('unknown collection shows explicit empty state without unfiltered API call', () => {
  const { component, calls } = setup({ collectionSlug: 'missing' });
  assert.equal(component.collectionNotFound, true);
  assert.equal(component.loading, false);
  assert.equal(calls.length, 0);
});

test('full archive follows server page count even when requested size is capped', async () => {
  const calls = [];
  dependencies = { HttpClient: { get: (url, { params }) => {
    calls.push(params);
    return rx.of(page([artwork(params.get('page'))], Number(params.get('page')), 3));
  } } };
  const works = await rx.firstValueFrom(new Service().getAllArtworks());
  assert.deepEqual(works.map(a => a.slug), ['0', '1', '2']);
  assert.deepEqual(calls.map(p => p.get('page')), ['0', '1', '2']);
});

test('archive errors propagate rather than displaying incomplete previews', async () => {
  dependencies = { HttpClient: { get: () => rx.throwError(() => new Error('offline')) } };
  await assert.rejects(rx.firstValueFrom(new Service().getAllArtworks()), /offline/);
});

test('pagination window stays within bounds for every page of 0, 1, 3, 5, 6, 10 and 20 pages', () => {
  const { component, calls } = setup({}, {}, { catalog: true });
  const requestsBefore = calls.length;
  for (const total of [0, 1, 3, 5, 6, 10, 20]) {
    component.totalPages = total;
    for (let current = 0; current < Math.max(1, total); current++) {
      component.currentPage = current;
      const actual = component.visiblePages;
      const length = Math.min(5, total);
      const start = Math.max(0, Math.min(current - 2, total - length));
      assert.deepEqual(actual, Array.from({ length }, (_, i) => start + i));
      assert.ok(actual.length <= 5);
      assert.ok(actual.every(p => p >= 0 && p < total));
      if (total) assert.ok(actual.includes(current));
    }
  }
  assert.equal(calls.length, requestsBefore, 'computing the window must not request data');
});

test('20-page windows match the requested examples', () => {
  const { component } = setup();
  component.totalPages = 20;
  for (const [current, expected] of [
    [1, [1, 2, 3, 4, 5]], [2, [1, 2, 3, 4, 5]], [3, [1, 2, 3, 4, 5]],
    [4, [2, 3, 4, 5, 6]], [8, [6, 7, 8, 9, 10]], [10, [8, 9, 10, 11, 12]],
    [18, [16, 17, 18, 19, 20]], [20, [16, 17, 18, 19, 20]]
  ]) {
    component.currentPage = current - 1;
    assert.deepEqual(component.visiblePages.map(p => p + 1), expected);
  }
});

test('pagination navigation respects bounds, busy state and collection filter', () => {
  const { component, calls } = setup({ collectionSlug: 'serie' });
  component.totalPages = 20;
  const initial = calls.length;
  component.previousPage();
  component.goToPage(-1);
  component.goToPage(20);
  component.goToPage(0);
  assert.equal(calls.length, initial);
  component.goToPage(7);
  assert.deepEqual(calls.at(-1), ['serie', 7, 12]);
  component.previousPage();
  assert.deepEqual(calls.at(-1), ['serie', 6, 12]);
  component.totalPages = 20;
  component.currentPage = 19;
  const before = calls.length;
  component.nextPage();
  component.filtering = true;
  component.previousPage();
  component.goToPage(5);
  assert.equal(calls.length, before);
});

test('service preserves exact technique and omits empty optional parameters', () => {
  const requests = [];
  dependencies = { HttpClient: { get: (url, options) => { requests.push({ url, ...options }); return rx.of([]); } } };
  const service = new Service();
  const technique = 'Óleo  y lápiz / papel & tinta';
  service.getArtworks('serie', 2, 12, technique);
  assert.equal(requests[0].params.get('technique'), technique);
  assert.equal(requests[0].params.get('collection'), 'serie');
  assert.equal(requests[0].params.get('page'), '2');
  service.getArtworks(undefined, 0, 12, '');
  assert.equal(requests[1].params.has('technique'), false);
  assert.equal(requests[1].params.has('collection'), false);
  service.getArtworkTechniques('serie');
  assert.equal(requests[2].url, '/api/public/artworks/techniques');
  assert.equal(requests[2].params.get('collection'), 'serie');
});

test('technique resets page, paginates with both filters, and clearing preserves collection', () => {
  const { component, calls } = setup({ collectionSlug: 'serie' });
  component.currentPage = 8;
  component.filterByTechnique('Pastel sobre papel');
  assert.deepEqual(calls.at(-1), ['serie', 0, 12, 'Pastel sobre papel']);
  assert.equal(component.currentPage, 0);
  component.nextPage();
  assert.deepEqual(calls.at(-1), ['serie', 1, 12, 'Pastel sobre papel']);
  component.filterByTechnique('Acuarela');
  assert.deepEqual(calls.at(-1), ['serie', 0, 12, 'Acuarela']);
  component.filterByTechnique('');
  assert.deepEqual(calls.at(-1), ['serie', 0, 12]);
});

test('collection changes clear invalid technique and refresh contextual options', () => {
  const contexts = [];
  const { component, paramMap, calls } = setup({ collectionSlug: 'serie' }, { technique: 'Pastel sobre papel' }, {}, {
    getCollections: () => rx.of([collection, { ...collection, slug: 'otra' }]),
    getArtworkTechniques: slug => { contexts.push(slug); return rx.of(slug === 'serie' ? ['Pastel sobre papel'] : ['Acuarela']); }
  });
  assert.equal(component.selectedTechnique, 'Pastel sobre papel');
  paramMap.next(params({ collectionSlug: 'otra' }));
  assert.deepEqual(contexts, ['serie', 'otra']);
  assert.equal(component.selectedTechnique, '');
  assert.deepEqual(calls.at(-1), ['otra', 0, 12]);
});

test('technique errors allow retry without treating a network error as empty results', () => {
  let fail = true;
  const { component } = setup({}, {}, { catalog: true }, {
    getArtworkTechniques: () => fail ? rx.throwError(() => new Error('offline')) : rx.of(['Acuarela'])
  });
  assert.equal(component.techniquesError, true);
  assert.equal(component.filterError, false);
  fail = false;
  component.retryTechniques();
  assert.equal(component.techniquesError, false);
  assert.deepEqual(component.techniques, ['Acuarela']);
});

test('rapid technique changes cancel obsolete page results and preserve empty server totals', () => {
  const requests = [];
  const { component, api } = setup({}, {}, { catalog: true });
  api.getArtworks = (...args) => { const result = new rx.Subject(); requests.push({ args, result }); return result; };
  component.filterByTechnique('Acuarela');
  component.filterByTechnique('Pastel sobre papel');
  requests[1].result.next({ content: [], page: { number: 0, size: 12, totalElements: 0, totalPages: 0 } });
  requests[0].result.next(page([artwork('obsolete')]));
  assert.deepEqual(component.filteredArtworks, []);
  assert.equal(component.totalElements, 0);
  assert.deepEqual(component.visiblePages, []);
  assert.equal(component.filterError, false);
});

test('choosing a technique cancels the initial in-flight unfiltered request too', () => {
  const requests = [];
  const { component } = setup({}, {}, { catalog: true }, {
    getArtworks: (...args) => {
      const result = new rx.Subject();
      requests.push({ args, result });
      return result;
    }
  });
  assert.equal(component.filtering, true);
  component.filterByTechnique('Acuarela');
  requests[1].result.next(page([artwork('filtered')]));
  requests[0].result.next(page([artwork('obsolete-initial')]));
  assert.equal(component.filteredArtworks[0].slug, 'filtered');
  assert.equal(component.filtering, false);
  assert.equal(requests.length, 2);
});

test('rapid collection changes cancel obsolete technique options before requesting artwork', () => {
  const options = [];
  const { component, paramMap, calls } = setup({ collectionSlug: 'serie' }, {}, {}, {
    getCollections: () => rx.of([collection, { ...collection, slug: 'otra' }]),
    getArtworkTechniques: slug => {
      const result = new rx.Subject();
      options.push({ slug, result });
      return result;
    }
  });
  paramMap.next(params({ collectionSlug: 'otra' }));
  options[1].result.next(['Acuarela']);
  options[0].result.next(['obsolete']);
  assert.deepEqual(component.techniques, ['Acuarela']);
  assert.deepEqual(calls, [['otra', 0, 12]]);
});
