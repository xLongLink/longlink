import { useUser } from '@/hooks/use-user';
import type { ReactElement } from 'react';
import { Navigate } from 'react-router';

/** Redirects to /login if user is not authenticated. */
export function RequireAuth({ children }: { children: ReactElement }) {
    const { data: user, isLoading } = useUser();

    if (isLoading) {
        return null;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
