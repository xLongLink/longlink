import { pageReferenceDocs } from './docs/sdk/references';
import { documentationPages, homePage, legalPages, pageElementPage, pricingPage, type PublicPage } from './public';

export const publicPages: PublicPage[] = [
    homePage,
    pricingPage,
    ...Object.values(documentationPages),
    ...pageReferenceDocs.map(pageElementPage),
    ...Object.values(legalPages),
];

export const publicPagePaths = publicPages.map((page) => page.path);
