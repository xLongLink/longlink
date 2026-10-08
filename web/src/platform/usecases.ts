// Keep showcase routes and public page metadata in a build-safe catalog.
export const useCasePages = [
    {
        path: '/use-cases/real-estate/property-acquisition-screening',
        module: './routes/usecases/Screening.tsx',
        label: 'Property Acquisition Screening',
    },
] as const;

export const useCasePaths: string[] = ['/use-cases', ...useCasePages.map(({ path }) => path)];
