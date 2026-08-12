import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Stack } from '@astryxdesign/core/Stack';
import { Search } from 'lucide-react';
import { useLocation } from 'react-router';
import PlatformLayout from '@/platform/layout';

/** Renders the shared 404 page for unknown or unavailable routes. */
export default function NotFound() {

    return (
        <PlatformLayout brandOnly>
            <Center minHeight="70dvh" width="100%">
                <EmptyState
                    actions={
                        <Stack direction="horizontal" gap={2} wrap="wrap">
                            <Button href="/" label="Back to Home" variant="primary" />
                            <Button href="/docs" label="See the Docs" variant="secondary" />
                        </Stack>
                    }
                    description={`The page ${useLocation().pathname} doesn't exist or isn't available.`}
                    headingLevel={1}
                    icon={<Search aria-hidden="true" size={24} />}
                    title="We can't find that page"
                />
            </Center>
        </PlatformLayout>
    );
}
