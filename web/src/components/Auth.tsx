import { useUser } from '@/hooks/use-user';
import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router';

/** Redirects to /login if user is not authenticated. */
export function RequireAuth({ children }: { children: ReactElement }) {
    const { data: user, isLoading } = useUser();
    const location = useLocation();

    if (isLoading) {
        return null;
    }

    if (!user) {
        /* Preserve the current route so the login flow can return here after OIDC completes. */
        const nextPath = `${location.pathname}${location.search}${location.hash}`;
        return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />;
    }

    return children;
}
