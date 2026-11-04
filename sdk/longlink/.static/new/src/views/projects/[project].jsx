/**
 * Opens a building project's construction phases.
 * @param {ViewProps} props
 */
export default function Project({ params }) {
    // Load the project state and construction phases.
    const [project] = useApi(`/api/projects/${params.project}`);
    const [phases] = useApi('/api/phases');

    // Keep project context visible beside its construction progress.
    return (
        <Stack gap={4} paddingInline={8} paddingBlock={2}>
            <Stack direction="horizontal" align="center" gap={2}>
                <Stack width="var(--size-element-lg)">
                    <Image src={`/api/demo/photos/${project.photo}`} alt={`${project.name} building`} />
                </Stack>
                <Stack gap={0}>
                    <Heading level={1}>{project.name}</Heading>
                    <Text type="supporting">{project.description}</Text>
                </Stack>
            </Stack>
            <Divider />
            <Grid columns={3} collapseBelow={768} gap={8}>
                <GridSpan columns={2}>
                    <Stepper
                        activeStep={project.active_step}
                        onStepClick={(index) =>
                            navigate(
                                `/projects/${project.id}/${phases[index].label.toLowerCase().replaceAll(' ', '-')}`
                            )
                        }
                        orientation="vertical"
                    >
                        {phases.map((step, index) => (
                            <Step key={step.label} step={index} label={step.label} description={step.description} />
                        ))}
                    </Stepper>
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
