import { useUser } from '@/hooks/use-user';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

/** Redirects unauthenticated users to the OIDC provider. */
export function RequireAuth({ children }: { children: ReactElement }) {
    const { data: user, isLoading } = useUser();

    /* Start the login flow once we know the user is missing. */
    useEffect(() => {
        if (!isLoading && !user) {
            window.location.href = '/auth/login/oidc';
        }
    }, [isLoading, user]);

    if (isLoading) {
        return null;
    }

    if (!user) {
        return null;
    }

    return children;
}
