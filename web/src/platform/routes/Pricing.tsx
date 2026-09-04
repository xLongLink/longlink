import { Seo } from '@/components/Seo';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { Building2, UserRound, UsersRound } from 'lucide-react';

/** Renders the public pricing page. */
export default function Pricing() {
    return (
        <>
            <Seo
                description="Explore LongLink plans for building and deploying dedicated business software."
                title="Pricing | LongLink"
            />
            <main>
                <Section variant="transparent" padding={6}>
                    <Stack className="mx-auto" width="100%" maxWidth={1120} gap={10} align="center">
                        <Grid className="pt-8" columns={{ minWidth: 280, max: 3, repeat: 'fit' }} gap={0} width="100%">
                            <Card className="-mb-px -mr-px rounded-none bg-transparent" minHeight={640}>
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

                                    <Stack
                                        className="pt-12"
                                        paddingInline={4}
                                        direction="horizontal"
                                        gap={2}
                                        align="end"
                                    >
                                        <Text hasCapsize type="display-3" weight="semibold">
                                            CHF 0
                                        </Text>
                                        <Text hasCapsize type="supporting">
                                            /user/month
                                        </Text>
                                    </Stack>

                                    <Stack className="px-4" gap={3}>
                                        <Text type="supporting">Deploy any Solution</Text>
                                        <Divider />
                                        <Text type="supporting">100MB Database Space</Text>
                                        <Divider />
                                        <Text type="supporting">2GB Object Storage Space</Text>
                                    </Stack>
                                </Stack>
                            </Card>
                            <Card className="-mb-px -mr-px rounded-none bg-transparent" minHeight={640}>
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

                                    <Stack
                                        className="pt-12"
                                        paddingInline={4}
                                        direction="horizontal"
                                        gap={2}
                                        align="end"
                                        hAlign="center"
                                        width="100%"
                                    >
                                        <Text hasCapsize type="display-3" weight="semibold">
                                            Coming soon
                                        </Text>
                                    </Stack>
                                </Stack>
                            </Card>
                            <Card className="-mb-px -mr-px rounded-none bg-transparent" minHeight={640}>
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

                                    <Stack
                                        className="pt-12"
                                        paddingInline={4}
                                        direction="horizontal"
                                        gap={2}
                                        align="end"
                                        hAlign="center"
                                        width="100%"
                                    >
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
        </>
    );
}
