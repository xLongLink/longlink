import { useLocation } from 'react-router';
import { Icon } from '@astryxdesign/core/Icon';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { useTranslator } from '@astryxdesign/core/i18n';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import Layout from '@/layout/Layout';

/** Renders the shared 404 page for unknown or unavailable routes. */
export default function NotFound() {
    const t = useTranslator();
    const location = useLocation();

    return (
        <Layout brandOnly>
            <Center minHeight="70dvh" width="100%">
                <EmptyState
                    actions={
                        <Stack direction="horizontal" gap={2} wrap="wrap">
                            <Button href="/" label={t('actions.backToHome')} variant="primary" />
                            <Button href="/docs" label={t('actions.seeDocs')} variant="secondary" />
                        </Stack>
                    }
                    description={t('notFound.description', { path: location.pathname })}
                    headingLevel={1}
                    icon={<Icon icon="search" size="lg" />}
                    title={t('notFound.title')}
                />
            </Center>
        </Layout>
    );
}
