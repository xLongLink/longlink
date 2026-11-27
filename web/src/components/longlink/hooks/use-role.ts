import { useContext } from 'react';
import { RoleContext } from '@/lib/view-capabilities';

/** Matches the current Solution role exactly; missing identity never matches. */
export function useRole(role: string): boolean {
    const currentRole = useContext(RoleContext);

    return currentRole !== undefined && currentRole === role;
}
