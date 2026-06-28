import { CodeBlock } from '@/components/CodeBlock';
import { useXmlContext } from '@xml/core/context';
import { resolveTranslation } from '@xml/core/i18n';
import type { Props } from '@xml/types';
import { readXmlProp } from './props';

/** Renders a code block with syntax highlighting for documentation. */
export function Pre({ props }: Props) {
    const { ctx } = useXmlContext();
    const lang = readXmlProp(props, 'lang') || 'text';
    const text = props.i18n ? resolveTranslation(props, ctx) : '';

    return <CodeBlock language={lang}>{text}</CodeBlock>;
}
