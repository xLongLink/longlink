import type { IconName } from '@astryxdesign/core/Icon';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Section } from '@astryxdesign/core/Section';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';

const pricingOptions: {
    description: string;
    features: { description: string | null; label: string }[];
    icon: IconName;
    name: string;
    period: string | null;
    price: string;
}[] = [
    {
        name: 'Free',
        icon: 'success',
        price: 'CHF 0',
        period: '/user/month',
        description: 'Designed for small teams getting started with building and running process apps.',
        features: [
            {
                label: 'Deploy any Application',
                description:
                    'Deploy your application or find free open-source applications to start from.\n\nApplications sleep automatically when inactive, and abuse-prevention safeguards help keep the shared platform reliable.',
            },
            { label: '100MB Database Space', description: 'Shared across all apps in the workspace.' },
            { label: '2GB Object Storage Space', description: 'Shared across all apps in the workspace.' },
        ],
    },
    {
        name: 'Team',
        icon: 'info',
        price: 'Coming soon',
        period: null,
        description: 'Run production apps with pricing that scales with the people using the workflow.',
        features: [{ label: 'Coming soon', description: null }],
    },
    {
        name: 'Work',
        icon: 'wrench',
        price: 'Coming soon',
        period: null,
        description: 'Use AI-assisted workflows to build, adapt, and operate process apps faster.',
        features: [{ label: 'Coming soon', description: null }],
    },
];

/** Renders the public pricing page. */
export default function Pricing() {
    return (
        <Stack minHeight="100vh" gap={0}>
            <Navbar />
            <main>
                <Section variant="transparent" padding={6}>
                    <Stack width="100%" maxWidth={1120} gap={10} align="center" style={{ marginInline: 'auto' }}>
                        <Stack gap={3} align="center" maxWidth={640}>
                            <Badge label="Pricing" variant="teal" />
                            <Heading level={1} type="display-2" justify="center" textWrap="balance">
                                Simple workflow, Simple plans
                            </Heading>
                            <Text as="p" type="large" color="secondary" justify="center">
                                Designed to be extended.
                            </Text>
                        </Stack>

                        <Grid columns={{ minWidth: 280, max: 3, repeat: 'fit' }} gap={4} width="100%">
                            {pricingOptions.map((option) => (
                                <Card key={option.name} minHeight={520}>
                                    <Stack gap={6}>
                                        <Stack gap={3} align="center">
                                            <Icon icon={option.icon} color="accent" />
                                            <Heading level={2} justify="center">
                                                {option.name}
                                            </Heading>
                                            <Text as="p" type="supporting" justify="center">
                                                {option.description}
                                            </Text>
                                            <Stack direction="horizontal" gap={2} align="end" justify="center">
                                                <Text type="display-3" weight="semibold">
                                                    {option.price}
                                                </Text>
                                                {option.period ? <Text type="supporting">{option.period}</Text> : null}
                                            </Stack>
                                        </Stack>

                                        {option.name === 'Team' ? (
                                            <Text as="p">Everything included in Free, plus...</Text>
                                        ) : null}
                                        {option.name === 'Work' ? (
                                            <Text as="p">Everything included in Team, plus...</Text>
                                        ) : null}

                                        <List hasDividers>
                                            {option.features.map((feature) => (
                                                <ListItem
                                                    key={feature.label}
                                                    startContent={
                                                        <Icon icon="chevronRight" size="sm" color="secondary" />
                                                    }
                                                    label={<Text weight="semibold">{feature.label}</Text>}
                                                    description={
                                                        feature.description ? (
                                                            <Text type="supporting">
                                                                {feature.description
                                                                    .split('\n\n')
                                                                    .map((paragraph, index) => (
                                                                        <Text key={paragraph} display="block">
                                                                            {index > 0 ? <br /> : null}
                                                                            {paragraph}
                                                                        </Text>
                                                                    ))}
                                                            </Text>
                                                        ) : null
                                                    }
                                                />
                                            ))}
                                        </List>
                                    </Stack>
                                </Card>
                            ))}
                        </Grid>

                        <Text as="p" type="supporting" justify="center">
                            LongLink is currently in beta. Pricing, limits, and included features may change as the
                            platform evolves.
                        </Text>
                    </Stack>
                </Section>
            </main>
            <Footer />
        </Stack>
    );
}
