import { Card } from '@astryxdesign/core/Card';
import { Collapsible, CollapsibleGroup } from '@astryxdesign/core/Collapsible';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Building2, UserRound, UsersRound } from 'lucide-react';
import type { MetaFunction } from 'react-router';
import { PublicPage } from '@/layout/PublicPage';
import { publicSeoMeta } from '@/lib/seo';
import { pricingPage } from '@/platform/public';

export const meta: MetaFunction = () => publicSeoMeta(pricingPage);

/** Renders the public pricing page. */
export default function Pricing() {
    return (
        <PublicPage>
            <main>
                <Section variant="transparent" padding={6}>
                    <Stack className="mx-auto" width="100%" maxWidth={1120} gap={10} align="center">
                        <Grid className="pt-8" columns={{ minWidth: 280, max: 3, repeat: 'fit' }} gap={6} width="100%">
                            {[
                                {
                                    name: 'Free',
                                    icon: UserRound,
                                    price: 'CHF 0',
                                    period: '/user/month',
                                    description: (
                                        <>
                                            The basics for individuals
                                            <br />
                                            and organizations.
                                        </>
                                    ),
                                    features: [
                                        {
                                            label: 'Deploy any Application',
                                            description:
                                                'Deploy your application or find free open-source applications to start from.\n\nApplications sleep automatically when inactive, and abuse-prevention safeguards help keep the shared platform reliable.',
                                        },
                                        {
                                            label: '100MB Database Space',
                                            description: 'Shared across all apps in the workspace.',
                                        },
                                        {
                                            label: '2GB Object Storage Space',
                                            description: 'Shared across all apps in the workspace.',
                                        },
                                    ],
                                },
                                {
                                    name: 'Team',
                                    icon: UsersRound,
                                    price: 'Coming soon',
                                    period: null,
                                    description: (
                                        <>
                                            Advanced collaboration for
                                            <br />
                                            individuals and organizations.
                                        </>
                                    ),
                                    features: [],
                                },
                                {
                                    name: 'Work',
                                    icon: Building2,
                                    price: 'Coming soon',
                                    period: null,
                                    description: (
                                        <>
                                            Advanced controls
                                            <br />
                                            for organizations.
                                        </>
                                    ),
                                    features: [],
                                },
                            ].map(({ description, features, icon: Icon, name, period, price }) => {
                                return (
                                    <Card key={name} minHeight={640}>
                                        <Stack gap={4}>
                                            <Stack className="pt-12" gap={2} align="center">
                                                <Icon aria-hidden="true" className="text-accent" size={20} />
                                                <Stack gap={name === 'Work' ? 0 : 2} align="center">
                                                    <Heading level={2} justify="center">
                                                        {name}
                                                    </Heading>
                                                    <Text as="p" className="px-6" type="supporting" justify="center">
                                                        {description}
                                                    </Text>
                                                </Stack>
                                            </Stack>

                                            <Stack className="px-4 pt-12" direction="horizontal" gap={2} align="end">
                                                <Text hasCapsize type="display-3" weight="semibold">
                                                    {price}
                                                </Text>
                                                {period ? (
                                                    <Text hasCapsize type="supporting">
                                                        {period}
                                                    </Text>
                                                ) : null}
                                            </Stack>

                                            {features.length > 0 ? (
                                                <CollapsibleGroup
                                                    className="px-4"
                                                    hasDividers
                                                    type="multiple"
                                                    density="balanced"
                                                >
                                                    {features.map((feature) => (
                                                        <Collapsible
                                                            key={feature.label}
                                                            trigger={<Text type="supporting">{feature.label}</Text>}
                                                            value={feature.label}
                                                        >
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
                                                        </Collapsible>
                                                    ))}
                                                </CollapsibleGroup>
                                            ) : null}
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
