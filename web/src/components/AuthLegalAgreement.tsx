import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';

/** Renders the shared account legal-agreement copy. */
export function AuthLegalAgreement() {
    return (
        <Text as="p" color="secondary" justify="center" type="supporting">
            By continuing, you agree to our <br />
            <Link href="/terms" hasUnderline type="inherit">
                Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" hasUnderline type="inherit">
                Privacy Policy
            </Link>
            .
        </Text>
    );
}
