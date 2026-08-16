import { ExternalLink } from 'lucide-react';
import { Link } from '@astryxdesign/core/Link';
import type { UserSummary } from '@/lib/generated/platform-api-v1/types.gen';
import { ProfileMenu } from '@/components/Profile';

/** Renders a profile menu for authenticated users or a documentation link otherwise. */
export function AccountAction({ user }: { user: UserSummary | null }) {
    if (user) {
        return <ProfileMenu user={user} />;
    }

    return (
        <Link href="/docs" color="secondary" isStandalone rel="noopener noreferrer" target="_blank">
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                Documentation
                <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
            </span>
        </Link>
    );
}
