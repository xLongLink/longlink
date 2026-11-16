import { switzerlandSource, switzerlandAttribution } from './switzerland';

/** Keeps the required dataset credit beside each canton preview. */
export function SwitzerlandAttribution() {
    return (
        <a
            href={switzerlandSource}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
            {switzerlandAttribution}
        </a>
    );
}
