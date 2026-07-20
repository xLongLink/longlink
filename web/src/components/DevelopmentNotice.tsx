import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';

/** Warns visitors that the hosted LongLink environment is still under development. */
export function DevelopmentNotice() {
    return (
        <Banner
            container="section"
            isDismissable
            status="warning"
            title={
                <Text type="supporting">
                    LongLink is still in development. Data may be reset between deployments.{' '}
                    <Link
                        as="a"
                        href="https://github.com/xLongLink/longlink"
                        hasUnderline
                        isExternalLink
                        type="inherit"
                    >
                        Star LongLink on GitHub.
                    </Link>
                </Text>
            }
        />
    );
}
