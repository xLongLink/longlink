import { useState } from 'react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';

let isDevelopmentNoticeDismissed = false;

/** Warns visitors that the hosted LongLink environment is still under development. */
export function DevelopmentNotice() {
    const [isDismissed, setIsDismissed] = useState(isDevelopmentNoticeDismissed);

    if (isDismissed) {
        return null;
    }

    return (
        <Banner
            container="section"
            isDismissable
            onDismiss={() => {
                isDevelopmentNoticeDismissed = true;
                setIsDismissed(true);
            }}
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
