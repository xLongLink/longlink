import { Text } from '@astryxdesign/core/Text';
import { Wordmark } from '@/components/Wordmark';

/** Renders the shared LongLink welcome title used by authentication screens. */
export function WelcomeTitle() {
    return (
        <Text textWrap="nowrap" type="inherit">
            Welcome to <Wordmark size="inherit" />
        </Text>
    );
}
