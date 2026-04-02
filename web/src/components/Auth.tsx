import type { ReactElement } from 'react';
import { Navigate } from 'react-router';
import { useUser } from '@/hooks/use-user';

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
