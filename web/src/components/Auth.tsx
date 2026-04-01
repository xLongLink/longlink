import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useUser } from '@/hooks/use-user';

export function RequireAuth({ children }: { children: ReactElement }) {
    const location = useLocation();
    const { data: user, isLoading } = useUser();

    if (isLoading) {
        return null;
    }

    if (!user) {
        const returnTo = `${location.pathname}${location.search}${location.hash}`;
        return <Navigate to={`/login?return_to=${encodeURIComponent(returnTo)}`} replace />;
    }

    return children;
}
