import { createContext, useContext, useEffect, useState } from 'react';

import {
    SDK_LOCAL_USERS,
    getSdkLocalUser,
    getStoredSdkUserId,
    storeSdkUserId,
    type SdkLocalUser,
} from '@/lib/sdk-users';

type SdkUserContextValue = {
    user: SdkLocalUser;
    users: readonly SdkLocalUser[];
    selectUser: (userId: string) => void;
};

const SdkUserContext = createContext<SdkUserContextValue | undefined>(undefined);

/** Provides the SDK-local user selection to the embedded application runtime. */
export function SdkUserProvider({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = useState(getStoredSdkUserId);
    const user = getSdkLocalUser(userId);

    useEffect(() => {
        storeSdkUserId(user.id);
    }, [user.id]);

    /** Selects a local SDK user by ID from the dropdown value. */
    function selectUser(nextUserId: string): void {
        setUserId(getSdkLocalUser(Number.parseInt(nextUserId, 10)).id);
    }

    return (
        <SdkUserContext.Provider value={{ user, users: SDK_LOCAL_USERS, selectUser }}>
            {children}
        </SdkUserContext.Provider>
    );
}

/** Reads the selected SDK-local user state. */
export function useSdkUser() {
    const context = useContext(SdkUserContext);

    if (context === undefined) {
        throw new Error('useSdkUser must be used within a SdkUserProvider');
    }

    return context;
}
