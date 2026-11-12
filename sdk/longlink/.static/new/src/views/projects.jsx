/** Presents the construction portfolio through composed summary, plot, photo, and checklist cards. */
export default function Projects() {
    // Share the persisted portfolio and construction lifecycle with the existing project pages.
    const [projects] = useApi('/api/projects');
    const [phases] = useApi('/api/phases');

    // Derive portfolio statistics from the persisted construction lifecycle.
    const distribution = [
        { status: 'In progress', icon: 'wrench', color: 'accent' },
        { status: 'Planning', icon: 'clock', color: 'neutral' },
        { status: 'Completed', icon: 'success', color: 'success' },
    ].map((entry) => ({
        ...entry,
        projects: projects.filter((project) => project.status === entry.status).length,
    }));
    const activeProjects = projects.filter((project) => project.status === 'In progress');
    const focusedProject = activeProjects[0] ?? projects[0];
    const currentPhase = focusedProject ? phases[focusedProject.active_step] : undefined;
    const spotlight = projects.find((project) => project.status === 'Completed') ?? projects[0];
    const completedSteps = projects.reduce((total, project) => total + project.active_step, 0);
    const totalSteps = projects.length * (phases.length - 1);
    const portfolioProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    const focusedProgress =
        focusedProject && phases.length > 1 ? Math.round((focusedProject.active_step / (phases.length - 1)) * 100) : 0;
    const availableDocuments = currentPhase?.documents.filter((document) => document.available).length ?? 0;

    // Rank current project progress without mutating API records or inventing historical observations.
    const delivery = [...(activeProjects.length > 0 ? activeProjects : projects)]
        .sort((first, second) => second.active_step - first.active_step)
        .slice(0, 5)
        .map((project, index) => ({
            rank: String(index + 1).padStart(2, '0'),
            name: project.name,
            progress: phases.length > 1 ? Math.round((project.active_step / (phases.length - 1)) * 100) : 0,
        }));

    // Align card rows through grid stretching without fixed heights or internal scroll regions.
    return (
        <Stack gap={4} paddingInline={8} paddingBlock={2}>
            <Text as="h1" size="xl" weight="medium">
                Projects
            </Text>
            {projects.length === 0 ? (
                <EmptyState title="No projects yet" />
            ) : (
                <Grid columns={{ minWidth: 420, max: 2 }} gap={2} align="stretch">
                    {spotlight && (
                        <Card
                            href={`/projects/${spotlight.id}`}
                            label={`View ${spotlight.name}`}
                            padding={0}
                            radius="large"
                            variant="subtle"
                            isClipped
                        >
                            <Stack gap={0}>
                                <Image src={`/assets/${spotlight.photo}.jpg`} alt={`${spotlight.name} building`} />
                                <Stack gap={3} padding={5}>
                                    <Stack gap={1}>
                                        <Text as="h2" type="large" weight="medium">
                                            {spotlight.name}
                                        </Text>
                                        <Text type="supporting">
                                            {spotlight.status}
                                            {phases[spotlight.active_step]
                                                ? ` · ${phases[spotlight.active_step].label}`
                                                : ''}
                                        </Text>
                                    </Stack>
                                    <Text as="p">{spotlight.description}</Text>
                                </Stack>
                            </Stack>
                        </Card>
                    )}
                    <Card padding={5} radius="large" variant="subtle">
                        <Stack gap={5}>
                            <Stack gap={1}>
                                <Text as="h2" type="large" weight="medium">
                                    Portfolio overview
                                </Text>
                                <Text type="supporting" hasTabularNumbers>
                                    {projects.length} projects · {phases.length} construction stages
                                </Text>
                            </Stack>
                            <Distribution
                                label="Project status distribution"
                                segments={distribution.map((entry) => ({
                                    label: entry.status,
                                    value: entry.projects,
                                    color: entry.color,
                                }))}
                            />
                            <List label="Project statuses">
                                {distribution.map((entry) => (
                                    <ListItem
                                        key={entry.status}
                                        label={entry.status}
                                        color="secondary"
                                        startContent={
                                            <Icon
                                                icon={entry.icon}
                                                size="sm"
                                                color={entry.color === 'neutral' ? 'secondary' : entry.color}
                                                presentation="tile"
                                            />
                                        }
                                        endContent={
                                            <Text
                                                color={entry.color === 'accent' ? 'accent' : 'secondary'}
                                                hasTabularNumbers
                                            >
                                                {entry.projects} ·{' '}
                                                {((entry.projects / projects.length) * 100).toFixed(1)}%
                                            </Text>
                                        }
                                    />
                                ))}
                            </List>
                            <Text type="supporting">{portfolioProgress}% average lifecycle progress</Text>
                        </Stack>
                    </Card>
                    {focusedProject && currentPhase && (
                        <Card padding={5} radius="large" variant="subtle">
                            <Stack gap={5}>
                                <Stack direction="horizontal" gap={3} align="center">
                                    <Icon icon="building2" color="accent" presentation="tile" size="lg" />
                                    <Stack gap={1}>
                                        <Text as="h2" type="large" weight="medium">
                                            {focusedProject.name}
                                        </Text>
                                        <Text type="supporting">
                                            {focusedProject.status} · {currentPhase.label}
                                        </Text>
                                    </Stack>
                                </Stack>
                                <Grid columns={{ minWidth: 180, max: 2 }} gap={6} align="start">
                                    <Stack gap={4}>
                                        <Grid columns={{ minWidth: 100, max: 2 }} gap={3}>
                                            <Stack gap={1}>
                                                <Text type="large" weight="semibold" hasTabularNumbers>
                                                    {focusedProgress}%
                                                </Text>
                                                <Text type="supporting">Lifecycle progress</Text>
                                            </Stack>
                                            <Stack gap={1}>
                                                <Text type="large" weight="semibold" hasTabularNumbers>
                                                    {availableDocuments}/{currentPhase.documents.length}
                                                </Text>
                                                <Text type="supporting">Examples available</Text>
                                            </Stack>
                                        </Grid>
                                        <ProgressBar
                                            label={`Phase ${focusedProject.active_step + 1} of ${phases.length}`}
                                            value={focusedProject.active_step}
                                            max={phases.length - 1}
                                        />
                                        <Text as="p">{currentPhase.description}</Text>
                                        <Stack direction="horizontal" gap={3} justify="start">
                                            <Button
                                                label="Open current phase"
                                                href={`/projects/${focusedProject.id}/${currentPhase.slug}`}
                                                variant="ghost"
                                                size="sm"
                                            />
                                        </Stack>
                                    </Stack>
                                    <Stack gap={3}>
                                        <Stack gap={1}>
                                            <Text as="h3" type="label">
                                                Phase checklist
                                            </Text>
                                            <Text type="supporting">Illustrative construction documents</Text>
                                        </Stack>
                                        <List label="Illustrative phase checklist" density="compact">
                                            {currentPhase.documents.map((document) => (
                                                <ListItem
                                                    key={document.name}
                                                    label={document.name}
                                                    startContent={
                                                        <Icon
                                                            icon={document.available ? 'check' : 'clock'}
                                                            size="sm"
                                                            color={document.available ? 'success' : 'secondary'}
                                                        />
                                                    }
                                                    endContent={
                                                        <Text color={document.available ? 'primary' : 'secondary'}>
                                                            {document.available ? 'Available' : 'Pending'}
                                                        </Text>
                                                    }
                                                />
                                            ))}
                                        </List>
                                    </Stack>
                                </Grid>
                            </Stack>
                        </Card>
                    )}
                    <Card padding={5} radius="large" variant="subtle">
                        <Stack gap={4}>
                            <Plot
                                label="Project progress"
                                description={
                                    activeProjects.length > 0
                                        ? `Top ${delivery.length} active projects · Lifecycle completion (%)`
                                        : `Top ${delivery.length} projects · Lifecycle completion (%)`
                                }
                                type="line"
                                height={180}
                                data={delivery}
                                xKey="rank"
                                series={[{ key: 'progress', label: 'Lifecycle completion (%)' }]}
                                hasLegend={false}
                            />
                            <List label="Project progress ranking">
                                {delivery.map((project) => (
                                    <ListItem
                                        key={project.rank}
                                        label={project.name}
                                        color="secondary"
                                        startContent={
                                            <Text color="secondary" hasTabularNumbers>
                                                {project.rank}
                                            </Text>
                                        }
                                        endContent={
                                            <Text color="secondary" hasTabularNumbers>
                                                {project.progress}%
                                            </Text>
                                        }
                                    />
                                ))}
                            </List>
                        </Stack>
                    </Card>
                </Grid>
            )}
        </Stack>
    );
}
