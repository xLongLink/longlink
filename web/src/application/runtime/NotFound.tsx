import { Search } from 'lucide-react';
import { useLocation } from 'react-router';
import { Center } from '@astryxdesign/core/Center';
import { EmptyState } from '@astryxdesign/core/EmptyState';

/** Renders a 404 state for an unknown application page. */
export default function ApplicationNotFound() {
    return (
        <Center minHeight="70dvh" width="100%">
            <EmptyState
                description={`The page ${useLocation().pathname} doesn't exist or isn't available.`}
                headingLevel={1}
                icon={<Search aria-hidden="true" size={24} />}
                title="We can't find that page"
            />
        </Center>
    );
}
