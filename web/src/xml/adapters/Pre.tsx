import { CodeBlock } from '@/components/CodeBlock';
import type { Props } from '@xml/types';
import { readXmlProp } from './props';

/** Renders a code block with syntax highlighting for documentation. */
export function Pre({ props, nodes }: Props) {
    const lang = readXmlProp(props, 'lang') || 'text';
    const text = nodes
        .map((node) => {
            if (node.name === 'Text') {
                return String(node.params?.value ?? '');
            }
            return '';
        })
        .join('');

    return <CodeBlock language={lang}>{text}</CodeBlock>;
}
