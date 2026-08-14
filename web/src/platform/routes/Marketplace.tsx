import { Store } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Section } from '@astryxdesign/core/Section';
import { StackItem } from '@astryxdesign/core/Stack';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Page } from '@/layout/Page';

/** Renders the marketplace placeholder. */
export default function MarketplaceRoute() {
    return (
        <Page>
            <StackItem as="main" size="fill">
                <Section variant="transparent" height="100%" padding={6}>
                    <Center height="100%" width="100%">
                        <EmptyState
                            actions={<Button href="/docs" label="Explore the documentation" variant="primary" />}
                            description="We're preparing a catalog of Applications you can deploy, adapt, and build on."
                            headingLevel={1}
                            icon={<Store aria-hidden="true" size={24} />}
                            title="Marketplace coming soon"
                        />
                    </Center>
                </Section>
            </StackItem>
        </Page>
    );
}
