import { createContext, useContext, type ReactNode } from 'react';
import { renderNode } from '../renderer/renderNode';
import type { ASTNode, ExecutionContext, RegistryShape } from '../types';

type RuntimeState = {
    node: ASTNode;
    ctx: ExecutionContext;
    registry: RegistryShape;
};

const RuntimeContext = createContext<RuntimeState | null>(null);

export function RuntimeProvider({ value, children }: { value: RuntimeState; children: ReactNode }) {
    return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useRuntime(): RuntimeState {
    const runtime = useContext(RuntimeContext);

    if (!runtime) {
        throw new Error('useRuntime must be used inside a rendered ReactXML component');
    }

    return runtime;
}

export function RuntimeChildren() {
    const { node, registry, ctx } = useRuntime();

    return renderNode(node.children, registry, ctx);
}
