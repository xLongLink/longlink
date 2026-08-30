import { Stack } from '@/components/ui/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Wordmark } from '@/components/Wordmark';

/** Renders the shared LongLink welcome title used by authentication screens. */
export function WelcomeTitle() {
    return (
        <Stack as="span" direction="horizontal" gap={2} hAlign="center" vAlign="center">
            <Text type="inherit">Welcome to</Text>
            <Wordmark size="heading" />
        </Stack>
    );
}
