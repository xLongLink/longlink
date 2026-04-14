const xml = Bun.file(new URL('./ui.xml', import.meta.url));
const users = [
    { id: 1, name: 'Ada Lovelace', username: 'ada', role: 'Admin', active: true },
    { id: 2, name: 'Grace Hopper', username: 'grace', role: 'Maintainer', active: true },
    { id: 3, name: 'Linus Torvalds', username: 'linus', role: 'Reviewer', active: false },
];

function createCorsHeaders(request: Request) {
    const origin = request.headers.get('origin') ?? '*';
    const requestedHeaders = request.headers.get('access-control-request-headers') ?? 'content-type';
    const requestedMethod = request.headers.get('access-control-request-method');
    const allowMethods = requestedMethod ? `GET, PATCH, OPTIONS, ${requestedMethod}` : 'GET, PATCH, OPTIONS';

    return {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': allowMethods,
        'access-control-allow-headers': requestedHeaders,
        'access-control-max-age': '86400',
        vary: 'origin, access-control-request-method, access-control-request-headers',
    };
}

Bun.serve({
    port: 8000,
    async fetch(request) {
        const url = new URL(request.url);
        const corsHeaders = createCorsHeaders(request);

        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders,
            });
        }

        if (url.pathname === '/users') {
            return Response.json(users, {
                headers: corsHeaders,
            });
        }

        const userMatch = url.pathname.match(/^\/users\/(\d+)$/);

        if (request.method === 'PATCH' && userMatch) {
            const id = Number(userMatch[1]);
            const user = users.find((entry) => entry.id === id);

            if (!user) {
                return Response.json(
                    { message: 'User not found' },
                    {
                        status: 404,
                        headers: corsHeaders,
                    }
                );
            }

            const payload = (await request.json()) as Partial<(typeof users)[number]>;

            Object.assign(user, payload);

            return Response.json(user, {
                headers: corsHeaders,
            });
        }

        return new Response(await xml.text(), {
            headers: {
                'content-type': 'application/xml',
                ...corsHeaders,
            },
        });
    },
});

console.log('API server running at http://localhost:8000');
