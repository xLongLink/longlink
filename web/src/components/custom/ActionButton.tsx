import { useContext } from 'react';
import type { ComponentProps } from 'react';
import { ReportedError } from '@/lib/reported';
import { ActionControl } from './ActionControl';
import { isCanceledRequest } from '@/lib/errors';
import { LinkNavigationContext } from './contexts';

type ButtonProps = ComponentProps<typeof ActionControl>;

/** Adds async loading, duplicate activation protection, reported-error recovery, and scoped href navigation to shadcn Button. */
export function ActionButton({ onClick, ...props }: ButtonProps) {
    const navigate = useContext(LinkNavigationContext)?.navigate;

    // Scoped navigation runs after the synchronous handler so it can cancel the destination.
    return (
        <ActionControl
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
                              if (!(error instanceof ReportedError) && !isCanceledRequest(error)) throw error;
                          }
                      }
                    : undefined
            }
        />
    );
}
