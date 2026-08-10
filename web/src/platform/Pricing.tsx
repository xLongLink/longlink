import { Card } from '@astryxdesign/core/Card';
import { Collapsible, CollapsibleGroup } from '@astryxdesign/core/Collapsible';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import type { MetaFunction } from 'react-router';
import { PublicPage } from '@/layout/PublicPage';
import { publicSeoMeta } from '@/lib/seo';
import { pricingPage } from '@/platform/public';

export const meta: MetaFunction = () => publicSeoMeta(pricingPage);

const pricingOptions = [
    {
        name: 'Free',
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
        price: 'Coming soon',
        period: null,
        description: 'Run production apps with pricing that scales with the people using the workflow.',
        features: [{ label: 'Coming soon', description: 'Details will be announced soon.' }],
    },
    {
        name: 'Work',
        price: 'Coming soon',
        period: null,
        description: 'Use AI-assisted workflows to build, adapt, and operate process apps faster.',
        features: [{ label: 'Coming soon', description: 'Details will be announced soon.' }],
    },
];

/** Renders the public pricing page. */
export default function Pricing() {
    return (
        <PublicPage>
            <main>
                <Section variant="transparent" padding={6}>
                    <Stack className="mx-auto" width="100%" maxWidth={1120} gap={10} align="center">
                        <Grid className="pt-6" columns={{ minWidth: 280, max: 3, repeat: 'fit' }} gap={6} width="100%">
                            {pricingOptions.map(({ description, features, name, period, price }) => {
                                return (
                                    <Card key={name}>
                                        <Stack gap={4}>
                                            <Stack gap={3} align="center">
                                                <Heading level={2} justify="center">
                                                    {name}
                                                </Heading>
                                                <Text as="p" type="supporting" justify="center">
                                                    {description}
                                                </Text>
                                                <Stack direction="horizontal" gap={2} align="end" justify="center">
                                                    <Text type="display-3" weight="semibold">
                                                        {price}
                                                    </Text>
                                                    {period ? <Text type="supporting">{period}</Text> : null}
                                                </Stack>
                                            </Stack>

                                            {name === 'Team' ? (
                                                <Text as="p" type="supporting">
                                                    Everything included in Free, plus...
                                                </Text>
                                            ) : null}
                                            {name === 'Work' ? (
                                                <Text as="p" type="supporting">
                                                    Everything included in Team, plus...
                                                </Text>
                                            ) : null}

                                            <CollapsibleGroup hasDividers type="multiple" density="compact">
                                                {features.map((feature) => (
                                                    <Collapsible
                                                        key={feature.label}
                                                        trigger={feature.label}
                                                        value={feature.label}
                                                    >
                                                        {feature.description ? (
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
                                                        ) : null}
                                                    </Collapsible>
                                                ))}
                                            </CollapsibleGroup>
                                        </Stack>
                                    </Card>
                                );
                            })}
                        </Grid>

                        <Text as="p" type="supporting" justify="center">
                            LongLink is currently in beta. Pricing, limits, and included features may change as the
                            platform evolves.
                        </Text>
                    </Stack>
                </Section>
            </main>
        </PublicPage>
    );
}
