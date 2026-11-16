// Authored metadata shared by the documentation pages.
export const documentationLastUpdated = '2026-10-02';

export const documentationCategories: string[] = [
    'Runtime',
    'Hooks',
    'Layouts',
    'Action',
    'Display',
    'Form',
    'Charts',
    'Others'
];

// Describe the runtime bindings exposed to Views.
export const viewHooks = [
    {
        name: 'useFormContext()',
        description:
            'Reads the nearest FormProvider form methods. Call it in a descendant component to share validation, values, and submission state without passing the form through props.'
    },
    {
        name: 'useTable(options, selector?)',
        description:
            'Creates a TanStack table for DataGrid. Pass data, columns, and dataGridFeatures; the View runtime preserves column behavior while excluding authored header and cell styling.'
    },
    {
        name: 'useForm(options)',
        description:
            'React Hook Form state, validation, reset, and submission. Use Controller with shadcn fields and zodResolver(schema) for Zod validation. FormProvider and useFormContext share a form with Wizard.'
    },
    {
        name: 'useSubmit(path, options)',
        description:
            'Returns an awaitable, duplicate-protected scoped submission function accepting FormData. Options: method (POST by default, PUT, PATCH, DELETE), onSuccess, and onError. Successful writes refresh cached View data before onSuccess. In onError, use form.setError("root", { message }) to show failure and keep isSubmitSuccessful false; unhandled failures reject. React Hook Form owns submitting state. Append files and repeated values explicitly; do not serialize them as JSON.'
    },
    {
        name: 'useConfirm()',
        description:
            'Returns show(options), hide(), isOpen, and element. Render element once. Options: title, optional description and cancelLabel (default Cancel), actionLabel, optional actionVariant (default | destructive; defaults to default), and onAction. Actions may be async; success closes, failure keeps the dialog open for retry. Loading prevents duplicate actions and dismissal. Scoped request errors are reported by the host; other errors appear in the dialog.'
    },
    {
        name: 'useState(initial)',
        description:
            'Returns the current state and a setter. Pass a value or an initializer function; updates can use the previous state.'
    },
    {
        name: 'useEffect(effect, dependencies)',
        description:
            'Synchronizes with external systems after rendering. Return a cleanup function to release timers or subscriptions. Include every reactive value used by the effect in its dependencies.'
    },
    {
        name: 'useMemo(factory, dependencies)',
        description:
            'Caches a calculated value until its dependencies change. Use it for expensive calculations, not required application state.'
    },
    {
        name: 'useRef(initial)',
        description:
            'Returns a stable object with a mutable current property. Changing current does not trigger a render.'
    },
    {
        name: 'useApi(path)',
        description:
            'Returns Solution data and an awaitable invalidator scoped to the full request path. The renderer handles initial loading, errors, and retry.'
    }
];
