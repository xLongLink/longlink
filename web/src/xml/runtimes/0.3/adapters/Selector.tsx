import type { FieldStatusVariant } from '@astryxdesign/core-0-3/Field';
import type { LayerPlacement } from '@astryxdesign/core-0-3/Layer';
import { Selector as AstryxSelector, type SelectorSize } from '@astryxdesign/core-0-3/Selector';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { isVisibleXmlNode, requireXmlString, resolveXml } from '../core/props';
import type { Props } from '../types';
import { resolveInputStatus } from './input';

/** Renders a data-oriented Astryx selector from SelectorOption children. */
export function Selector({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => (value == null ? null : String(value)));
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
    const placement = resolveXml(props, 'placement', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const description = resolveXml(props, 'description', ctx);
    const placeholder = resolveXml(props, 'placeholder', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const isDefaultOpen = resolveXml(props, 'isDefaultOpen', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const statusVariant = resolveXml(props, 'statusVariant', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);
    const searchPlaceholder = resolveXml(props, 'searchPlaceholder', ctx);

    if (size != null && size !== 'sm' && size !== 'md' && size !== 'lg') {
        throw new Error(`Unsupported Selector size '${String(size)}'`);
    }

    if (
        placement != null &&
        placement !== 'above' &&
        placement !== 'below' &&
        placement !== 'start' &&
        placement !== 'end'
    ) {
        throw new Error(`Unsupported Selector placement '${String(placement)}'`);
    }

    if (
        statusVariant != null &&
        statusVariant !== 'attached' &&
        statusVariant !== 'detached' &&
        statusVariant !== 'tooltip'
    ) {
        throw new Error(`Unsupported Selector statusVariant '${String(statusVariant)}'`);
    }

    if (variant != null && variant !== 'input' && variant !== 'ghost') {
        throw new Error(`Unsupported Selector variant '${String(variant)}'`);
    }
    const selectorSize: SelectorSize | undefined = size === 'sm' || size === 'md' || size === 'lg' ? size : undefined;
    const selectorPlacement: LayerPlacement | undefined =
        placement === 'above' || placement === 'below' || placement === 'start' || placement === 'end'
            ? placement
            : undefined;
    const selectorStatusVariant: FieldStatusVariant | undefined =
        statusVariant === 'attached' || statusVariant === 'detached' || statusVariant === 'tooltip'
            ? statusVariant
            : undefined;
    const selectorVariant: 'input' | 'ghost' | undefined =
        variant === 'input' || variant === 'ghost' ? variant : undefined;
    const common = {
        size: selectorSize,
        label: requireXmlString(props, 'label', ctx, 'Selector'),
        value: binding.value,
        width: typeof width === 'string' || typeof width === 'number' ? width : undefined,
        status: resolveInputStatus(props, ctx),
        options,
        variant: selectorVariant,
        htmlName: typeof htmlName === 'string' ? htmlName : undefined,
        hasSearch: typeof hasSearch === 'boolean' ? hasSearch : undefined,
        isLoading: typeof isLoading === 'boolean' ? isLoading : undefined,
        placement: selectorPlacement,
        isDisabled: typeof isDisabled === 'boolean' ? isDisabled : undefined,
        isOptional: typeof isOptional === 'boolean' ? isOptional : undefined,
        isRequired: typeof isRequired === 'boolean' ? isRequired : undefined,
        description: typeof description === 'string' ? description : undefined,
        placeholder: typeof placeholder === 'string' ? placeholder : undefined,
        labelTooltip: typeof labelTooltip === 'string' ? labelTooltip : undefined,
        isDefaultOpen: typeof isDefaultOpen === 'boolean' ? isDefaultOpen : undefined,
        isLabelHidden: typeof isLabelHidden === 'boolean' ? isLabelHidden : undefined,
        statusVariant: selectorStatusVariant,
        disabledMessage: typeof disabledMessage === 'string' ? disabledMessage : undefined,
        searchPlaceholder: typeof searchPlaceholder === 'string' ? searchPlaceholder : undefined,
    };

    // Astryx uses a discriminated value contract for clearable selectors.
    if (hasClear) {
        return <AstryxSelector {...common} hasClear onChange={binding.setValue} />;
    }

    return <AstryxSelector {...common} onChange={binding.setValue} value={binding.value ?? undefined} />;
}

/** Marks a data option consumed by its nearest Selector. */
export function SelectorOption(): never {
    throw new Error('SelectorOption must be used inside Selector');
}
