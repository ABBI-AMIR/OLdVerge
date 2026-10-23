import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const client = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('../lib/config.js', () => ({ isBackend: true, backend: { url: 'https://project.test' } }));
vi.mock('../lib/supabase.js', () => ({ supabase: client }));
vi.resetModules();
const { CACHE_LIMIT, fetchCatalogPage, fetchProducts, mapRows, mergeProducts, useCatalog } = await import('./catalog.js');
const { useSite, orderingOpen } = await import('./site.js');
const product = slug => ({ id: slug, slug, images: [] });
const row = slug => ({ id: slug, slug, name: slug, kind: 'watch', category: { slug: 'watches' }, product_variants: [], product_images: [] });
const query = result => {
  const builder = {};
  for (const method of ['select','eq','order','not']) builder[method] = () => builder;
  builder.in = vi.fn(async (_field, slugs) => ({ data: slugs.map(row) }));
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return builder;
};
beforeEach(() => {
  client.rpc.mockReset().mockResolvedValue({ data: { slugs: ['first'], total: 1, facets: {} } });
  client.from.mockReset().mockImplementation(() => query({ data: [] }));
  useCatalog.setState({ status: 'idle', products: [], loadedAt: 0, pinnedSlugs: [], activeSlug: null, refreshError: null });
  useSite.setState({ status: 'idle', loadedAt: 0, refreshError: null });
});
afterEach(() => vi.useRealTimers());
describe('catalogue scaling and refresh', () => {
  it('preserves server page order and sends bounded search parameters', async () => {
    client.rpc.mockResolvedValueOnce({ data: { slugs: ['b','a'], total: 700, facets: {} } });
    const result = await fetchCatalogPage({ q: 'watch', page: 22 });
    expect(result.products.map(p => p.slug)).toEqual(['b','a']); expect(result.total).toBe(700);
    expect(client.rpc).toHaveBeenCalledWith('catalog_page', expect.objectContaining({ p_query: 'watch', p_page: 22, p_size: 24 }));
  });
  it('batches product hydration and bounds concurrent advisory availability calls', async () => {
    const builders = [];
    client.from.mockImplementation(() => { const b = query(); builders.push(b); return b; });
    expect(await fetchProducts(Array.from({length:110},(_,i) => 'p'+i))).toHaveLength(110);
    expect(builders.map(b => b.in.mock.calls[0][1].length)).toEqual([48,48,14]);
    let active = 0; let maximum = 0;
    const rpc = vi.fn(async () => { active++; maximum=Math.max(maximum,active); await new Promise(resolve => setTimeout(resolve,1)); active--; return { data: [] }; });
    await mapRows([{ ...row('many'), product_variants: Array.from({length:1001},(_,id) => ({id,size_label:'M',price_pkr:100})) }],{rpc});
    expect(rpc).toHaveBeenCalledTimes(6); expect(maximum).toBe(3);
    expect(rpc.mock.calls.every(([,args]) => args.p_variant_ids.length<=200)).toBe(true);
  });
  it('bounds the product cache while protecting cart items and replacing stale entries', () => {
    const initial = Array.from({length:CACHE_LIMIT},(_,i) => product('p'+i));
    const merged = mergeProducts(initial,[product('new'),{...product('p1'),price:200}],['p0']);
    expect(merged).toHaveLength(CACHE_LIMIT); expect(merged.some(p=>p.slug==='p0')).toBe(true);
    expect(merged.find(p=>p.slug==='p1').price).toBe(200); expect(merged.some(p=>p.slug==='new')).toBe(true);
  });
  it('deduplicates loads, respects freshness, and retains real data on refresh failure', async () => {
    await Promise.all([useCatalog.getState().load(),useCatalog.getState().load()]);
    expect(client.rpc).toHaveBeenCalledTimes(1);
    await useCatalog.getState().load(); expect(client.rpc).toHaveBeenCalledTimes(1);
    const products = useCatalog.getState().products;
    client.rpc.mockResolvedValueOnce({error:{message:'offline'}});
    await useCatalog.getState().load({force:true});
    expect(useCatalog.getState()).toMatchObject({status:'ready',refreshError:'offline',refreshing:false});
    expect(useCatalog.getState().products).toBe(products);
  });
  it('does not replace cold failures with demo data and hydrates cart products outside page one', async () => {
    client.rpc.mockResolvedValueOnce({error:{message:'offline'}}); await useCatalog.getState().load();
    expect(useCatalog.getState()).toMatchObject({status:'error',products:[]});
    useCatalog.setState({pinnedSlugs:['cart-item']}); await useCatalog.getState().load({force:true});
    expect(useCatalog.getState().products.map(p=>p.slug)).toEqual(['first','cart-item']);
  });
  it('preserves products hydrated while a refresh is in flight', async () => {
    useCatalog.setState({status:'ready',products:[product('old')],loadedAt:0});
    let resolve;
    client.rpc.mockImplementationOnce(() => new Promise(done => { resolve=done; }));
    const refreshing = useCatalog.getState().load({force:true});
    useCatalog.getState().cache([product('new-during-refresh')]);
    resolve({data:{slugs:['first'],total:1,facets:{}}}); await refreshing;
    expect(useCatalog.getState().products.some(p=>p.slug==='new-during-refresh')).toBe(true);
  });
  it('retains public settings during failed refresh but closes checkout until recovery', async () => {
    useSite.setState({status:'ready',loadedAt:0,settings:{ordering_enabled:true}});
    client.from.mockImplementation(() => query({error:{message:'offline'}}));
    await useSite.getState().load({force:true});
    expect(useSite.getState().status).toBe('ready'); expect(orderingOpen()).toBe(false);
    client.from.mockImplementation(() => query({data:[]})); await useSite.getState().load({force:true});
    expect(useSite.getState().refreshError).toBeNull();
  });
});
