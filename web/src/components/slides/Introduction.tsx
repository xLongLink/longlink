import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';

/** Renders the opening split-arrow diagram. */
export function IntroductionSlide() {
    return (
        <Stack className="relative" height="100%" width="100%">
            <Stack className="absolute inset-y-0 start-1/2 aspect-video -translate-x-1/2">
                <img
                    alt="A classical coding path splitting toward transparent and opaque boxes"
                    className="h-full w-full object-contain"
                    draggable={false}
                    src="/images/paths.png"
                />
                <Stack className="absolute start-1/4 top-1/2 -translate-x-1/2 -translate-y-8">
                    <Text hasCapsize type="display-3" weight="semibold">
                        Classical Coding
                    </Text>
                </Stack>
                <Stack className="absolute start-5/6 top-5/12 translate-y-2 -translate-x-1/2">
                    <Text hasCapsize type="display-3" weight="semibold">
                        Hybrid Coding
                    </Text>
                </Stack>
                <Stack className="absolute start-5/6 top-13/15 -translate-x-1/2">
                    <Text hasCapsize type="display-3" weight="semibold">
                        Vibe Coding
                    </Text>
                </Stack>
            </Stack>
            <Text
                className="ppt-slide-standard-font absolute bottom-12 start-12"
                hasCapsize
                type="large"
                weight="semibold"
            >
                Where are we headed?
            </Text>
        </Stack>
    );
}
