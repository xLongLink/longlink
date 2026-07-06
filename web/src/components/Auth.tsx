import { useUserProfile } from '@/hooks/use-user';
import Layout from '@/layout/Layout';
import NotFound from '@/pages/NotFound';
import type { ReactElement } from 'react';
import { useLocation } from 'react-router';

import { SignInCard } from '@/components/SignInCard';
import type { PlatformRole } from '@/lib/roles';

/** Protects routes and optionally requires a platform role. */
export function Auth({
    children,
    requiredRole,
}: {
    children: ReactElement;
    requiredRole?: PlatformRole;
}) {
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
        // Treat required roles as a minimum access level so administrators can reach user and support routes.
        const roleHierarchy: PlatformRole[] = ['user', 'support', 'administrator'];
        const currentRoleIndex = roleHierarchy.indexOf(role);
        const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

        if (currentRoleIndex < requiredRoleIndex) {
            return <NotFound />;
        }
    }

    return children;
}
