/** Displays the same building projects as the gallery in compact rows. */
export default function ProjectTable() {
    // Load project records through the isolated runtime's scoped data API.
    const [projects] = useApi('/api/projects');

    // Align project summaries and owner contacts without wrapping rows in cards.
    return (
        <Stack gap={4} paddingInline={8} paddingBlock={2}>
            <Stack gap={0}>
                <Heading level={1}>Example Table View</Heading>
                <Text color="secondary">This can be used for reviewing projects in a table.</Text>
            </Stack>
            <Table
                data={projects.slice(0, 6)}
                hasHover
                columns={[
                    {
                        key: 'name',
                        header: 'Project',
                        width: proportional(2),
                        renderCell: (project) => (
                            <Stack gap={0}>
                                <Stack direction="horizontal" align="center" gap={2} wrap="wrap">
                                    <Link to={`/projects/${project.id}`}>{project.name}</Link>
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
                                <Text type="supporting">{project.description}</Text>
                            </Stack>
                        ),
                    },
                    {
                        key: 'owner',
                        header: 'Project owner',
                        width: proportional(2),
                        renderCell: (project) => (
                            <Stack direction="horizontal" align="center" gap={2}>
                                <Avatar name={project.owner} size="sm" />
                                <Stack gap={0}>
                                    <Text>{project.owner}</Text>
                                    <Text type="supporting">{project.owner_email}</Text>
                                </Stack>
                            </Stack>
                        ),
                    },
                ]}
            />
        </Stack>
    );
}
