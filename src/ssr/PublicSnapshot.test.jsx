import {describe, expect, it} from 'vitest';
import {initialBrowsePage} from './PublicSnapshot.jsx';
import {createRenderer} from '../../server/entry.jsx';
import {buildHeroImages} from '../data/homeHeroImages.js';

describe('stable public first paint',()=>{
  const options={category:null,q:'',filters:{},sort:'featured',page:1,size:24};
  const snapshot={browseOptions:options,products:[{slug:'published'}],total:50};
  it('seeds only the exact public browse page without treating it as a complete catalogue',()=>{
    expect(initialBrowsePage(snapshot,options)).toMatchObject({products:snapshot.products,total:50});
    expect(initialBrowsePage(snapshot,{...options,page:2})).toBeNull();
    expect(initialBrowsePage(snapshot,{...options,q:'other'})).toBeNull();
    expect(initialBrowsePage({...snapshot,error:true},options)).toBeNull();
  });
  it('keeps hero photos discoverable in the initial HTML, with the animated ribbon geometry',async()=>{
    const renderer=createRenderer({config:{mode:'demo'},template:'<html><head><title>Default</title></head><body><div id="root"></div></body></html>'});
    const result=await renderer('/');
    expect(result.html).toContain('class="ov-hero2 is-entered"');
    expect(result.html).toContain('class="tgh-img"');
    expect(result.html).toContain('fetchPriority="high"');
    expect(result.html).toContain('@keyframes');
    expect(result.html).toContain('class="site-header"');
    expect(result.html).not.toContain('visibility:hidden;display:none');
  });
  it('uses smaller derivatives of the two owner ribbon photos without changing image order',()=>{
    const images=buildHeroImages(()=>null);
    expect(images).toHaveLength(2);
    expect(images[0].src).toMatch(/ribbon-folded-burgundy-.*\.webp$/);
    expect(images[1].src).toMatch(/ribbon-four-colours-.*\.webp$/);
    expect(images.every(image=>image.width===960&&image.height>0)).toBe(true);
  });
});
