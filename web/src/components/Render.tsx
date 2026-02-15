import Button from '@/components/viavai/Button';
import Dialog from '@/components/viavai/Dialog';
import Hero from '@/components/viavai/Hero';
import Layout from '@/components/viavai/Layout';

type RenderNodeSchema = {
    type: string;
    props?: Record<string, unknown>;
    children?: RenderNodeSchema[];
};

const registry: Record<string, any> = {
    layout: Layout,
    dialog: Dialog,
    hero: Hero,
    button: Button,
};

function RenderNode(node: any) {
    const Component = registry[node.type];

    if (!Component) {
        return null;
    }

    return (
        <Component {...node.props}>
            {node.children?.map((child: any, i: number) => (
                <RenderNode key={i} {...child} />
            ))}
        </Component>
    );
}

type RenderProps = {
    node: RenderNodeSchema;
};

export function Render({ node }: RenderProps) {
    return <RenderNode {...node} />;
}

export { registry };

export default Render;
