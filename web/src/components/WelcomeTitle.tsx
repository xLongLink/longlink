import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { Wordmark } from '@/components/Wordmark';

/** Renders the shared LongLink welcome title used by authentication screens. */
export function WelcomeTitle() {
    return (
        <HStack as="span" gap={2} hAlign="center" vAlign="center" wrap="wrap">
            <Text color="inherit" type="inherit">
                Welcome to
            </Text>
            <Wordmark size="heading" />
        </HStack>
    );
}
