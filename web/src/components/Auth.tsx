import { useUser } from '@/hooks/use-user';
import Layout from '@/layout/Layout';
import type { ReactElement } from 'react';
import { useLocation } from 'react-router';

import { SignInCard } from '@/components/SignInCard';
import type { PlatformRole } from '@/lib/roles';

type AuthProps = {
    children: ReactElement;
    requiredRole: PlatformRole;
};

/** Protects routes and requires a platform role. */
export function Auth({ children, requiredRole }: AuthProps) {
    const { user, role, isLoading } = useUser();
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

    if (role !== requiredRole) {
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
