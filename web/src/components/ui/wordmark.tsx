/** Renders the LongLink wordmark in the surrounding theme. */
export function Wordmark({ mode }: { mode?: 'light' | 'dark' }) {
    // Size the tightly cropped asset relative to the existing wordmark typography.
    return (
        <span className="inline-flex align-middle text-2xl leading-none">
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
