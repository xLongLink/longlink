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
                <Stack width="calc(var(--spacing)*9)">
                    <Image src={`/assets/${project.photo}.jpg`} alt={`${project.name} building`} ratio={16 / 9} />
                </Stack>
                <Stack gap={0}>
                    <Heading level={1}>{project.name}</Heading>
                    <Text className="text-xs text-muted-foreground">{project.description}</Text>
                </Stack>
            </Stack>
            <Separator />
            <Grid columns={3} collapseBelow={768} gap={8}>
                <GridSpan columns={2}>
                    <Stepper
                        value={project.active_step + 1}
                        onValueChange={(value) => navigate(`/projects/${project.id}/${phases[value - 1].slug}`)}
                        orientation="vertical"
                        role="group"
                        aria-orientation={undefined}
                    >
                        <StepperNav aria-label="Progress">
                            {phases.map((step, index) => (
                                <StepperItem
                                    key={step.label}
                                    step={index + 1}
                                    aria-current={index === project.active_step ? 'step' : undefined}
                                >
                                    <StepperTrigger
                                        role="button"
                                        aria-selected={undefined}
                                        aria-controls={undefined}
                                        tabIndex={0}
                                    >
                                        <StepperIndicator aria-hidden="true">{index + 1}</StepperIndicator>
                                        <span className="flex min-w-0 flex-col gap-1">
                                            <StepperTitle>{step.label}</StepperTitle>
                                            {step.description && (
                                                <StepperDescription>{step.description}</StepperDescription>
                                            )}
                                            {index < project.active_step && <span className="sr-only">completed</span>}
                                        </span>
                                    </StepperTrigger>
                                    {index < phases.length - 1 && <StepperSeparator />}
                                </StepperItem>
                            ))}
                        </StepperNav>
                    </Stepper>
                </GridSpan>
                <Stack align="start">
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
            </Grid>
        </Stack>
    );
}
