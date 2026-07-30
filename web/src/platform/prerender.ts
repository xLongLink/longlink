import { documentationPublicPages } from './docs/pages';
import { homePage, legalPages, pricingPage } from './public';

export const publicPagePaths = [homePage, pricingPage, ...documentationPublicPages, ...Object.values(legalPages)].map(
    ({ path }) => path
);
