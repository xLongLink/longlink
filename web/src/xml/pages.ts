import { z } from 'zod';
import { resolveRequestUrl } from '@/xml/core/url';

/** Returns whether a manifest route is a normalized supported React Router path. */
function isRoute(route: string): boolean {
    if (
        !route.startsWith('/') ||
        route.includes('%') ||
        route.includes('\\') ||
        route.includes('?') ||
        route.includes('#')
    )
        return false;
    if (route === '/') return true;

    return route
        .slice(1)
        .split('/')
        .every((segment) => {
            if (!segment || segment === '.' || segment === '..') return false;
            if (segment.startsWith(':')) return /^[A-Za-z_][A-Za-z0-9_]*$/.test(segment.slice(1));

            return /^[A-Za-z0-9._~-]+$/.test(segment);
        });
}

const pageSchema = z.object({
    tab: z.string().trim().min(1),
    path: z
        .string()
        .trim()
        .min(1)
        .refine((path) => {
            try {
                resolveRequestUrl('/', path);
                return true;
            } catch {
                return false;
            }
        }, 'Page path must be app-relative'),
    name: z.string().trim().min(1).optional(),
    icon: z.string().trim().min(1).optional(),
    route: z.string().trim().min(1).refine(isRoute, 'Route must be a normalized application path'),
});

export const pagesSchema = z.array(pageSchema).superRefine((pages, context) => {
    const routes = new Set<string>();
    const staticTabs = new Set<string>();

    for (const [index, page] of pages.entries()) {
        // Require each route to resolve one unambiguous application page.
        if (routes.has(page.route)) {
            context.addIssue({ code: 'custom', message: 'Routes must be unique', path: [index, 'route'] });
        }
        routes.add(page.route);

        // Dynamic detail routes may share the navigation tab of their static list page.
        const isDynamicRoute = page.route.includes('/:');
        if (!isDynamicRoute && staticTabs.has(page.tab)) {
            context.addIssue({ code: 'custom', message: 'Static page tabs must be unique', path: [index, 'tab'] });
        }
        if (!isDynamicRoute) staticTabs.add(page.tab);
    }
});
