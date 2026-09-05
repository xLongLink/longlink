import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';

/** Renders the presentation plan slide. */
export function PlanSlide() {
    return (
        <Stack align="center" className="relative" height="100%" justify="center" width="100%">
            <Stack className="relative" maxWidth={960} width="100%">
                <img className="w-full object-contain" draggable={false} src="/images/timeline-arrow.png" />
                <Grid className="absolute inset-0" columns={3}>
                    <Stack align="center" height="100%" justify="center">
                        <Stack align="center" className="-translate-y-12" gap={1}>
                            <Text hasCapsize type="display-3" weight="semibold">
                                Open source
                            </Text>
                            <Text color="secondary" type="large">
                                July 2026
                            </Text>
                        </Stack>
                    </Stack>
                    <Stack align="center" height="100%" justify="center">
                        <Stack align="center" className="translate-y-12" gap={1}>
                            <Text hasCapsize type="display-3" weight="semibold">
                                Public beta
                            </Text>
                            <Text color="secondary" type="large">
                                September 2026
                            </Text>
                        </Stack>
                    </Stack>
                    <Stack align="center" height="100%" justify="center">
                        <Stack align="center" className="-translate-y-12" gap={1}>
                            <Text hasCapsize type="display-3" weight="semibold">
                                Pilots
                            </Text>
                            <Text color="secondary" type="large">
                                Q4 2026
                            </Text>
                        </Stack>
                    </Stack>
                </Grid>
            </Stack>
            <Text
                className="ppt-slide-standard-font absolute bottom-12 start-12"
                hasCapsize
                type="large"
                weight="semibold"
            >
                What is the plan?
            </Text>
        </Stack>
    );
}
