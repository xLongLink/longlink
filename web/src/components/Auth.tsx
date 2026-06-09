import { useUser } from '@/hooks/use-user';
import Layout from '@/layout/Layout';
import type { ReactElement } from 'react';
import { useLocation } from 'react-router';

import { SignInCard } from '@/components/SignInCard';

type AuthProps = {
    children: ReactElement;
    admin?: boolean;
};

/** Protects routes and optionally requires admin access. */
export function Auth({ children, admin = false }: AuthProps) {
    const { user, isLoading } = useUser();
    const location = useLocation();
    const redirectTo = `${location.pathname}${location.search}${location.hash}`;

    if (isLoading) {
        return null;
    }

    if (!user) {
        return (
            <Layout brandOnly brandHref="/">
                <section className="mx-auto flex w-full max-w-[1000px] items-center justify-center py-12">
                    <SignInCard redirectTo={redirectTo} />
                </section>
            </Layout>
        );
    }

    if (admin && !user.admin) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center px-6 text-center">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Admin access required.</p>
                    <p className="text-sm text-muted-foreground">
                        Your account does not have permission to view this page.
                    </p>
                </div>
            </div>
        );
    }

    return children;
}
