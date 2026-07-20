import { Stack as AstryxStack } from '@astryxdesign/core/Stack';
import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { resolveXmlBoolean, resolveXmlEnum, resolveXmlSizeValue, resolveXmlSpacing } from './props';

/** Renders an Astryx stack for horizontal or vertical layout. */
export function Stack({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const direction = resolveXmlEnum(props, 'direction', ctx, ['horizontal', 'vertical'], 'vertical', 'Stack');
    const justify = resolveXmlEnum(
        props,
        'justify',
        ctx,
        ['start', 'center', 'end', 'between', 'around', 'evenly'],
        'start',
        'Stack'
    );
    const align = resolveXmlEnum(props, 'align', ctx, ['start', 'center', 'end', 'stretch'], 'stretch', 'Stack');
    const wrap = resolveXmlEnum(props, 'wrap', ctx, ['nowrap', 'wrap', 'wrap-reverse'], 'nowrap', 'Stack');
    const gap = resolveXmlSpacing(props, 'gap', ctx);
    const padding = resolveXmlSpacing(props, 'padding', ctx);
    const paddingInline = resolveXmlSpacing(props, 'paddingInline', ctx);
    const paddingBlock = resolveXmlSpacing(props, 'paddingBlock', ctx);
    const isScrollable = resolveXmlBoolean(props, 'isScrollable', ctx, false);
    const width = resolveXmlSizeValue(props, 'width', ctx);
    const height = resolveXmlSizeValue(props, 'height', ctx);
    const maxWidth = resolveXmlSizeValue(props, 'maxWidth', ctx);
    const minHeight = resolveXmlSizeValue(props, 'minHeight', ctx);

    return (
        <AstryxStack
            align={align}
            direction={direction}
            gap={gap}
            height={height}
            isScrollable={isScrollable}
            justify={justify}
            maxWidth={maxWidth}
            minHeight={minHeight}
            padding={padding}
            paddingBlock={paddingBlock}
            paddingInline={paddingInline}
            width={width}
            wrap={wrap}
        >
            {renderNode(nodes, ctx)}
        </AstryxStack>
    );
}
