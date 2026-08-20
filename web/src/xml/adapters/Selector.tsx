import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { Selector as AstryxSelector } from '@astryxdesign/core/Selector';
import { isVisibleXmlNode, requireXmlString, resolveXml } from '../core/props';

export function Selector({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => (value == null ? undefined : String(value)));
    const options = nodes
        .filter((node) => node.name === 'SelectorOption' && isVisibleXmlNode(node, ctx))
        .map((node) => {
            const value = requireXmlString(node.params, 'value', ctx, 'SelectorOption');
            const labelValue = resolveXml(node.params, 'label', ctx);
            const label = typeof labelValue === 'string' ? labelValue : value;

            return { value, label };
        });

    // Selectors require at least one serializable option.
    if (options.length === 0) {
        throw new Error('Selector requires at least one SelectorOption');
    }

    const hasClear = resolveXml(props, 'hasClear', ctx) === true;
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const description = resolveXml(props, 'description', ctx);
    const placeholder = resolveXml(props, 'placeholder', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const common = {
        label: requireXmlString(props, 'label', ctx, 'Selector'),
        options,
        htmlName: typeof htmlName === 'string' ? htmlName : undefined,
        description: typeof description === 'string' ? description : undefined,
        placeholder: typeof placeholder === 'string' ? placeholder : undefined,
        labelTooltip: typeof labelTooltip === 'string' ? labelTooltip : undefined,
    };

    // Astryx uses a discriminated value contract for clearable selectors.
    if (hasClear) {
        return (
            <AstryxSelector
                {...common}
                hasClear
                onChange={(value) => binding.setValue(value ?? undefined)}
                value={binding.value ?? null}
            />
        );
    }

    return <AstryxSelector {...common} onChange={binding.setValue} value={binding.value} />;
}
