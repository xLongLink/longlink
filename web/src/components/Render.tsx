import { fromXml, renderNode, createContext } from 'reactxml';
import { registry } from '@/lib/registry';

type RenderProps = {
    xml: string;
};

export function Render({ xml }: RenderProps) {
    const ast = fromXml(xml);
    const ctx = createContext();
    return renderNode(ast, registry, ctx);
}

export default Render;
