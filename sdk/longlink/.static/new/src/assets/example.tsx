type Project = {
    name: string;
    budget: number;
    approved: boolean;
};

export default function ProjectSummary({ project }: { project: Project }) {
    return (
        <Stack gap={2}>
            <Heading level={2}>{project.name}</Heading>
            <Text>{project.approved ? 'Approved' : 'Awaiting approval'}</Text>
            <Text>Budget: {project.budget.toLocaleString()}</Text>
        </Stack>
    );
}
