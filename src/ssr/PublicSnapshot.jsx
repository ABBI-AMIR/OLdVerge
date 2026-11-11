import {createContext} from 'react';
export const PublicSnapshot = createContext(null);

// Only the exact original browse inputs can use its public SSR page. Never
// reuse it after a different search/filter, or treat it as a complete cart cache.
export function initialBrowsePage(snapshot, options) {
  return snapshot&&!snapshot.error&&snapshot.browseOptions
    && JSON.stringify(snapshot.browseOptions)===JSON.stringify(options)
    ? {products:snapshot.products,total:snapshot.total,facets:snapshot.facets,price:snapshot.price} : null;
}
