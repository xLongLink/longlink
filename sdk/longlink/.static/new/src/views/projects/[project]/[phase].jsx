/**
 * Displays a construction phase's document checklist within its project.
 * @param {ViewProps} props
 */
export default function Phase({ params }) {
    // Resolve both levels of the nested project route.
    const [project] = useApi(`/api/projects/${params.project}`);
    const [phases] = useApi('/api/phases');
    const phase = phases.find((item) => item.slug === params.phase);

    if (!phase) return <EmptyState title="Phase not found" />;

    // Keep project context visible beside the selected phase's documents.
    return (
        <Stack gap={4} paddingInline={8} paddingBlock={2}>
            <Stack gap={0}>
                <Heading level={1}>{phase.label}</Heading>
                <Text type="supporting">{phase.description}</Text>
            </Stack>
            <Divider />
            <Grid columns={3} collapseBelow={768} gap={8}>
                <GridSpan columns={2}>
                    <Table
                        data={phase.documents}
                        columns={[
                            {
                                key: 'name',
                                header: 'Document',
                                width: proportional(1),
                                renderCell: (document) => (
                                    <CheckboxInput
                                        label={document.name}
                                        size="sm"
                                        value={document.available}
                                        disabled
                                    />
                                ),
                            },
                        ]}
                    />
                </GridSpan>
                <Stack align="start">
                    <Badge
                        label={project.status}
                        variant={
                            project.status === 'Completed'
                                ? 'success'
                                : project.status === 'In progress'
                                  ? 'warning'
                                  : 'neutral'
                        }
                    />
                </Stack>
            </Grid>
        </Stack>
    );
}
