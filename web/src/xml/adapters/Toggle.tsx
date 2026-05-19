import { Toggle as UIToggle } from '@/components/ui/toggle';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { useSnapshot } from 'valtio';
import { isXmlValueState, resolveXmlBoolean, resolveXmlString, resolveXmlValue } from './props';

/** Props accepted by the XML Toggle component. */

/** Renders a shadcn-backed toggle. */
export function Toggle({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const defaultPressed = resolveXmlBoolean(props, 'defaultPressed', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const id = resolveXmlString(props, 'id', ctx);
    const pressed = resolveXmlValue(props, 'pressed', ctx);
    const size = resolveXmlString(props, 'size', ctx, 'default');
    const variant = resolveXmlString(props, 'variant', ctx, 'default');

    if (isXmlValueState(pressed)) {
        const snapshot = useSnapshot(pressed);

        return (
            <UIToggle
                disabled={disabled}
                id={id}
                onPressedChange={(nextPressed) => {
                    if ('value' in pressed) pressed.value = nextPressed;
                }}
                pressed={Boolean('value' in snapshot ? snapshot.value : snapshot)}
                size={size}
                variant={variant}
            >
                {renderNode(children ?? [], ctx)}
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
