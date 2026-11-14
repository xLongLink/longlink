/** Displays the landing-page building projects as an interactive gallery. */
export default function Projects() {
    // Load the same records used by the project table.
    const [projects] = useApi('/api/projects');

    // Keep project photos, state, and descriptions visible before opening their phases.
    return (
        <Stack gap={4} paddingInline={8} paddingBlock={2}>
            <Stack gap={0}>
                <Heading level={1}>Projects</Heading>
                <Text className="text-muted-foreground">This can be used for tracking projects in a gallery.</Text>
            </Stack>
            <Grid columns={{ minWidth: 240, max: 3 }} gap={4} align="stretch">
                {projects.slice(0, 6).map((project) => (
                    <InteractiveCard key={project.id} href={`/projects/${project.id}`} label={project.name}>
                        <CardContent>
                            <Stack gap={3}>
                                <Image
                                    src={`/assets/${project.photo}.jpg`}
                                    alt={`${project.name} building`}
                                    ratio={16 / 9}
                                />
                                <Stack gap={2} align="start">
                                    <Text as="h2" maxLines={1} className="text-sm font-medium">
                                        {project.name}
                                    </Text>
                                    <Badge
                                        variant={
                                            project.status === 'Completed'
                                                ? 'success-light'
                                                : project.status === 'In progress'
                                                  ? 'warning-light'
                                                  : 'secondary'
                                        }
                                    >
                                        {project.status}
                                    </Badge>
                                </Stack>
                                <Text maxLines={2} className="text-xs text-muted-foreground">
                                    {project.description}
                                </Text>
                            </Stack>
                        </CardContent>
                    </InteractiveCard>
                ))}
            </Grid>
            {projects.length === 0 && (
                <Empty>
                    <EmptyHeader>
                        <EmptyTitle>No projects yet</EmptyTitle>
                    </EmptyHeader>
                </Empty>
            )}
        </Stack>
    );
}
