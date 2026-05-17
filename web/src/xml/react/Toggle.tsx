import { Toggle as UIToggle } from '@/components/ui/toggle';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { getVersion, useSnapshot } from 'valtio';

/** Props accepted by the XML Toggle component. */
export interface ToggleProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    defaultPressed?: boolean;
    disabled?: boolean;
    id?: string;
    pressed?: boolean | Record<string, unknown>;
    size?: 'sm' | 'default' | 'lg';
    variant?: 'default' | 'outline';
}

/** Renders a shadcn-backed toggle with optional reactive state binding. */
export function Toggle({ children, className, defaultPressed, disabled, id, pressed, size = 'default', variant = 'default' }: ToggleProps) {
    const { ctx } = useXmlContext();

    if (pressed && typeof pressed === 'object' && getVersion(pressed) !== undefined) {
        const state = pressed as Record<string, unknown> & { value?: unknown };
        const snapshot = useSnapshot(state);
        const currentPressed = 'value' in snapshot ? snapshot.value : snapshot;

        return (
            <UIToggle
                className={className}
                defaultPressed={defaultPressed}
                disabled={disabled}
                id={id}
                onPressedChange={(nextPressed) => {
                    if ('value' in state) {
                        state.value = nextPressed;
                    }
                }}
                pressed={Boolean(currentPressed)}
                size={size}
                variant={variant}
            >
                {renderNode(children ?? null, ctx)}
            </UIToggle>
        );
    }

    return (
        <UIToggle className={className} defaultPressed={defaultPressed} disabled={disabled} id={id} size={size} variant={variant}>
            {renderNode(children ?? null, ctx)}
        </UIToggle>
    );
}
