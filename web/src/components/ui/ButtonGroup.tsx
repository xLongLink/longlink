import { useRef, type ReactNode } from 'react';
import {
    ButtonGroupContext,
    GROUP_PRESS_POINTERS,
    oneTabStopAmong,
    PressGroupContext,
    SizeProvider,
    useGroupPressTracking,
    useInternalListFocus,
    useMergedRefs,
    useSize,
    useTouchPresentation,
} from './group';

const memberSelector = 'button, a[href], [tabindex]';

const boundarySelector = '[role="group"], [popover], [role="menu"], [role="dialog"], dialog';

const tabStopOrder = oneTabStopAmong(memberSelector, boundarySelector);

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
    const size = useSize(requestedSize, 'md');
    const root = useRef<HTMLDivElement>(null);

    const { listRef, handleKeyDown, handleFocus } = useInternalListFocus<HTMLDivElement>({
        itemSelector: memberSelector,
        boundarySelector,
        orientation,
        hasRovingTabIndex: true,
        tabStopOrder,
    });

    const { isTouch } = useTouchPresentation();
    const tracksPress = isTouch && !isDisabled;
    const { hitAreaRef } = useGroupPressTracking(root, tracksPress);

    return (
        <ButtonGroupContext value={{ orientation, isDisabled }}>
            <SizeProvider value={size}>
                <div
                    ref={useMergedRefs(root, listRef, hitAreaRef)}
                    className="view-button-group"
                    data-orientation={orientation}
                    data-size={size}
                    data-tracking={tracksPress || undefined}
                    role="group"
                    aria-label={label}
                    aria-disabled={isDisabled || undefined}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyDown}
                >
                    <PressGroupContext value={tracksPress ? GROUP_PRESS_POINTERS : null}>{children}</PressGroupContext>
                </div>
            </SizeProvider>
        </ButtonGroupContext>
    );
}
