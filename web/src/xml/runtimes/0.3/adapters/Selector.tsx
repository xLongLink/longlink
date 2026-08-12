import { Selector as AstryxSelector } from '@astryxdesign/core-0-3/Selector';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { isXmlBoolean, isXmlEnum, isXmlNumber, isXmlString, isVisibleXmlNode, requireXmlString, resolveXml } from '../core/props';
import { resolveInputStatus } from './input';
import type { Props } from '../types';

const FIELD_STATUS_VARIANTS = ['attached', 'detached', 'tooltip'] as const;
const LAYER_PLACEMENTS = ['above', 'below', 'start', 'end'] as const;
const SELECTOR_SIZES = ['sm', 'md', 'lg'] as const;
const SELECTOR_VARIANTS = ['input', 'ghost'] as const;

/** Renders a data-oriented Astryx selector from SelectorOption children. */
export function Selector({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => (value == null ? null : String(value)));
    const size = resolveXml(props, 'size', ctx);
    const width = resolveXml(props, 'width', ctx);
    const options = nodes
        .filter((node) => node.name === 'SelectorOption' && isVisibleXmlNode(node, ctx))
        .map((node) => {
            const value = requireXmlString(node.params, 'value', ctx, 'SelectorOption');
            const labelValue = resolveXml(node.params, 'label', ctx);
            const label = isXmlString(labelValue) ? labelValue : value;
            const disabledValue = resolveXml(node.params, 'isDisabled', ctx);

            return { value, label, disabled: isXmlBoolean(disabledValue) ? disabledValue : undefined };
        });

    // Selectors require at least one serializable option.
    if (options.length === 0) {
        throw new Error('Selector requires at least one SelectorOption');
    }

    const hasClear = resolveXml(props, 'hasClear', ctx) === true;
    const description = resolveXml(props, 'description', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);
    const hasSearch = resolveXml(props, 'hasSearch', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const isDefaultOpen = resolveXml(props, 'isDefaultOpen', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const isLoading = resolveXml(props, 'isLoading', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const placement = resolveXml(props, 'placement', ctx);
    const placeholder = resolveXml(props, 'placeholder', ctx);
    const searchPlaceholder = resolveXml(props, 'searchPlaceholder', ctx);
    const statusVariant = resolveXml(props, 'statusVariant', ctx);
    const variant = resolveXml(props, 'variant', ctx);

    if (size != null && !isXmlEnum(size, SELECTOR_SIZES)) throw new Error(`Unsupported Selector size '${String(size)}'`);
    if (placement != null && !isXmlEnum(placement, LAYER_PLACEMENTS)) throw new Error(`Unsupported Selector placement '${String(placement)}'`);
    if (statusVariant != null && !isXmlEnum(statusVariant, FIELD_STATUS_VARIANTS)) throw new Error(`Unsupported Selector statusVariant '${String(statusVariant)}'`);
    if (variant != null && !isXmlEnum(variant, SELECTOR_VARIANTS)) throw new Error(`Unsupported Selector variant '${String(variant)}'`);
    const common = {
        description: isXmlString(description) ? description : undefined,
        disabledMessage: isXmlString(disabledMessage) ? disabledMessage : undefined,
        hasSearch: isXmlBoolean(hasSearch) ? hasSearch : undefined,
        htmlName: isXmlString(htmlName) ? htmlName : undefined,
        isDisabled: isXmlBoolean(isDisabled) ? isDisabled : undefined,
        isDefaultOpen: isXmlBoolean(isDefaultOpen) ? isDefaultOpen : undefined,
        isLabelHidden: isXmlBoolean(isLabelHidden) ? isLabelHidden : undefined,
        isLoading: isXmlBoolean(isLoading) ? isLoading : undefined,
        isOptional: isXmlBoolean(isOptional) ? isOptional : undefined,
        isRequired: isXmlBoolean(isRequired) ? isRequired : undefined,
        label: requireXmlString(props, 'label', ctx, 'Selector'),
        labelTooltip: isXmlString(labelTooltip) ? labelTooltip : undefined,
        options,
        placement,
        placeholder: isXmlString(placeholder) ? placeholder : undefined,
        searchPlaceholder: isXmlString(searchPlaceholder) ? searchPlaceholder : undefined,
        size,
        status: resolveInputStatus(props, ctx),
        statusVariant,
        variant,
        width: isXmlString(width) || isXmlNumber(width) ? width : undefined,
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
