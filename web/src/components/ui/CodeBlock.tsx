import { CodeBlock as AstryxCodeBlock } from '@astryxdesign/core/CodeBlock';

/** Displays source code using standard copy and highlighting behavior. */
export function CodeBlock(props: { code: string; language?: string; title?: string; isWrapped?: boolean }) {
    return <AstryxCodeBlock {...props} />;
}
