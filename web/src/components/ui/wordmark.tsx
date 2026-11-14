const wordmarkSizeClasses = { default: ' text-base', heading: ' text-2xl' };

/** Renders the LongLink wordmark in the surrounding theme and text size. */
export function Wordmark({ size = 'default', mode }: { size?: 'default' | 'heading'; mode?: 'light' | 'dark' }) {
    // Size the tightly cropped asset relative to the existing wordmark typography.
    return (
        <span className={`inline-flex align-middle leading-none${wordmarkSizeClasses[size]}`}>
            {(mode ? [mode] : ['light', 'dark']).map((imageMode) => (
                <img
                    key={imageMode}
                    alt="LongLink"
                    className={`h-lh w-auto max-w-none ${mode ? 'block' : imageMode === 'light' ? 'block dark:hidden' : 'hidden dark:block'}`}
                    height={291}
                    src={`/images/longlink-wordmark-${imageMode}.png`}
                    width={1939}
                />
            ))}
        </span>
    );
}
