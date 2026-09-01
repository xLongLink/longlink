import { Outlet } from 'react-router';
import { Seo } from '@/components/Seo';
import { Link } from '@astryxdesign/core/Link';
import Platform from '@/platform/layouts/Platform';

/** Renders the brand-only shell around public platform routes. */
export default function Brand() {
    return (
        <>
            <Seo isIndexable={false} />
            <Platform
                action={
                    <Link href="/docs" color="secondary" isStandalone target="_blank">
                        Documentation
                    </Link>
                }
                tabs={[]}
            >
                <Outlet />
            </Platform>
        </>
    );
}
