import { documentationPublicPages } from './docs/pages';
import { homePage, legalPages, pricingPage, type PublicPage } from './public';

export const publicPages: PublicPage[] = [
    homePage,
    pricingPage,
    ...documentationPublicPages,
    ...Object.values(legalPages),
];

export const publicPagePaths = publicPages.map((page) => page.path);
