import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asAnon, createTestDatabase } from './support/db.js';
import { seedStore } from './support/fixtures.js';

describe('paged public catalogue', () => {
  let db; let ids;
  beforeAll(async () => {
    db = await createTestDatabase(); ids = await seedStore(db);
    await db.main.query(`insert into public.products(slug,name,category_id,kind,style)
      select 'scale-'||n,'Scale '||lpad(n::text,4,'0'),$1,'watch','Dress' from generate_series(1,530) n`,[ids.catWatches]);
    await db.main.query(`insert into public.product_variants(product_id,sku,size_label,color_name,price_pkr)
      select id,slug,'One size','Silver',100 from public.products where slug like 'scale-%'`);
    await db.main.query(`insert into public.product_images(product_id,bucket,path,approval_status,source_name,licence,is_cover)
      select id,'product-public','products/'||slug||'/v1/a.webp','approved','Fixture','Fixture',true from public.products where slug like 'scale-%'`);
    await db.main.query("update public.products set status='published' where slug like 'scale-%'");
  });
  afterAll(async () => db.close());
  const page = async (query = '', filters = {}, number = 1, size = 24) => (await asAnon(db.main,c => c.query("select public.catalog_page('watches',$1,$2,'featured',$3,$4) as r",[query,filters,number,size]))).rows[0].r;
  it('finds products beyond the old 500 limit and bounds payloads', async () => {
    const result = await page('Scale 0530'); expect(result.slugs).toEqual(['scale-530']); expect(result.total).toBe(1);
    expect((await page('',{},1,10000)).slugs).toHaveLength(48);
    expect((await page('',{},999)).slugs).toEqual([]);
  });
  it('pages deterministically without overlap and reports full facet counts', async () => {
    const first = await page(); const second = await page('',{},2);
    expect(first.total).toBe(531); expect(first.slugs).toHaveLength(24);
    expect(first.slugs.some(slug => second.slugs.includes(slug))).toBe(false);
    expect(first.facets.style.find(item => item.id==='dress').count).toBe(530);
  });
  it('filters before paging and treats wildcard characters as text', async () => {
    const result = await page('', { style:['dress'],priceMax:100 });
    expect(result.total).toBe(530); expect(result.slugs).toHaveLength(24);
    expect((await page('%')).total).toBe(0);
    expect((await page('', { brand:['casio'] })).total).toBe(1);
  });
  it('never exposes drafts or archived products to anonymous browsing', async () => {
    await db.main.query("insert into public.products(slug,name,category_id,kind) values ('private-scale','Private scale',$1,'watch')",[ids.catWatches]);
    expect((await page('Private scale')).total).toBe(0);
    expect((await page('Private scale')).slugs).toEqual([]);
  });
});
