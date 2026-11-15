/// <reference types="es-module-shims" />

const moduleBase = 'https://solution.invalid/views/';
let assetPort: MessagePort | undefined;
const pending = new Map<
    number,
    { resolve: (source: string) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
>();
let sequence = 0;

// Configure the packaged shim before it initializes, without a native network fallback.
window.esmsInitOptions = {
    shimMode: true,
    nativePassthrough: false,
    noLoadEventRetriggers: true,
    source: async (url) => {
        if (!url.startsWith(moduleBase)) throw new Error('Modules must belong to the Solution runtime');
        const path = url.slice(moduleBase.length);

        const port = assetPort;

        if (!port) throw new Error('Solution module transport is not ready');
        const id = sequence++;

        const source = await new Promise<string>((resolve, reject) => {
            const timer = setTimeout(() => {
                pending.delete(id);
                reject(new Error('Solution module request timed out'));
            }, 130_000);
            pending.set(id, { resolve, reject, timer });

            try {
                port.postMessage({ id, path });
            } catch (error) {
                pending.delete(id);
                clearTimeout(timer);
                reject(error);
            }
        });

        return { type: 'js', source, url };
    }
};

/** Receives authenticated Solution assets without giving the sandbox network access. */
function startModules(event: MessageEvent<unknown>): void {
    if (event.source !== window.parent || event.ports.length !== 2) return;
    const data = event.data;

    if (typeof data !== 'object' || data === null || !('session' in data) || data.session !== window.__VIEW_SESSION__) {
        return;
    }

    window.removeEventListener('message', startModules);
    const port = event.ports[1];
    assetPort = port;

    // Keep module responses on their own channel, separate from application requests.
    port.onmessage = (reply: MessageEvent<unknown>) => {
        const message = reply.data;

        if (typeof message !== 'object' || message === null || !('id' in message) || typeof message.id !== 'number') {
            return;
        }

        const request = pending.get(message.id);

        if (!request) return;
        pending.delete(message.id);
        clearTimeout(request.timer);

        if ('source' in message && typeof message.source === 'string') request.resolve(message.source);
        else request.reject(new Error('Solution module could not be loaded'));
    };

    // Closing the frame releases every unresolved module request and its deadline.
    window.addEventListener(
        'pagehide',
        () => {
            assetPort = undefined;
            for (const request of pending.values()) {
                clearTimeout(request.timer);
                request.reject(new Error('View closed'));
            }
            pending.clear();
            port.close();
        },
        { once: true }
    );

    // Load the module graph before replaying initialization to the application runtime.
    void (async () => {
        try {
            await globalThis.importShim(`${moduleBase}entry.js`);
            window.dispatchEvent(new MessageEvent('message', { source: window.parent, data, ports: [event.ports[0]] }));
        } catch {
            port.postMessage({ type: 'failed' });
        }
    })();
}

window.addEventListener('message', startModules);
window.parent.postMessage(window.__VIEW_SESSION__, '*');

export {};
