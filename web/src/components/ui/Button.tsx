import { useContext } from 'react';
import { LinkNavigationContext } from './Link';
import { Icon, type StoneIconName } from './Icon';
import type { MouseEvent, ReactNode } from 'react';
import { useSize } from '@astryxdesign/core/SizeContext';
import { Button as AstryxButton } from '@astryxdesign/core/Button';

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
    tooltip?: string;
    width?: number | string;
    disabled?: boolean;
    /** Solution-relative destination; sandbox links navigate through the host. */
    href?: string;
    /** Runs an action with automatic async loading and duplicate-click prevention until its promise settles. */
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
};

/** Gives onClick automatic asynchronous loading and duplicate-click prevention. */
export function Button({ onClick, ...props }: ButtonProps) {
    // Preserve container sizing before falling back to the standard medium button.
    const size = useSize(props.size, 'md');
    const navigate = useContext(LinkNavigationContext);

    // Standardize advanced behavior even when untyped JSX supplies unsupported props.
    return (
        <AstryxButton
            {...props}
            icon={props.icon ? <Icon icon={props.icon} size={size} /> : undefined}
            variant={props.variant ?? 'secondary'}
            size={size}
            type={props.type ?? 'button'}
            isDisabled={props.disabled ?? false}
            href={navigate ? undefined : props.href}
            children={undefined}
            isIconOnly={false}
            target={undefined}
            rel={undefined}
            onClick={undefined}
            clickAction={
                onClick || (navigate && props.href)
                    ? (event) => {
                          // Run the action first so it can cancel ordinary scoped navigation.
                          const result = onClick?.(event);
                          if (navigate && props.href && !event.defaultPrevented) {
                              event.preventDefault();
                              navigate(props.href);
                          }
                          return result;
                      }
                    : undefined
            }
            elevation="none"
            isLoading={false}
            isInterruptible={false}
        />
    );
}
