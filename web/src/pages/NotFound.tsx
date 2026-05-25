import Layout from '@/Layout';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@ui/empty';
import { buttonVariants } from '@ui/button';
import { Compass } from 'lucide-react';
import { Link, useLocation } from 'react-router';

/**
 * Renders fallback 404 page for unknown routes.
 */
export default function NotFound() {
    const location = useLocation();

    return (
        <Layout brandOnly>
            <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-12">
                <Empty className="w-full max-w-xl border-border/70 bg-card/70 shadow-sm">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Compass />
                        </EmptyMedia>
                        <EmptyTitle>We can&apos;t find that page</EmptyTitle>
                        <EmptyDescription>
                            The page <span className="font-medium text-foreground">{location.pathname}</span> doesn&apos;t
                            exist or has moved.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Link to="/" className={buttonVariants()}>
                            Back to Home
                        </Link>
                        <Link to="/docs" className={buttonVariants({ variant: 'outline' })}>
                            See the Docs
                        </Link>
                    </EmptyContent>
                </Empty>
            </div>
        </Layout>
    );
}
