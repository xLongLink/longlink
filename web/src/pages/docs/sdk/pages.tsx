import { Link } from 'react-router';

import { Heading } from '@/components/ui/heading';

/** Renders the SDK Pages documentation overview. */
function PagesContent() {
    return (
        <div className="flex flex-col gap-4">
            <Heading id="pages" level="h1">
                Pages
            </Heading>
            <p className="leading-7">Pages define the UI for application workflows.</p>
            <p className="leading-7">
                The XML layout and component references now live on dedicated docs pages so they can be linked directly.
            </p>
            <ul className="ml-6 list-disc space-y-2">
                <li>
                    <Link className="text-foreground underline underline-offset-4" to="/docs/sdk/pages/layout">
                        XML Layout
                    </Link>
                </li>
                <li>
                    <Link className="text-foreground underline underline-offset-4" to="/docs/sdk/pages/components">
                        XML Components
                    </Link>
                </li>
            </ul>
        </div>
    );
}

export const metadata = {
    lastUpdated: '2026-06-27',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/pages.tsx',
};

export const content = <PagesContent />;
