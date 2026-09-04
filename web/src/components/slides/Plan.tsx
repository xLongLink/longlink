import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';

/** Renders the presentation plan slide. */
export function PlanSlide() {
    return (
        <Stack className="relative" height="100%" width="100%">
            <Text
                className="ppt-slide-standard-font absolute bottom-12 start-12"
                hasCapsize
                type="large"
                weight="semibold"
            >
                Plan
            </Text>
        </Stack>
    );
}
