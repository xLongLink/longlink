const xml = Bun.file(new URL('./ui.xml', import.meta.url));
const users = [
    { id: 1, name: 'Ada Lovelace', username: 'ada', role: 'Admin' },
    { id: 2, name: 'Grace Hopper', username: 'grace', role: 'Maintainer' },
    { id: 3, name: 'Linus Torvalds', username: 'linus', role: 'Reviewer' },
];

Bun.serve({
    port: 8000,
    async fetch(request) {
        const url = new URL(request.url);

        if (url.pathname === '/users') {
            return Response.json(users, {
                headers: {
                    'access-control-allow-origin': '*',
                },
            });
        }

        return new Response(await xml.text(), {
            headers: {
                'content-type': 'application/xml',
                'access-control-allow-origin': '*',
            },
        });
    },
});

console.log('API server running at http://localhost:8000');
