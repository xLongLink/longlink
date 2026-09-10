import { Text } from '@astryxdesign/core/Text';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';

/** Renders the presentation closing slide. */
export function ClosingSlide() {
    return (
        <Stack align="center" height="100%" justify="center" width="100%">
            <Stack align="center" className="text-5xl" gap={4}>
                <Wordmark size="inherit" />
                <Text hasCapsize size="xl" type="large" weight="semibold">
                    longlink.dev
                </Text>
            </Stack>
        </Stack>
    );
}
