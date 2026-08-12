import { Selector as AstryxSelector } from '@astryxdesign/core-0-3/Selector';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import {
    requireXmlString,
    isVisibleXmlNode,
    readXmlProp,
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from '../core/props';
import type { Props } from '../types';

/** Renders a data-oriented Astryx selector from SelectorOption children. */
export function Selector({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => (value == null ? null : String(value)));
    const options = nodes
        .filter((node) => node.name === 'SelectorOption' && isVisibleXmlNode(node, ctx))
        .map((node) => {
            const value = requireXmlString(node.params, 'value', ctx, 'SelectorOption');
            const label = resolveXmlString(node.params, 'label', ctx) ?? value;

            return { value, label, disabled: resolveXmlBoolean(node.params, 'isDisabled', ctx) };
        });

    // Selectors require at least one serializable option.
    if (options.length === 0) {
        throw new Error('Selector requires at least one SelectorOption');
    }

    const hasClear = resolveXmlBoolean(props, 'hasClear', ctx);
    const size = resolveXmlEnum(props, 'size', ctx, ['sm', 'md', 'lg'], 'Selector') ?? 'md';
    const common = {
        description: resolveXmlString(props, 'description', ctx) || undefined,
        disabledMessage: resolveXmlString(props, 'disabledMessage', ctx) || undefined,
        hasSearch: resolveXmlBoolean(props, 'hasSearch', ctx),
        htmlName: resolveXmlString(props, 'htmlName', ctx) || undefined,
        isDisabled: resolveXmlBoolean(props, 'isDisabled', ctx),
        isLabelHidden: resolveXmlBoolean(props, 'isLabelHidden', ctx),
        isOptional: resolveXmlBoolean(props, 'isOptional', ctx),
        isRequired: resolveXmlBoolean(props, 'isRequired', ctx),
        label: requireXmlString(props, 'label', ctx, 'Selector'),
        options,
        placeholder: resolveXmlString(props, 'placeholder', ctx) || undefined,
        searchPlaceholder: resolveXmlString(props, 'searchPlaceholder', ctx) || undefined,
        size,
        status: resolveXmlStatus(props, ctx),
        width: resolveXmlSizeValue(props, 'width', ctx),
    };

    // Astryx uses a discriminated value contract for clearable selectors.
    if (hasClear) {
        return <AstryxSelector {...common} hasClear onChange={binding.setValue} value={binding.value} />;
    }

    return <AstryxSelector {...common} onChange={binding.setValue} value={binding.value ?? undefined} />;
}

/** Marks a data option consumed by its nearest Selector. */
export function SelectorOption(): never {
    throw new Error('SelectorOption must be used inside Selector');
}
