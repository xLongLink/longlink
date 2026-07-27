export type PublicPage = {
    path: string;
    title: string;
    description: string;
    seoTitle?: string;
};

export const SITE_URL = 'https://longlink.dev';

export const homePage: PublicPage = {
    path: '/',
    title: 'LongLink',
    seoTitle: 'LongLink | Python Platform for Business Applications',
    description:
        'LongLink is an open-source platform for building and running custom business-process applications with Python.',
};

export const pricingPage: PublicPage = {
    path: '/pricing',
    title: 'Pricing',
    description: 'Simple LongLink pricing for building and running business-process applications.',
};

export const legalPages = {
    terms: {
        path: '/terms',
        title: 'Terms of Service',
        description: 'Read the LongLink terms of service.',
    },
    privacy: {
        path: '/privacy',
        title: 'Privacy',
        description: 'Read the LongLink privacy policy.',
    },
    impressum: {
        path: '/impressum',
        title: 'Impressum',
        description: 'Read the LongLink legal notice and company information.',
    },
} satisfies Record<string, PublicPage>;

/** Returns the canonical document path served by FastAPI. */
export function publicRoutePath(routePath: string): string {
    return routePath === '/' ? '/' : `${routePath}/`;
}
