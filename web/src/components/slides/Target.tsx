import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';

/** Renders the target slide. */
export function TargetSlide() {
    return (
        <Stack align="center" className="relative" height="100%" justify="center" width="100%">
            <Stack align="center" gap={2} maxWidth={832} width="100%">
                <Grid columns={2} gap={2} justify="center" maxWidth={552} width="100%">
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" height="100%" justify="center">
                            <Text size="2xl" type="large" weight="semibold">
                                Legacy systems
                            </Text>
                        </Stack>
                    </Card>
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" height="100%" justify="center">
                            <Text size="2xl" type="large" weight="semibold">
                                Low-code platforms
                            </Text>
                        </Stack>
                    </Card>
                </Grid>
                <Grid columns={3} gap={2} justify="center" width="100%">
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" height="100%" justify="center">
                            <Text size="2xl" type="large" weight="semibold">
                                SaaS applications
                            </Text>
                        </Stack>
                    </Card>
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" height="100%" justify="center">
                            <Text size="2xl" type="large" weight="semibold">
                                Excel
                            </Text>
                        </Stack>
                    </Card>
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" height="100%" justify="center">
                            <Text size="2xl" type="large" weight="semibold">
                                Vibe tools
                            </Text>
                        </Stack>
                    </Card>
                </Grid>
                <Grid columns={2} gap={2} justify="center" maxWidth={552} width="100%">
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" height="100%" justify="center">
                            <Text size="2xl" type="large" weight="semibold">
                                Manual workflows
                            </Text>
                        </Stack>
                    </Card>
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" height="100%" justify="center">
                            <Text size="2xl" type="large" weight="semibold">
                                Workarounds
                            </Text>
                        </Stack>
                    </Card>
                </Grid>
            </Stack>
            <Text
                className="ppt-slide-standard-font absolute bottom-12 start-12"
                hasCapsize
                type="large"
                weight="semibold"
            >
                Where this applies?
            </Text>
        </Stack>
    );
}
