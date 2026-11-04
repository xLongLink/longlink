// Authored metadata shared by the documentation pages.
export const documentationLastUpdated = '2026-10-02';

export const documentationCategories: string[] = ['Runtime', 'Action', 'Display', 'Form', 'Layouts'];

// Describe the runtime bindings exposed to Views.
export const viewHooks = [
    {
        name: 'useState(initial)',
        description:
            'Returns the current state and a setter. Pass a value or an initializer function; updates can use the previous state.',
    },
    {
        name: 'useEffect(effect, dependencies)',
        description:
            'Synchronizes with external systems after rendering. Return a cleanup function to release timers or subscriptions. Include every reactive value used by the effect in its dependencies.',
    },
    {
        name: 'useMemo(factory, dependencies)',
        description:
            'Caches a calculated value until its dependencies change. Use it for expensive calculations, not required application state.',
    },
    {
        name: 'useRef(initial)',
        description:
            'Returns a stable object with a mutable current property. Changing current does not trigger a render.',
    },
    {
        name: 'useApi(path)',
        description:
            'Returns Solution data and an awaitable invalidator scoped to the full request path. The renderer handles initial loading, errors, and retry.',
    },
];
