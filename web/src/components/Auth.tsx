import { useUser } from '@/hooks/use-user';
import type { ReactElement } from 'react';
import { Link, useLocation } from 'react-router';

type AuthProps = {
    children: ReactElement;
    admin?: boolean;
};

/** Renders the shared sign-in prompt. */
function SignInPrompt({ loginUrl }: { loginUrl: string }) {
    return (
        <div className="flex min-h-[40vh] items-center justify-center px-6 text-center">
            <div className="space-y-3">
                <p className="text-sm text-muted-foreground">You need to sign in to continue.</p>
                <Link to={loginUrl} className="text-sm font-medium text-accent hover:underline">
                    Sign in
                </Link>
            </div>
        </div>
    );
}

/** Protects routes and optionally requires admin access. */
export function Auth({ children, admin = false }: AuthProps) {
    const { user, isLoading } = useUser();
    const location = useLocation();
    const loginUrl = `/login?next=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)}`;

    if (isLoading) {
        return null;
    }

    if (!user) {
        return <SignInPrompt loginUrl={loginUrl} />;
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
