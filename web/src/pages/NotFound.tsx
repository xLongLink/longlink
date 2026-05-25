import { useUser } from '@/hooks/use-user';
import { buttonVariants } from '@ui/button';
import { Card, CardContent } from '@ui/card';
import { Compass } from 'lucide-react';
import { Link, useLocation } from 'react-router';

/**
 * Renders fallback 404 page for unknown routes.
 */
export default function NotFound() {
    const location = useLocation();
    const { data: user } = useUser();
    const primaryLink = user ? '/orgs' : '/';
    const primaryLabel = user ? 'Back to orgs' : 'Back to home';
    const secondaryLink = user ? '/' : '/auth/login/oidc';
    const secondaryLabel = user ? 'Back to home' : 'Go to login';

    return (
        <div className="flex min-h-screen items-center justify-center px-6 py-12 text-white">
            <Card className="w-full max-w-lg border-white/10 bg-white/5">
                <CardContent className="space-y-6 p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
                        <Compass className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">404 error</p>
                        <h1 className="text-2xl font-semibold">We can&apos;t find that page</h1>
                        <p className="text-sm text-white/60">
                            The page <span className="font-semibold text-white">{location.pathname}</span> doesn&apos;t
                            exist or has moved.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Link to={primaryLink} className={buttonVariants()}>
                            {primaryLabel}
                        </Link>
                        {user ? (
                            <Link to={secondaryLink} className={buttonVariants({ variant: 'outline' })}>
                                {secondaryLabel}
                            </Link>
                        ) : (
                            <a href={secondaryLink} className={buttonVariants({ variant: 'outline' })}>
                                {secondaryLabel}
                            </a>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
