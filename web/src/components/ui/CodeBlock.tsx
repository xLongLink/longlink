import { CodeBlock as AstryxCodeBlock } from '@astryxdesign/core/CodeBlock';

/** Displays source code using standard copy and highlighting behavior. */
export function CodeBlock(props: { code: string; language?: string; title?: string; isWrapped?: boolean }) {
    // Render plain, unwrapped text unless a language or wrapping is requested.
    return <AstryxCodeBlock {...props} language={props.language ?? 'plaintext'} isWrapped={props.isWrapped ?? false} />;
}
