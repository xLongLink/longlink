import { Search } from 'lucide-react';
import { Center } from '@astryxdesign/core/Center';
import { EmptyState } from '@astryxdesign/core/EmptyState';

/** Renders the shared 404 state for unknown or unavailable routes. */
export default function NotFoundLayout() {
    return (
        <Center minHeight="70dvh" width="100%">
            <EmptyState
                description="This page doesn't exist or isn't available."
                headingLevel={1}
                icon={<Search aria-hidden="true" size={24} />}
                title="We can't find that page"
            />
        </Center>
    );
}
