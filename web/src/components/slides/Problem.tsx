import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';

/** Renders the problem slide. */
export function ProblemSlide() {
    return (
        <Stack align="center" className="relative" height="100%" justify="center" width="100%">
            <img
                alt="AI assistant connected to an application core, database, and platform capabilities"
                className="h-11/12 w-11/12 object-contain"
                draggable={false}
                src="/images/problem.png"
            />
            <Text
                className="ppt-slide-standard-font absolute bottom-12 start-12"
                hasCapsize
                type="large"
                weight="semibold"
            >
                Is SaaS dead?
            </Text>
        </Stack>
    );
}
