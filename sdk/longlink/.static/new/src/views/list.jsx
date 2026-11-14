/** Presents the shared model catalog as a table with model details. */
export default function List() {
    // Keep model data identical across discovery and CSV export.
    const [models] = useApi('/assets/models.json');

    return (
        <Stack padding={4}>
            <CatalogDirectory models={models} exportPath="/api/models/export" />
        </Stack>
    );
}
