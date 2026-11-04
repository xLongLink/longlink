export const developmentCookie = 'longlink-development-user';

export const developmentUsers = [
    {
        role: 'read',
        user: {
            id: '00000000-0000-0000-0000-000000000002',
            name: 'Read user',
            email: 'read@example.com',
        },
    },
    {
        role: 'write',
        user: {
            id: '00000000-0000-0000-0000-000000000003',
            name: 'Write user',
            email: 'write@example.com',
        },
    },
] as const;

/** Reads the local persona, defaulting to write access for development. */
export function getDevelopmentUser() {
    const cookie = document.cookie.split('; ').find((value) => value.startsWith(`${developmentCookie}=`));
    const value = cookie?.slice(developmentCookie.length + 1);

    return (
        developmentUsers.find((profile) => encodeURIComponent(JSON.stringify(profile)) === value) ?? developmentUsers[1]
    );
}

/** Sends a frontend-defined identity only to the local Solution server. */
export function setDevelopmentUser(profile: (typeof developmentUsers)[number]): void {
    document.cookie = `${developmentCookie}=${encodeURIComponent(JSON.stringify(profile))}; Path=/; SameSite=Strict`;
}
