import { HStack } from '@astryxdesign/core/HStack';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Text } from '@astryxdesign/core/Text';
import { Wordmark } from '@/components/Wordmark';

/** Renders the shared heading for account creation flows. */
export function AuthWelcomeTitle() {
    const t = useTranslator();

    return (
        <HStack as="span" gap={2} hAlign="center" vAlign="center" wrap="wrap">
            <Text color="inherit" type="inherit">
                {t('auth.welcomeTo')}
            </Text>
            <Wordmark size="heading" />
        </HStack>
    );
}
