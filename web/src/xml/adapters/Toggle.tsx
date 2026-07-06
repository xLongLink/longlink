import { Toggle as UIToggle } from '@/components/ui/toggle';
import { useXmlContext } from '@/xml/core/context';
import { renderNode } from '@/xml/core/node';
import type { Props } from '@/xml/types';
import { resolveXmlBoolean, resolveXmlString, resolveXmlValue, useXmlValueSnapshot } from './props';

/** Props accepted by the XML Toggle component. */

/** Renders a shadcn-backed toggle. */
export function Toggle({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const defaultPressed = resolveXmlBoolean(props, 'defaultPressed', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const id = resolveXmlString(props, 'id', ctx);
    const pressed = resolveXmlValue(props, 'pressed', ctx);
    const size = resolveXmlString(props, 'size', ctx, 'default');
    const variant = resolveXmlString(props, 'variant', ctx, 'default');
    const { state, snapshot } = useXmlValueSnapshot(pressed);

    if (state) {
        const currentValue =
            snapshot && typeof snapshot === 'object' && 'value' in snapshot ? snapshot.value : snapshot;

        return (
            <UIToggle
                disabled={disabled}
                id={id}
                onPressedChange={(nextPressed) => {
                    if ('value' in state) state.value = nextPressed;
                }}
                pressed={Boolean(currentValue)}
                size={size}
                variant={variant}
            >
                {renderNode(nodes, ctx)}
            </UIToggle>
        );
    }

    if (pressed !== undefined) {
        return (
            <UIToggle
                disabled={disabled}
                id={id}
                onPressedChange={() => {}}
                pressed={Boolean(pressed)}
                size={size}
                variant={variant}
            >
                {renderNode(nodes, ctx)}
            </UIToggle>
        );
    }

    return (
        <UIToggle defaultPressed={defaultPressed} disabled={disabled} id={id} size={size} variant={variant}>
            {renderNode(nodes, ctx)}
        </UIToggle>
    );
}
