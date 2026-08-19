import type { Props } from '../types';
import { resolveInputStatus } from '../input';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { Selector as AstryxSelector } from '@astryxdesign/core/Selector';
import { isVisibleXmlNode, isXmlEnum, requireXmlString, resolveXml } from '../core/props';
import { FIELD_STATUS_VARIANTS, LAYER_PLACEMENTS, SELECTOR_VARIANTS, SIZES } from '../constants';

export function Selector({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => (value == null ? undefined : String(value)));
    const size = resolveXml(props, 'size', ctx);
    const width = resolveXml(props, 'width', ctx);
    const variant = resolveXml(props, 'variant', ctx);
    const options = nodes
        .filter((node) => node.name === 'SelectorOption' && isVisibleXmlNode(node, ctx))
        .map((node) => {
            const value = requireXmlString(node.params, 'value', ctx, 'SelectorOption');
            const labelValue = resolveXml(node.params, 'label', ctx);
            const label = typeof labelValue === 'string' ? labelValue : value;
            const disabledValue = resolveXml(node.params, 'isDisabled', ctx);

            return { value, label, disabled: typeof disabledValue === 'boolean' ? disabledValue : undefined };
        });

    // Selectors require at least one serializable option.
    if (options.length === 0) {
        throw new Error('Selector requires at least one SelectorOption');
    }

    const hasClear = resolveXml(props, 'hasClear', ctx) === true;
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const hasSearch = resolveXml(props, 'hasSearch', ctx);
    const isLoading = resolveXml(props, 'isLoading', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const description = resolveXml(props, 'description', ctx);
    const placeholder = resolveXml(props, 'placeholder', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const placement = resolveXml(props, 'placement', ctx);
    const isDefaultOpen = resolveXml(props, 'isDefaultOpen', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const statusVariant = resolveXml(props, 'statusVariant', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);
    const searchPlaceholder = resolveXml(props, 'searchPlaceholder', ctx);

    if (!isXmlEnum(size, [undefined, ...SIZES])) {
        throw new Error(`Unsupported Selector size '${String(size)}'`);
    }

    if (!isXmlEnum(statusVariant, [undefined, ...FIELD_STATUS_VARIANTS])) {
        throw new Error(`Unsupported Selector statusVariant '${String(statusVariant)}'`);
    }

    if (!isXmlEnum(placement, [undefined, ...LAYER_PLACEMENTS])) {
        throw new Error(`Unsupported Selector placement '${String(placement)}'`);
    }

    if (!isXmlEnum(variant, [undefined, ...SELECTOR_VARIANTS])) {
        throw new Error(`Unsupported Selector variant '${String(variant)}'`);
    }
    const common = {
        size,
        label: requireXmlString(props, 'label', ctx, 'Selector'),
        value: binding.value,
        width: typeof width === 'string' || typeof width === 'number' ? width : undefined,
        status: resolveInputStatus(props, ctx),
        options,
        variant,
        htmlName: typeof htmlName === 'string' ? htmlName : undefined,
        hasSearch: typeof hasSearch === 'boolean' ? hasSearch : undefined,
        isLoading: typeof isLoading === 'boolean' ? isLoading : undefined,
        isDisabled: typeof isDisabled === 'boolean' ? isDisabled : undefined,
        isOptional: typeof isOptional === 'boolean' ? isOptional : undefined,
        isRequired: typeof isRequired === 'boolean' ? isRequired : undefined,
        description: typeof description === 'string' ? description : undefined,
        placeholder: typeof placeholder === 'string' ? placeholder : undefined,
        labelTooltip: typeof labelTooltip === 'string' ? labelTooltip : undefined,
        placement,
        isDefaultOpen: typeof isDefaultOpen === 'boolean' ? isDefaultOpen : undefined,
        isLabelHidden: typeof isLabelHidden === 'boolean' ? isLabelHidden : undefined,
        statusVariant,
        disabledMessage: typeof disabledMessage === 'string' ? disabledMessage : undefined,
        searchPlaceholder: typeof searchPlaceholder === 'string' ? searchPlaceholder : undefined,
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
