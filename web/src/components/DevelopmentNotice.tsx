import { useContext } from 'react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { DevelopmentNoticeContext } from '@/providers';

/** Warns visitors that the hosted LongLink environment is still under development. */
export function DevelopmentNotice() {
    // Read dismissal from the root shared by both banner placements.
    const notice = useContext(DevelopmentNoticeContext);
    if (notice === null) throw new Error('DevelopmentNotice requires RootProvider');

    if (notice.isDismissed) {
        return null;
    }

    return (
        <Banner
            container="section"
            isDismissable
            onDismiss={notice.dismiss}
            status="warning"
            title={
                <Text type="supporting">
                    Beta: not yet for production-critical workloads.{' '}
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
