import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';

const layers = [
    {
        description: 'Authentication, permissions, deployment, storage, and logging.',
        label: 'Focus on the solution',
        width: '52%',
    },
    {
        description: 'FastAPI, Pydantic, SQLAlchemy, Alembic, and more.',
        label: "Don't reinvent the wheel",
        width: '76%',
    },
    {
        description: 'Git, CI/CD, code editors, package managers, issue trackers, and more.',
        label: 'Use the right tool for the Job',
        width: '100%',
    },
] as const;

/** Renders the practical principles as a card pyramid. */
export function HowSlide() {
    return (
        <Stack align="center" gap={2} maxWidth={640} width="100%">
            {layers.map(({ description, label, width }) => (
                <Card height={120} key={label} variant="muted" width={width}>
                    <Stack align="center" gap={0.5} height="100%" justify="center">
                        <Text justify="center" textWrap="balance" type="large" weight="semibold">
                            {label}
                        </Text>
                        <Text justify="center" textWrap="balance" type="supporting">
                            {description}
                        </Text>
                    </Stack>
                </Card>
            ))}
        </Stack>
    );
}
