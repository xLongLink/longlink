import { useContext } from 'react';
import type { StoneIconName } from './Icon';
import { ActionButton } from './ActionButton';
import { ReportedError } from '@/lib/reported';
import { LinkNavigationContext } from './contexts';
import type { MouseEvent, ReactNode } from 'react';

type ButtonProps = {
    /** Visible button text and accessible label. */
    label: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
    size?: 'sm' | 'md' | 'lg';
    type?: 'button' | 'submit' | 'reset';
    name?: string;
    value?: string | number | readonly string[];
    form?: string;
    icon?: StoneIconName;
    endContent?: ReactNode;
    width?: number | string;
    disabled?: boolean;
    /** Solution-relative destination or HTTP(S) URL to open in a new tab. */
    href?: string;
    /** Runs an action with automatic async loading and duplicate-click prevention until its promise settles. */
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
};

/** Gives onClick automatic asynchronous loading and duplicate-click prevention. */
export function Button({ onClick, ...props }: ButtonProps) {
    const navigate = useContext(LinkNavigationContext)?.navigate;

    // Standardize advanced behavior even when untyped JSX supplies unsupported props.
    return (
        <ActionButton
            {...props}
            href={navigate ? undefined : props.href}
            onClick={
                onClick || (navigate && props.href)
                    ? async (event) => {
                          try {
                              // Run the action first so it can cancel ordinary scoped navigation.
                              const result = onClick?.(event);

                              if (navigate && props.href && !event.defaultPrevented) {
                                  event.preventDefault();
                                  navigate(props.href);
                              }

                              await result;
                          } catch (error) {
                              // Keep the View mounted when the page has already shown the request failure.
                              if (!(error instanceof ReportedError)) throw error;
                          }
                      }
                    : undefined
            }
        />
    );
}
