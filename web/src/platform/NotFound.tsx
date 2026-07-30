import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Stack } from '@astryxdesign/core/Stack';
import { Search } from 'lucide-react';
import { useLocation } from 'react-router';
import PlatformLayout from '@/platform/layout';

/** Renders the shared 404 page for unknown or unavailable routes. */
export default function NotFound() {
    const t = useTranslator();

    return (
        <PlatformLayout brandOnly>
            <Center minHeight="70dvh" width="100%">
                <EmptyState
                    actions={
                        <Stack direction="horizontal" gap={2} wrap="wrap">
                            <Button href="/" label={t('actions.backToHome')} variant="primary" />
                            <Button href="/docs" label={t('actions.seeDocs')} variant="secondary" />
                        </Stack>
                    }
                    description={t('notFound.description', { path: useLocation().pathname })}
                    headingLevel={1}
                    icon={<Search aria-hidden="true" size={24} />}
                    title={t('notFound.title')}
                />
            </Center>
        </PlatformLayout>
    );
}
