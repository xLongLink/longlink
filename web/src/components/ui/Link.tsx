import { Link as AstryxLink } from '@astryxdesign/core/Link';
import { createContext, useContext, type ReactNode } from 'react';

// The sandbox supplies a host navigation capability; native previews use ordinary links.
export const LinkNavigationContext = createContext<((path: string) => void) | null>(null);

/** Displays a destination without granting a View top-level browser navigation. */
export function Link({ to, children }: { to: string; children?: ReactNode }) {
    const navigate = useContext(LinkNavigationContext);

    // Delegate sandbox navigation to the bridge instead of loading a page in the frame.
    return (
        <AstryxLink
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
