import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { useTheme } from '@astryxdesign/core/theme';

const wordmarkSizeClasses = {
    default: ' text-base',
    full: ' w-full',
    heading: ' text-2xl',
    inherit: '',
};

/** Renders the shared LongLink welcome title used by authentication screens. */
export function Welcome() {
    return (
        <Text display="block" justify="center" textWrap="nowrap" type="inherit">
            Welcome to <Wordmark size="inherit" />
        </Text>
    );
}

/** Renders the hand-drawn LongLink wordmark in the surrounding theme and text size. */
export function Wordmark({ size = 'default' }: { size?: 'default' | 'full' | 'heading' | 'inherit' }) {
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
                className={size === 'full' ? 'block h-auto w-full' : 'block h-lh w-auto max-w-none'}
                height={286}
                src={`/images/longlink-wordmark-${mode}.png`}
                width={1781}
            />
        </Stack>
    );
}
