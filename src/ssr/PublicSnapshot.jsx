import {createContext} from 'react';
export const PublicSnapshot = createContext(null);
export function samePublicLocation(snapshot, location) {
  if(!snapshot||snapshot.error||snapshot.path!==location.pathname)return false;
  const keys=['q','brand','style','colour','size','sort','price_min','price_max','page'];
  const effective=search=>[...new URLSearchParams(search)].filter(([key])=>keys.includes(key)).map(pair=>JSON.stringify(pair)).sort().join('|');
  return effective(snapshot.search||'')===effective(location.search||'');
}

// Only the exact original browse inputs can use its public SSR page. Never
// reuse it after a different search/filter, or treat it as a complete cart cache.
export function initialBrowsePage(snapshot, options) {
  return snapshot&&!snapshot.error&&snapshot.browseOptions
    && JSON.stringify(snapshot.browseOptions)===JSON.stringify(options)
    ? {products:snapshot.products,total:snapshot.total,facets:snapshot.facets,price:snapshot.price} : null;
}
