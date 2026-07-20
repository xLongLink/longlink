/** Warns visitors that the hosted LongLink environment is still under development. */
export function DevelopmentNotice() {
    return (
        <aside className="relative z-30 border-b border-amber-500/20 bg-amber-500/10 px-4 py-1 text-amber-100/75">
            <p className="mx-auto max-w-5xl text-center text-[11px] leading-4 sm:text-xs">
                LongLink is still in development. Data may be reset between deployments.{' '}
                <a
                    href="https://github.com/xLongLink/longlink"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-amber-100 underline underline-offset-2 hover:text-amber-50"
                >
                    Star LongLink on GitHub.
                </a>
            </p>
        </aside>
    );
}
