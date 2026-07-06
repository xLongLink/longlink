import Layout from '@/layout/Layout';
import { useTranslation } from '@/lib/i18n';
import { buttonVariants } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Compass } from 'lucide-react';
import { Link, useLocation } from 'react-router';

/**
 * Renders the shared 404 page for unknown or unavailable routes.
 */
export default function NotFound() {
    const { t } = useTranslation();
    const location = useLocation();

    return (
        <Layout brandOnly>
            <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-12">
                <Empty className="w-full max-w-xl border-border/70 bg-card/70 shadow-sm">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Compass />
                        </EmptyMedia>
                        <EmptyTitle>{t('notFound.title')}</EmptyTitle>
                        <EmptyDescription>{t('notFound.description', { path: location.pathname })}</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Link to="/" className={buttonVariants()}>
                            {t('actions.backToHome')}
                        </Link>
                        <Link to="/docs" className={buttonVariants({ variant: 'outline' })}>
                            {t('actions.seeDocs')}
                        </Link>
                    </EmptyContent>
                </Empty>
            </div>
        </Layout>
    );
}
