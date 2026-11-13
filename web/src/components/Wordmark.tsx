import { useAppearance } from '@/lib/hooks/use-appearance';
import { useMediaQuery } from '@/lib/hooks/use-media-query';

const wordmarkSizeClasses = { default: ' text-base', full: ' w-full', heading: ' text-2xl', inherit: '' };

/** Renders the shared LongLink welcome title used by authentication screens. */
export function Welcome() {
    return (
        <span className="brand-welcome">
            Welcome to <Wordmark size="inherit" />
        </span>
    );
}

/** Renders the hand-drawn LongLink wordmark in the surrounding theme and text size. */
export function Wordmark({
    size = 'default',
    mode
}: {
    size?: 'default' | 'full' | 'heading' | 'inherit';
    mode?: 'light' | 'dark';
}) {
    const { appearance } = useAppearance();
    const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
    const resolvedMode = mode ?? (appearance.theme === 'system' ? (prefersDark ? 'dark' : 'light') : appearance.theme);

    // Size the tightly cropped asset relative to the existing wordmark typography.
    return (
        <span className={`inline-flex align-middle leading-none${wordmarkSizeClasses[size]}`}>
            <img
                alt="LongLink"
                className={size === 'full' ? 'block h-auto w-full' : 'block h-lh w-auto max-w-none'}
                height={286}
                src={`/images/longlink-wordmark-${resolvedMode}.png`}
                width={1781}
            />
        </span>
    );
}
