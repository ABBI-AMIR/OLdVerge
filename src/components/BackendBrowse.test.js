import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
const response = vi.hoisted(() => ({status:'ready',total:700,products:[],facets:{},retry:()=>{}}));
vi.mock('../lib/useCatalogPage.js',()=>({useCatalogPage:()=>response}));
import BackendBrowse, { catalogOptions } from './BackendBrowse.jsx';
import { products } from '../data/products.js';
it('normalizes query bounds and ignores filters outside their collection',()=>{
  const options=catalogOptions(new URLSearchParams('page=-2&brand=Casio&colour=Navy&price_min=200&price_max=100&sort=bad&q='+ 'x'.repeat(100)), 'watches');
  expect(options.page).toBe(1);expect(options.q).toHaveLength(80);expect(options.sort).toBe('featured');
  expect(options.filters).toMatchObject({brand:['casio'],colour:[],priceMin:100,priceMax:200});
});
it('renders one server page with the full count and navigable next/previous links',()=>{
  response.products=Array.from({length:24},(_,i)=>({...products[0],id:'p'+i,slug:'p'+i}));
  const html=renderToString(createElement(MemoryRouter,{initialEntries:['/shop/watches?page=2&brand=casio']},createElement(BackendBrowse,{collection:{key:'watches',heading:'Watches'}})));
  expect(html).toContain('700');expect(html).toContain('Previous');expect(html).toContain('Next');expect(html).toContain('page=3');
  expect((html.match(/class="ov-pc"/g)||[])).toHaveLength(24);
});
