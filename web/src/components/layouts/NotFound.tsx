import { Seo } from '@/components/Seo';
import { PageError } from '@/components/Utils';

/** Renders the shared 404 state for unknown or unavailable routes. */
export default function NotFoundLayout() {
    return (
        <>
            <Seo isIndexable={false} title="Page Not Found | LongLink" />
            <PageError description="This page doesn't exist or isn't available." title="We can't find that page" />
        </>
    );
}
