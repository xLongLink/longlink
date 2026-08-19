import { Outlet } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import Platform from '@/platform/layouts/Platform';

/** Renders the brand-only shell around public platform routes. */
export default function Brand() {
    return (
        <Platform
            action={
                <Link href="/docs" color="secondary" isStandalone rel="noopener noreferrer" target="_blank">
                    Documentation
                </Link>
            }
            tabs={[]}
        >
            <Outlet />
        </Platform>
    );
}
