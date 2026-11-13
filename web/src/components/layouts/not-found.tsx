import { PageError } from '@/components/utils';

/** Renders the shared 404 state for unknown or unavailable routes. */
export default function NotFoundLayout() {
    return (
        <>
            <title>Page Not Found | LongLink</title>
            <meta name="robots" content="noindex, nofollow" />
            <PageError description="This page doesn't exist or isn't available." title="We can't find that page" />
        </>
    );
}
