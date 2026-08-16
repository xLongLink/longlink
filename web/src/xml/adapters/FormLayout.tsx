import { FormLayout as AstryxFormLayout } from '@astryxdesign/core/FormLayout';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';

export function FormLayout({ nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();

    return <AstryxFormLayout>{renderNode(nodes, ctx)}</AstryxFormLayout>;
}
