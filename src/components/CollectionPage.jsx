import { lazy, Suspense } from 'react';
import { isBackend } from '../lib/config.js';
const Browse = lazy(() => isBackend ? import('./BackendBrowse.jsx') : import('./DemoCollectionPage.jsx'));
export default function CollectionPage({ collection }) {
  return <Suspense fallback={<main role="status">Loading products…</main>}><Browse collection={collection} /></Suspense>;
}
