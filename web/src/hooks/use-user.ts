import { useUserContext } from '@/contexts/user-context';

export function useUser() {
    return useUserContext();
}
