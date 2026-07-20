import type { ReactElement } from 'react';
import { useLocation } from 'react-router';
import { Center } from '@astryxdesign/core/Center';
import Layout from '@/layout/Layout';
import NotFound from '@/pages/NotFound';
import { useUserProfile } from '@/hooks/use-user';
import { SignInCard } from '@/components/SignInCard';
import { hasMinimumRole, type PlatformRole } from '@/lib/roles';

/** Protects routes and optionally requires a platform role. */
export function Auth({ children, requiredRole }: { children: ReactElement; requiredRole?: PlatformRole }) {
    const { user, role, isLoading } = useUserProfile();
    const location = useLocation();

    // Wait for profile loading before deciding access.
    if (isLoading) {
        return null;
    }

    // Show sign-in UI for unauthenticated users.
    if (!user) {
        return (
            <Layout brandOnly brandHref="/">
                <Center minHeight="60dvh" width="100%">
                    <SignInCard redirectTo={`${location.pathname}${location.search}${location.hash}`} />
                </Center>
            </Layout>
        );
    }

    // Check role requirements only when a route declares one.
    if (requiredRole) {
        // Hide routes from users without the required role.
        if (!hasMinimumRole(role, requiredRole)) {
            return <NotFound />;
        }
    }

    return children;
}
