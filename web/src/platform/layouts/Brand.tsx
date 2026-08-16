import { Outlet } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Wordmark } from '@/components/Wordmark';
import Platform from '@/components/layouts/Platform';

/** Renders the brand-only shell around public platform routes. */
export default function Brand() {
    return (
        <Platform
            topNav={
                <TopNav
                    className="min-h-11 px-7"
                    endContent={
                        <Link href="/docs" color="secondary" isStandalone rel="noopener noreferrer" target="_blank">
                            Documentation
                        </Link>
                    }
                    heading={
                        <Link href="/" label="LongLink home" color="inherit">
                            <Wordmark />
                        </Link>
                    }
                    label="Main navigation"
                />
            }
        >
            <Outlet />
        </Platform>
    );
}
