import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';

/** Renders the LongLink platform slide. */
export function PlatformSlide() {
    return (
        <Stack align="center" className="relative" height="100%" justify="center" width="100%">
            <Stack className="relative h-11/12 w-11/12">
                <img
                    alt="AI assistant connected to an application core, database, and platform capabilities"
                    className="h-full w-full object-contain"
                    draggable={false}
                    src="/images/platform.png"
                />
                <Text
                    className="absolute start-3/10 top-1/5 -translate-x-1/2"
                    hasCapsize
                    type="display-3"
                    weight="semibold"
                >
                    Services
                </Text>
                <Text
                    className="absolute bottom-1/5 start-7/10 -translate-x-1/2"
                    hasCapsize
                    type="display-3"
                    weight="semibold"
                >
                    Deployment
                </Text>
            </Stack>
            <Text
                className="ppt-slide-standard-font absolute bottom-12 start-12"
                hasCapsize
                type="large"
                weight="semibold"
            >
                What is LongLink?
            </Text>
        </Stack>
    );
}
