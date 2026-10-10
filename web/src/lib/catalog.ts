import * as catalog from './catalog-loader';

// Expose validated data to routes; Vite replaces this module with browser-safe serialized data.
export default catalog.loadCatalog();
