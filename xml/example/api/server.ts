const xml = Bun.file(new URL('./ui.xml', import.meta.url));

Bun.serve({
    port: 8000,
    async fetch() {
        return new Response(await xml.text(), {
            headers: {
                'content-type': 'application/xml',
                'access-control-allow-origin': '*',
            },
        });
    },
});

console.log('API server running at http://localhost:8000');
