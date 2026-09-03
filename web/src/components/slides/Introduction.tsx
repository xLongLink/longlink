import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';

/** Renders the opening split-arrow diagram. */
export function IntroductionSlide() {
    return (
        <Stack className="relative" height="100%" width="100%">
            <img
                alt="A classical coding path splitting toward transparent and opaque boxes"
                className="h-full w-full object-contain"
                draggable={false}
                src="/images/paths.png"
            />
            <Stack className="absolute start-1/4 top-1/2 -translate-x-1/2 -translate-y-10">
                <Text hasCapsize type="display-3" weight="semibold">
                    Classical Coding
                </Text>
            </Stack>
            <Stack className="absolute start-5/6 top-10 -translate-x-1/2">
                <Text hasCapsize type="display-3" weight="semibold">
                    Hybrid Coding
                </Text>
            </Stack>
            <Stack className="absolute bottom-10 start-5/6 -translate-x-1/2">
                <Text hasCapsize type="display-3" weight="semibold">
                    Vibe Coding
                </Text>
            </Stack>
        </Stack>
    );
}
