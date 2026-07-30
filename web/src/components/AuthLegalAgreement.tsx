import { useTranslator } from '@astryxdesign/core/i18n';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';

/** Renders the shared account legal-agreement copy. */
export function AuthLegalAgreement() {
    const t = useTranslator();

    return (
        <Text as="p" color="secondary" justify="center" type="supporting">
            {t('auth.agreementLead')} <br />
            <Link href="/terms" hasUnderline type="inherit">
                {t('auth.termsOfService')}
            </Link>{' '}
            {t('auth.agreementMiddle')}{' '}
            <Link href="/privacy" hasUnderline type="inherit">
                {t('auth.privacyPolicy')}
            </Link>
            .
        </Text>
    );
}
