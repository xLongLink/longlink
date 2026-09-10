import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';

/** Renders the target slide. */
export function TargetSlide() {
    return (
        <Stack align="center" className="relative" height="100%" justify="center" width="100%">
            <Stack align="center" gap={2} maxWidth={1048} width="100%">
                <Grid columns={2} gap={2} justify="center" maxWidth={696} width="100%">
                    <Card className="ppt-brittle-brick" height={160} variant="muted" width={344}>
                        <Stack align="center" height="100%" justify="center">
                            <Text size="3xl" type="large" weight="semibold">
                                Legacy systems
                            </Text>
                        </Stack>
                    </Card>
                    <Card className="ppt-brittle-brick" height={160} variant="muted" width={344}>
                        <Stack align="center" height="100%" justify="center">
                            <Text size="3xl" type="large" weight="semibold">
                                Low-code platforms
                            </Text>
                        </Stack>
                    </Card>
                </Grid>
                <Grid columns={3} gap={2} justify="center" width="100%">
                    <Card className="ppt-brittle-brick" height={160} variant="muted" width={344}>
                        <Stack align="center" height="100%" justify="center">
                            <Text size="3xl" type="large" weight="semibold">
                                SaaS applications
                            </Text>
                        </Stack>
                    </Card>
                    <Card className="ppt-brittle-brick" height={160} variant="muted" width={344}>
                        <Stack align="center" height="100%" justify="center">
                            <Text size="3xl" type="large" weight="semibold">
                                Excel
                            </Text>
                        </Stack>
                    </Card>
                    <Card className="ppt-brittle-brick" height={160} variant="muted" width={344}>
                        <Stack align="center" height="100%" justify="center">
                            <Text size="3xl" type="large" weight="semibold">
                                Vibe tools
                            </Text>
                        </Stack>
                    </Card>
                </Grid>
                <Grid columns={2} gap={2} justify="center" maxWidth={696} width="100%">
                    <Card className="ppt-brittle-brick" height={160} variant="muted" width={344}>
                        <Stack align="center" height="100%" justify="center">
                            <Text size="3xl" type="large" weight="semibold">
                                Manual workflows
                            </Text>
                        </Stack>
                    </Card>
                    <Card className="ppt-brittle-brick" height={160} variant="muted" width={344}>
                        <Stack align="center" height="100%" justify="center">
                            <Text size="3xl" type="large" weight="semibold">
                                Workarounds
                            </Text>
                        </Stack>
                    </Card>
                </Grid>
            </Stack>
            <Text
                className="ppt-slide-standard-font absolute bottom-12 start-12"
                hasCapsize
                size="2xl"
                type="large"
                weight="semibold"
            >
                What are we building for?
            </Text>
        </Stack>
    );
}
