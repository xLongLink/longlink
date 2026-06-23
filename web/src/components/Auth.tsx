import { useUser } from '@/hooks/use-user';
import Layout from '@/layout/Layout';
import type { ReactElement } from 'react';
import { useLocation } from 'react-router';

import { SignInCard } from '@/components/SignInCard';
import type { PlatformRole } from '@/lib/roles';

type AuthProps = {
    children: ReactElement;
    requiredRole?: PlatformRole;
};

const ROLE_ORDER: Record<PlatformRole, number> = {
    user: 0,
    support: 1,
    administrator: 2,
};

/** Returns whether the current role meets the required platform access. */
function hasRequiredRole(userRole: PlatformRole, requiredRole: PlatformRole): boolean {
    return ROLE_ORDER[userRole] >= ROLE_ORDER[requiredRole];
}

/** Protects routes and optionally requires a minimum platform role. */
export function Auth({ children, requiredRole }: AuthProps) {
    const { user, role, isLoading } = useUser();
    const location = useLocation();
    const redirectTo = `${location.pathname}${location.search}${location.hash}`;

    if (isLoading) {
        return null;
    }

    if (!user) {
        return (
            <Layout brandOnly brandHref="/">
                <section className="mx-auto flex w-full max-w-[1000px] flex-1 items-center justify-center py-12">
                    <SignInCard redirectTo={redirectTo} />
                </section>
            </Layout>
        );
    }

    if (requiredRole && !hasRequiredRole(role, requiredRole)) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center px-6 text-center">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Platform access required.</p>
                    <p className="text-sm text-muted-foreground">
                        Your account does not have permission to view this page.
                    </p>
                </div>
            </div>
        );
    }

    return children;
}
