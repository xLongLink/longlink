import { Link as AstryxLink } from '@astryxdesign/core/Link';
import { createContext, useContext, type ReactNode } from 'react';

// The sandbox supplies a host navigation capability; native previews use ordinary links.
export const LinkNavigationContext = createContext<((path: string) => void) | null>(null);

/** Navigates within the Solution or opens an external HTTP(S) URL in a new tab. */
export function Link({
    to,
    children,
    hidden,
}: {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
    to: string;
    children?: ReactNode;
}) {
    const navigate = useContext(LinkNavigationContext);

    // Delegate sandbox navigation to the bridge instead of loading a page in the frame.
    return (
        <AstryxLink
            hidden={hidden}
            className={hidden ? 'hidden!' : undefined}
            href={to}
            onClick={
                navigate
                    ? (event) => {
                          event.preventDefault();
                          navigate(to);
                      }
                    : undefined
            }
        >
            {children}
        </AstryxLink>
    );
}
