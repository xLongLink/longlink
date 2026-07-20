import { useState } from 'react';
import { Selector as AstryxSelector, type SelectorOptionType } from '@astryxdesign/core/Selector';
import type { ASTNode, ExecutionContext, Props } from '@/xml/types';
import { evaluate } from '@/xml/expressions';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { useBindableValue } from './binding';
import {
    requireXmlString,
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlLabel,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from './props';

/** Renders a data-oriented Astryx selector from SelectorOption children. */
export function Selector({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const binding = useBindableValue(props, 'value', ctx);
    const initialValue = binding.initialValue == null ? null : String(binding.initialValue);
    const [localValue, setLocalValue] = useState<string | null>(initialValue);
    const currentValue = binding.currentValue == null ? null : String(binding.currentValue);
    const value = binding.bound ? currentValue : localValue;
    const options = nodes
        .filter((node) => node.name === 'SelectorOption' && isVisibleNode(node, ctx))
        .map((node) => resolveOption(node, ctx));

    // Selectors require at least one serializable option.
    if (options.length === 0) {
        throw new Error('Selector requires at least one SelectorOption');
    }

    const hasClear = resolveXmlBoolean(props, 'hasClear', ctx, false) === true;
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
        label: resolveXmlLabel(props, ctx, 'Selector'),
        options,
        placeholder: resolveXmlString(props, 'placeholder', ctx) || undefined,
        searchPlaceholder: resolveXmlString(props, 'searchPlaceholder', ctx) || undefined,
        size,
        status: resolveXmlStatus(props, ctx),
        width: resolveXmlSizeValue(props, 'width', ctx),
    };

    /** Writes selection changes to bound or local state. */
    function setValue(nextValue: string | null) {
        if (binding.bound) binding.setValue(nextValue);
        else setLocalValue(nextValue);
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
function resolveOption(node: ASTNode, ctx: ExecutionContext): SelectorOptionType {
    const props = node.params ?? {};
    const value = requireXmlString(props, 'value', ctx, 'SelectorOption');
    const label = props.i18n ? resolveTranslation(props, ctx) : resolveXmlString(props, 'label', ctx, value);
    const disabled = resolveXmlBoolean(props, 'isDisabled', ctx, false);

    return { value, label, disabled };
}

/** Evaluates conditional rendering for an adapter-consumed option node. */
function isVisibleNode(node: ASTNode, ctx: ExecutionContext): boolean {
    if (node.params?.if == null) return true;

    return Boolean(evaluate(node.params.if, ctx));
}
