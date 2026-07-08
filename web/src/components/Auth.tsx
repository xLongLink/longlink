import { useUserProfile } from '@/hooks/use-user';
import Layout from '@/layout/Layout';
import NotFound from '@/pages/NotFound';
import type { ReactElement } from 'react';
import { useLocation } from 'react-router';

import { SignInCard } from '@/components/SignInCard';
import { hasMinimumRole, type PlatformRole } from '@/lib/roles';

/** Protects routes and optionally requires a platform role. */
export function Auth({ children, requiredRole }: { children: ReactElement; requiredRole?: PlatformRole }) {
    const { user, role, isLoading } = useUserProfile();
    const location = useLocation();

    if (isLoading) {
        return null;
    }

    if (!user) {
        return (
            <Layout brandOnly brandHref="/">
                <section className="mx-auto flex w-full max-w-[1000px] flex-1 items-center justify-center py-12">
                    <SignInCard redirectTo={`${location.pathname}${location.search}${location.hash}`} />
                </section>
            </Layout>
        );
    }

    if (requiredRole) {
        if (!hasMinimumRole(role, requiredRole)) {
            return <NotFound />;
        }
    }

    return children;
}
