export type ExecutionContext = {
    state: Record<string, [any, Function]>;
    queries: Record<string, any>;
    scope: Record<string, any>;
};
