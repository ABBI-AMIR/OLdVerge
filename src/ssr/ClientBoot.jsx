import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App.jsx';
import PublicPage from './PublicPage.jsx';
import { isBackend } from '../lib/config.js';
import { useCatalog } from '../data/catalog.js';
import { useSite } from '../data/site.js';
import { useStore } from '../store.js';
import { PublicSnapshot } from './PublicSnapshot.jsx';
const BootIntro=lazy(()=>import('../components/BrandLoader.jsx'));

export default function ClientBoot({ snapshot }) {
  const [interactive,setInteractive]=useState(!snapshot);
  const [hydrated,setHydrated]=useState(false);
  const ownsIntro=snapshot?.path==='/'&&!snapshot.error;
  useEffect(()=>{setHydrated(true);},[]);
  useEffect(()=>{
    if(!snapshot) return undefined;
    let cancelled=false;
    async function prepare() {
      // Never seed personal data from HTML or mark a partial SSR page as a complete cart catalogue.
      if(isBackend&&snapshot.mode==='supabase') {
        useCatalog.getState().cache(snapshot.products||[]);
        const {cart,directItem}=useStore.getState();
        useCatalog.setState({pinnedSlugs:[...cart,...(directItem?[directItem]:[])].map(line=>line.productId)});
        await Promise.all([useCatalog.getState().load(),useSite.getState().load()]);
      }
    }
    prepare().catch(()=>{ /* BackendGate displays the unavailable state on failure. */ }).finally(()=>{if(!cancelled)setInteractive(true);});
    return ()=>{cancelled=true;};
  },[snapshot]);
  return <>{interactive?<PublicSnapshot.Provider value={snapshot}><BrowserRouter><App /></BrowserRouter></PublicSnapshot.Provider>:<PublicPage snapshot={snapshot} />}
    {hydrated&&ownsIntro?<Suspense fallback={null}><BootIntro readyImages={(snapshot.heroImages||[]).slice(0,3).map(image=>image.src)} contentVersion={interactive?1:0}/></Suspense>:null}</>;
}
