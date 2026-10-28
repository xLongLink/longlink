import { z } from 'zod';
import { resolveRequestUrl } from '@/lib/url';

/** Returns whether a manifest route is a normalized supported React Router path. */
function isRoute(route: string): boolean {
    if (!route.startsWith('/')) return false;

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

const runtimeSchema = z.object({
    version: z.string().regex(/^[a-f0-9]{64}$/),
});

export type ViewRuntime = z.infer<typeof runtimeSchema>;

const viewSchema = z.object({
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
        }, 'View path must be solution-relative'),
    route: z.string().trim().min(1).refine(isRoute, 'Route must be a normalized solution path'),
});

export const viewsSchema = z.array(viewSchema).superRefine((views, context) => {
    const routes = new Set<string>();

    for (const [index, view] of views.entries()) {
        const routeKey = view.route
            .split('/')
            .map((segment) => (segment.startsWith(':') ? ':' : segment.toLowerCase()))
            .join('/');

        // Require each route to resolve one unambiguous View.
        if (routes.has(routeKey)) {
            context.addIssue({ code: 'custom', message: 'Routes must be unique', path: [index, 'route'] });
        }

        routes.add(routeKey);
    }
});

// Explicit navigation is optional so older catalogs retain automatic top-level tabs.
const tabSchema = z.object({
    route: z.string().refine((route) => isRoute(route) && route !== '/' && !route.includes('/:')),
    label: z.string().trim().min(1).optional(),
    icon: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .optional(),
});

// Require one pinned Solution-wide runtime and valid navigation targets for the complete catalog.
export const manifestSchema = z
    .object({ views: viewsSchema, runtime: runtimeSchema, tabs: z.array(tabSchema).optional() })
    .superRefine((manifest, context) => {
        const routes = new Set(manifest.views.map((view) => view.route));
        const tabs = new Set<string>();

        // Explicit tabs must reference unique routes from the full View catalog.
        for (const [index, tab] of (manifest.tabs ?? []).entries()) {
            if (!routes.has(tab.route) || tabs.has(tab.route)) {
                context.addIssue({
                    code: 'custom',
                    message: 'Tabs must reference unique Views',
                    path: ['tabs', index, 'route'],
                });
            }

            tabs.add(tab.route);
        }
    });
