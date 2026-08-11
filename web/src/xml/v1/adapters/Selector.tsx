import { Selector as AstryxSelector, type SelectorOptionType } from '@astryxdesign/core/Selector';
import { useState } from 'react';
import { setXmlBinding, useBindableValue } from '../core/binding';
import { useXmlContext, useXmlServices } from '../core/context';
import { resolveTranslation } from '../core/i18n';
import {
    requireXmlString,
    isVisibleXmlNode,
    readXmlProp,
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlLabel,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from '../core/props';
import type { ASTNode, Props, Scope } from '../types';

/** Renders a data-oriented Astryx selector from SelectorOption children. */
export function Selector({ props, nodes }: Props) {
    const ctx = useXmlContext();
    const services = useXmlServices();
    const binding = useBindableValue(props, 'value', ctx);
    const [localValue, setLocalValue] = useState<string | null>(
        binding.initialValue == null ? null : String(binding.initialValue)
    );
    const currentValue = binding.currentValue == null ? null : String(binding.currentValue);
    const value = binding.bound ? currentValue : localValue;
    const options = nodes
        .filter((node) => node.name === 'SelectorOption' && isVisibleXmlNode(node, ctx))
        .map((node) => resolveOption(node, ctx, services));

    // Selectors require at least one serializable option.
    if (options.length === 0) {
        throw new Error('Selector requires at least one SelectorOption');
    }

    const hasClear = resolveXmlBoolean(props, 'hasClear', ctx, false);
    const size = resolveXmlEnum(props, 'size', ctx, ['sm', 'md', 'lg'], 'md', 'Selector');
    const common = {
        description: resolveXmlString(props, 'description', ctx) || undefined,
        disabledMessage: resolveXmlString(props, 'disabledMessage', ctx) || undefined,
        hasSearch: resolveXmlBoolean(props, 'hasSearch', ctx, false),
        htmlName: resolveXmlString(props, 'htmlName', ctx) || undefined,
        isDisabled: resolveXmlBoolean(props, 'isDisabled', ctx, false),
        isLabelHidden: resolveXmlBoolean(props, 'isLabelHidden', ctx, false),
        isOptional: resolveXmlBoolean(props, 'isOptional', ctx, false),
        isRequired: resolveXmlBoolean(props, 'isRequired', ctx, false),
        label: resolveXmlLabel(props, ctx, services, 'Selector'),
        options,
        placeholder: resolveXmlString(props, 'placeholder', ctx) || undefined,
        searchPlaceholder: resolveXmlString(props, 'searchPlaceholder', ctx) || undefined,
        size,
        status: resolveXmlStatus(props, ctx),
        width: resolveXmlSizeValue(props, 'width', ctx),
    };

    /** Writes selection changes to bound or local state. */
    function setValue(nextValue: string | null) {
        setXmlBinding(binding, setLocalValue, nextValue);
    }

    // Astryx uses a discriminated value contract for clearable selectors.
    if (hasClear) {
        return <AstryxSelector {...common} hasClear onChange={setValue} value={value} />;
    }

    return <AstryxSelector {...common} onChange={setValue} value={value ?? undefined} />;
}

/** Marks a data option consumed by its nearest Selector. */
export function SelectorOption(): never {
    throw new Error('SelectorOption must be used inside Selector');
}

/** Converts one XML option node into Astryx selector data. */
function resolveOption(node: ASTNode, ctx: Scope, services: ReturnType<typeof useXmlServices>): SelectorOptionType {
    const props = node.params ?? {};
    const value = requireXmlString(props, 'value', ctx, 'SelectorOption');
    const label = readXmlProp(props, 'i18n')
        ? resolveTranslation(props, ctx, services)
        : resolveXmlString(props, 'label', ctx, value);
    return { value, label, disabled: resolveXmlBoolean(props, 'isDisabled', ctx, false) };
}
