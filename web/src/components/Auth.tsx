import { useUser } from '@/hooks/use-user';
import { apiUrl } from '@/lib/api';
import type { ReactElement } from 'react';

type AuthProps = {
    children: ReactElement;
    admin?: boolean;
};

/** Renders the shared sign-in prompt. */
function SignInPrompt() {
    const loginUrl = apiUrl('/auth/login/oidc');

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

/** Protects routes and optionally requires admin access. */
export function Auth({ children, admin = false }: AuthProps) {
    const { user, isLoading } = useUser();

    if (isLoading) {
        return null;
    }

    if (!user) {
        return <SignInPrompt />;
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
