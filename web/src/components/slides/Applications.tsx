import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Blocks, Cloud, FileSpreadsheet, Hand, Server, Sparkles, Wrench } from 'lucide-react';

/** Renders the applications comparison slide. */
export function ApplicationsSlide() {
    return (
        <Stack align="center" className="relative" height="100%" justify="center" width="100%">
            <Stack align="center" gap={2} maxWidth={832} width="100%">
                <Grid columns={2} gap={2} justify="center" maxWidth={552} width="100%">
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" gap={1} height="100%" justify="center">
                            <Server aria-hidden className="text-accent" size={16} />
                            <Text type="large" weight="semibold">
                                Legacy systems
                            </Text>
                        </Stack>
                    </Card>
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" gap={1} height="100%" justify="center">
                            <Blocks aria-hidden className="text-accent" size={16} />
                            <Text type="large" weight="semibold">
                                Low-code platforms
                            </Text>
                        </Stack>
                    </Card>
                </Grid>
                <Grid columns={3} gap={2} justify="center" width="100%">
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" gap={1} height="100%" justify="center">
                            <Cloud aria-hidden className="text-accent" size={16} />
                            <Text type="large" weight="semibold">
                                SaaS applications
                            </Text>
                        </Stack>
                    </Card>
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" gap={1} height="100%" justify="center">
                            <FileSpreadsheet aria-hidden className="text-accent" size={16} />
                            <Text type="large" weight="semibold">
                                Excel
                            </Text>
                        </Stack>
                    </Card>
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" gap={1} height="100%" justify="center">
                            <Sparkles aria-hidden className="text-accent" size={16} />
                            <Text type="large" weight="semibold">
                                Vibe tools
                            </Text>
                        </Stack>
                    </Card>
                </Grid>
                <Grid columns={2} gap={2} justify="center" maxWidth={552} width="100%">
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" gap={1} height="100%" justify="center">
                            <Hand aria-hidden className="text-accent" size={16} />
                            <Text type="large" weight="semibold">
                                Manual workflows
                            </Text>
                        </Stack>
                    </Card>
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" gap={1} height="100%" justify="center">
                            <Wrench aria-hidden className="text-accent" size={16} />
                            <Text type="large" weight="semibold">
                                Workarounds
                            </Text>
                        </Stack>
                    </Card>
                </Grid>
            </Stack>
            <Text className="absolute bottom-12 start-12" hasCapsize type="large" weight="semibold">
                Where this applies?
            </Text>
        </Stack>
    );
}
