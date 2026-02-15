import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { apiFetch } from '@/lib/api';

export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    oauth_github_id?: number | null;
    date_creation?: string;
};

type UserContextValue = {
    user: User | null;
    isLoading: boolean;
    refreshUser: () => Promise<void>;
    signOut: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        try {
            const response = await apiFetch<User>('/user', {
                credentials: 'include',
            });
            setUser(response);
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const refreshUser = useCallback(async () => {
        setIsLoading(true);
        await fetchUser();
    }, [fetchUser]);

    const signOut = useCallback(async () => {
        try {
            await apiFetch('/logout', {
                method: 'GET',
                credentials: 'include',
            });
        } finally {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        void fetchUser();
    }, [fetchUser]);

    const value = useMemo(
        () => ({
            user,
            isLoading,
            refreshUser,
            signOut,
        }),
        [isLoading, refreshUser, signOut, user]
    );

    return (
        <UserContext.Provider value={value}>{children}</UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider.');
    }
    return context;
}
