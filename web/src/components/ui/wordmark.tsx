import { useAppearance } from '@/lib/hooks/use-appearance';
import { useMediaQuery } from '@/lib/hooks/use-media-query';

const wordmarkSizeClasses = { default: ' text-base', heading: ' text-2xl' };

/** Renders the LongLink wordmark in the surrounding theme and text size. */
export function Wordmark({ size = 'default', mode }: { size?: 'default' | 'heading'; mode?: 'light' | 'dark' }) {
    const { appearance } = useAppearance();
    const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
    const resolvedMode = mode ?? (appearance.theme === 'system' ? (prefersDark ? 'dark' : 'light') : appearance.theme);

    // Size the tightly cropped asset relative to the existing wordmark typography.
    return (
        <span className={`inline-flex align-middle leading-none${wordmarkSizeClasses[size]}`}>
            <img
                alt="LongLink"
                className="block h-lh w-auto max-w-none"
                height={291}
                src={`/images/longlink-wordmark-${resolvedMode}.png`}
                width={1939}
            />
        </span>
    );
}
