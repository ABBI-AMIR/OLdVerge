import { useParams } from 'react-router-dom';
import { collectionForCategory } from '../data/collections.js';
import CollectionPage from '../components/CollectionPage.jsx';
import NotFoundPage from './NotFoundPage.jsx';
export default function ShopPage() {
  const { category } = useParams();
  const collection = collectionForCategory(category);
  return collection ? <CollectionPage collection={collection} /> : <NotFoundPage what="collection" />;
}
