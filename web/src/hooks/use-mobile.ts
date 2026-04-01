import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
        undefined
    );

    React.useEffect(() => {
        const mediaQuery = window.matchMedia(
            `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
        );

        const updateIsMobile = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };

        mediaQuery.addEventListener('change', updateIsMobile);
        updateIsMobile();

        return () => mediaQuery.removeEventListener('change', updateIsMobile);
    }, []);

    return Boolean(isMobile);
}
