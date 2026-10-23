import { useCatalog } from './data/catalog.js';
import { products as demoProducts } from './data/products.js';

// Ensure fast unit tests have products available synchronously in both demo and backend modes
useCatalog.setState({ status: 'ready', products: demoProducts });
