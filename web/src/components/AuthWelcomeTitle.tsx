import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { Wordmark } from '@/components/Wordmark';

/** Renders the shared heading for account creation flows. */
export function AuthWelcomeTitle() {
    return (
        <HStack as="span" gap={2} hAlign="center" vAlign="center" wrap="wrap">
            <Text color="inherit" type="inherit">
                Welcome to
            </Text>
            <Wordmark size="heading" />
        </HStack>
    );
}
