import { useCatalog } from './data/catalog.js';
import { products as demoProducts } from './data/products.js';

// Stable sample fixtures for commerce regression tests. Uploaded-catalogue tests
// exercise the actual storefront catalogue explicitly.
useCatalog.setState({ status: 'ready', products: demoProducts });
