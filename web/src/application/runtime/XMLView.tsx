import { RenderXML, type ASTNode, type ExecutionContext } from '@/xml';

type XMLViewProps = {
    active: boolean;
    ast: ASTNode[];
    baseUrl: string;
    runtimeKey?: string;
    stateKey: string;
    context: ExecutionContext;
};

/** Renders one parsed XML Application page. */
export function XMLView({ active, ast, baseUrl, runtimeKey, stateKey, context }: XMLViewProps) {
    return (
        <RenderXML
            key={`${runtimeKey ?? 'runtime'}-${stateKey}`}
            active={active}
            ast={ast}
            baseUrl={baseUrl}
            ctx={context}
        />
    );
}
