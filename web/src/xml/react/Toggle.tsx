import { Toggle as UIToggle } from '@/components/ui/toggle';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Toggle component. */
export interface ToggleProps {
    children?: ASTNode[];
    defaultPressed?: boolean;
    disabled?: boolean;
    id?: string;
    onPressedChange?: (pressed: boolean) => void;
    pressed?: boolean;
    size?: 'sm' | 'default' | 'lg';
    variant?: 'default' | 'outline';
}

/** Renders a shadcn-backed toggle. */
export function Toggle({
    children,
    defaultPressed,
    disabled,
    id,
    onPressedChange,
    pressed,
    size = 'default',
    variant = 'default',
}: ToggleProps) {
    const { ctx } = useXmlContext();

    if (pressed !== undefined) {
        return (
            <UIToggle
                disabled={disabled}
                id={id}
                onPressedChange={onPressedChange}
                pressed={pressed}
                size={size}
                variant={variant}
            >
                {renderNode(children ?? [], ctx)}
            </UIToggle>
        );
    }

    return (
        <UIToggle defaultPressed={defaultPressed} disabled={disabled} id={id} size={size} variant={variant}>
            {renderNode(children ?? [], ctx)}
        </UIToggle>
    );
}
