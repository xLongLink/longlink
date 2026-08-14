import type { MetaFunction } from 'react-router';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { Building2, UserRound, UsersRound } from 'lucide-react';
import { Collapsible, CollapsibleGroup } from '@astryxdesign/core/Collapsible';
import { publicSeoMeta } from '@/lib/seo';
import { PublicPage } from '@/layout/PublicPage';
import { metadata } from './Pricing.metadata';

export { metadata } from './Pricing.metadata';

export const meta: MetaFunction = () => publicSeoMeta(metadata);

/** Renders the public pricing page. */
export default function Pricing() {
    return (
        <PublicPage>
            <main>
                <Section variant="transparent" padding={6}>
                    <Stack className="mx-auto" width="100%" maxWidth={1120} gap={10} align="center">
                        <Grid className="pt-8" columns={{ minWidth: 280, max: 3, repeat: 'fit' }} gap={6} width="100%">
                            <Card minHeight={640}>
                                <Stack gap={4}>
                                    <Stack className="pt-12" gap={2} align="center">
                                        <UserRound aria-hidden="true" className="text-accent" size={20} />
                                        <Stack gap={2} align="center">
                                            <Heading level={2} justify="center">
                                                Free
                                            </Heading>
                                            <Text as="p" className="px-6" type="supporting" justify="center">
                                                The basics for individuals
                                                <br />
                                                and organizations.
                                            </Text>
                                        </Stack>
                                    </Stack>

                                    <Stack className="px-4 pt-12" direction="horizontal" gap={2} align="end">
                                        <Text hasCapsize type="display-3" weight="semibold">
                                            CHF 0
                                        </Text>
                                        <Text hasCapsize type="supporting">
                                            /user/month
                                        </Text>
                                    </Stack>

                                    <CollapsibleGroup className="px-4" density="balanced" hasDividers type="multiple">
                                        <Collapsible
                                            trigger={
                                                <Text className="text-secondary" color="secondary" type="supporting">
                                                    Deploy any Application
                                                </Text>
                                            }
                                            value="deploy-any-application"
                                        >
                                            <Text className="text-secondary" color="secondary" type="supporting">
                                                Deploy your application or find free open-source applications to start
                                                from.
                                                <br />
                                                <br />
                                                Applications sleep automatically when inactive, and abuse-prevention
                                                safeguards help keep the shared platform reliable.
                                            </Text>
                                        </Collapsible>
                                        <Collapsible
                                            trigger={
                                                <Text className="text-secondary" color="secondary" type="supporting">
                                                    100MB Database Space
                                                </Text>
                                            }
                                            value="database-space"
                                        >
                                            <Text className="text-secondary" color="secondary" type="supporting">
                                                Shared across all apps in the workspace.
                                            </Text>
                                        </Collapsible>
                                        <Collapsible
                                            trigger={
                                                <Text className="text-secondary" color="secondary" type="supporting">
                                                    2GB Object Storage Space
                                                </Text>
                                            }
                                            value="object-storage-space"
                                        >
                                            <Text className="text-secondary" color="secondary" type="supporting">
                                                Shared across all apps in the workspace.
                                            </Text>
                                        </Collapsible>
                                    </CollapsibleGroup>
                                </Stack>
                            </Card>
                            <Card minHeight={640}>
                                <Stack gap={4}>
                                    <Stack className="pt-12" gap={2} align="center">
                                        <UsersRound aria-hidden="true" className="text-accent" size={20} />
                                        <Stack gap={2} align="center">
                                            <Heading level={2} justify="center">
                                                Team
                                            </Heading>
                                            <Text as="p" className="px-6" type="supporting" justify="center">
                                                Advanced collaboration for
                                                <br />
                                                individuals and organizations.
                                            </Text>
                                        </Stack>
                                    </Stack>

                                    <Stack className="px-4 pt-12" direction="horizontal" gap={2} align="end">
                                        <Text hasCapsize type="display-3" weight="semibold">
                                            Coming soon
                                        </Text>
                                    </Stack>
                                </Stack>
                            </Card>
                            <Card minHeight={640}>
                                <Stack gap={4}>
                                    <Stack className="pt-12" gap={2} align="center">
                                        <Building2 aria-hidden="true" className="text-accent" size={20} />
                                        <Stack gap={2} align="center">
                                            <Heading level={2} justify="center">
                                                Work
                                            </Heading>
                                            <Text as="p" className="px-6" type="supporting" justify="center">
                                                Advanced controls
                                                <br />
                                                for organizations.
                                            </Text>
                                        </Stack>
                                    </Stack>

                                    <Stack className="px-4 pt-12" direction="horizontal" gap={2} align="end">
                                        <Text hasCapsize type="display-3" weight="semibold">
                                            Coming soon
                                        </Text>
                                    </Stack>
                                </Stack>
                            </Card>
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
