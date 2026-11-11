import { lazy, Suspense, useContext } from 'react';
import {useLocation} from 'react-router-dom';
import { isBackend } from '../lib/config.js';
import {PublicSnapshot,samePublicLocation} from '../ssr/PublicSnapshot.jsx';
import {PublicMain} from '../ssr/PublicPage.jsx';
const Browse = lazy(() => isBackend ? import('./BackendBrowse.jsx') : import('./DemoCollectionPage.jsx'));
export default function CollectionPage({ collection }) {
  const snapshot=useContext(PublicSnapshot);
  const location=useLocation();
  return <Suspense fallback={samePublicLocation(snapshot,location)?<PublicMain snapshot={snapshot}/>:<main role="status">Loading products…</main>}><Browse collection={collection} /></Suspense>;
}
