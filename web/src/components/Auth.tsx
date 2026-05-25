import { useUser } from '@/hooks/use-user';
import { apiUrl } from '@/lib/api';
import type { ReactElement } from 'react';

/** Protects routes and offers a login prompt when the session is missing. */
export function RequireAuth({ children }: { children: ReactElement }) {
    const { user, isLoading, isFetching } = useUser();
    const loginUrl = apiUrl('/auth/login/oidc');

    if (isLoading || isFetching) {
        return null;
    }

    if (!user) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center px-6 text-center">
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">You need to sign in to continue.</p>
                    <a href={loginUrl} className="text-sm font-medium text-accent hover:underline">
                        Sign in
                    </a>
                </div>
            </div>
        );
    }

    return children;
}
