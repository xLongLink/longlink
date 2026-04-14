import type { ExecutionContext } from '../types';

type ExecutionContextInput = Partial<ExecutionContext>;

export function createContext(initial: ExecutionContextInput = {}): ExecutionContext {
    return {
        state: initial.state ?? {},
        queries: initial.queries ?? {},
        scope: initial.scope ?? {},
    };
}
