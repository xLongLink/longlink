import { CodeBlock as AstryxCodeBlock } from '@/components/astryx/CodeBlock';

/** Displays source code using standard copy and highlighting behavior. */
export function CodeBlock(props: {
    code: string;
    language?: string;
    title?: string;
    isWrapped?: boolean;
    hasLineNumbers?: boolean;
    highlightLines?: number[];
    hasCopyButton?: boolean;
    maxHeight?: number | string;
    size?: 'sm' | 'md';
    isCollapsible?: boolean;
    collapsibleThreshold?: number;
}) {
    // Render plain, unwrapped text unless a language or wrapping is requested.
    return <AstryxCodeBlock {...props} language={props.language ?? 'plaintext'} isWrapped={props.isWrapped ?? false} />;
}
