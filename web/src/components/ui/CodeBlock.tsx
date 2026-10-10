import { CodeBlock as AstryxCodeBlock } from '@astryxdesign/core/CodeBlock';

/** Displays source code using standard copy and highlighting behavior. */
export function CodeBlock(props: {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
    code: string;
    language?: string;
    title?: string;
    isWrapped?: boolean;
}) {
    // Render plain, unwrapped text unless a language or wrapping is requested.
    return (
        <AstryxCodeBlock
            {...props}
            className={props.hidden ? 'hidden!' : undefined}
            language={props.language ?? 'plaintext'}
            isWrapped={props.isWrapped ?? false}
        />
    );
}
