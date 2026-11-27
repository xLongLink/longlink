import type { DevelopmentUser } from '@/views/manifest';

export const developmentCookie = 'longlink-development-user';

/** Resolves the saved user ID to the current manifest identity, preferring write access by default. */
export function getDevelopmentUser(users: readonly DevelopmentUser[]): DevelopmentUser | undefined {
    const cookie = document.cookie.split('; ').find((value) => value.startsWith(`${developmentCookie}=`));
    const value = cookie?.slice(developmentCookie.length + 1);
    let userId: unknown;

    if (value) {
        try {
            const profile: unknown = JSON.parse(decodeURIComponent(value));

            if (typeof profile === 'object' && profile !== null && 'user' in profile) {
                const { user } = profile;

                if (typeof user === 'object' && user !== null && 'id' in user) userId = user.id;
            }
        } catch {
            // Invalid cookies fall back to an available manifest user.
        }
    }

    return (
        users.find((profile) => profile.user.id === userId) ??
        users.find((profile) => profile.role === 'write') ??
        users[0]
    );
}

/** Sends the manifest-defined identity only to the local Solution server. */
export function setDevelopmentUser(profile: DevelopmentUser): void {
    document.cookie = `${developmentCookie}=${encodeURIComponent(JSON.stringify(profile))}; Path=/; SameSite=Strict`;
}
