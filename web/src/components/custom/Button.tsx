import { useContext } from 'react';
import type { ComponentProps } from 'react';
import { ActionButton } from './ActionButton';
import { ReportedError } from '@/lib/reported';
import { isCanceledRequest } from '@/lib/errors';
import { LinkNavigationContext } from '../ui/contexts';

type ButtonProps = ComponentProps<typeof ActionButton>;

/** Adds async loading, duplicate activation protection, reported-error recovery, and scoped href navigation to shadcn Button. */
export function Button({ onClick, ...props }: ButtonProps) {
    const navigate = useContext(LinkNavigationContext)?.navigate;

    // Scoped navigation runs after the synchronous handler so it can cancel the destination.
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
                              if (!(error instanceof ReportedError) && !isCanceledRequest(error)) throw error;
                          }
                      }
                    : undefined
            }
        />
    );
}
