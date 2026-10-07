import { Stack } from '@astryxdesign/core/Stack';
import { useTheme } from '@astryxdesign/core/theme';

const wordmarkSizeClasses = {
    default: ' text-base',
    heading: ' text-2xl',
    inherit: '',
};

/** Renders the hand-drawn LongLink wordmark in the surrounding theme and text size. */
export function Wordmark({ size = 'default' }: { size?: 'default' | 'heading' | 'inherit' }) {
    // Match the image to the nearest theme, including light-mode brand previews.
    const { mode } = useTheme();

    // Size the tightly cropped asset relative to the existing wordmark typography.
    return (
        <Stack
            as="span"
            className={`inline-flex align-middle leading-none${wordmarkSizeClasses[size]}`}
            direction="horizontal"
        >
            <img
                alt="LongLink"
                className="block h-lh w-auto max-w-none"
                height={286}
                src={`/images/longlink-wordmark-${mode}.png`}
                width={1781}
            />
        </Stack>
    );
}
