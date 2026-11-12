import { useGroupPress } from './press';
import { Toolbar } from '@base-ui/react/toolbar';
import { useContext, useRef, type ReactNode } from 'react';
import { ButtonGroupContext, ControlSizeContext } from './contexts';

/** Groups related actions with connected styling and a single keyboard tab stop. */
export function ButtonGroup({
    children,
    label,
    orientation = 'horizontal',
    size: requestedSize,
    isDisabled = false,
}: {
    children?: ReactNode;
    label: string;
    orientation?: 'horizontal' | 'vertical';
    size?: 'sm' | 'md' | 'lg';
    isDisabled?: boolean;
}) {
    const inheritedSize = useContext(ControlSizeContext);
    const size = requestedSize ?? inheritedSize ?? 'md';
    const root = useRef<HTMLDivElement>(null);

    useGroupPress(root, !isDisabled);

    return (
        <ButtonGroupContext value={{ orientation, isDisabled }}>
            <ControlSizeContext value={size}>
                <Toolbar.Root
                    ref={root}
                    className="view-button-group"
                    data-orientation={orientation}
                    data-size={size}
                    role="group"
                    aria-label={label}
                    aria-disabled={isDisabled || undefined}
                    disabled={isDisabled}
                    orientation={orientation}
                    loopFocus
                    onKeyDown={(event) => {
                        if (
                            event.defaultPrevented ||
                            event.altKey ||
                            event.ctrlKey ||
                            event.metaKey ||
                            !['Home', 'End'].includes(event.key)
                        )
                            return;
                        const group = event.currentTarget;

                        if (
                            !(event.target instanceof Element) ||
                            event.target.closest('[role="group"], [role="menu"], [role="dialog"]') !== group
                        )
                            return;

                        const actions = Array.from(group.querySelectorAll<HTMLElement>('button, a[href]')).filter(
                            (action) =>
                                action.closest('[role="group"], [role="menu"], [role="dialog"]') === group &&
                                !action.matches(':disabled, [aria-disabled="true"]') &&
                                !action.closest('[hidden], [inert]')
                        );

                        const target = event.key === 'Home' ? actions[0] : actions.at(-1);

                        if (target) {
                            event.preventDefault();
                            target.focus();
                        }
                    }}
                >
                    {children}
                </Toolbar.Root>
            </ControlSizeContext>
        </ButtonGroupContext>
    );
}
