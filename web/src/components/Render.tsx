import Button from '@/components/viavai/Button';
import Dialog from '@/components/viavai/Dialog';
import Hero from '@/components/viavai/Hero';
import Layout from '@/components/viavai/Layout';


const registry = {
    hero: Hero,
    layout: Layout,
    dialog: Dialog,
    button: Button,
};

type Registry = typeof registry;
type RegistryKey = keyof Registry;


type RenderNodeSchema = {
    type: RegistryKey;
    props?: Record<string, unknown>;
    children?: RenderNodeSchema[];
};


function Render({ type, props, children }: RenderNodeSchema) {
    const Component = registry[type];

    return (
        <Component {...props}>
            {children?.map((child, i) => (
                <Render key={i} {...child} />
            ))}
        </Component>
    );
}


export default Render;
