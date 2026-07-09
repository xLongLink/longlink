type GlobalPropertyName = 'document' | 'fetch' | 'window';

/** Temporarily replaces one test environment global and restores its original descriptor. */
export async function withGlobalValue<T>(name: GlobalPropertyName, value: unknown, callback: () => T | Promise<T>): Promise<T> {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);

    Object.defineProperty(globalThis, name, {
        configurable: true,
        value,
    });

    try {
        return await callback();
    } finally {
        if (descriptor) {
            Object.defineProperty(globalThis, name, descriptor);
        } else {
            delete (globalThis as Record<GlobalPropertyName, unknown>)[name];
        }
    }
}
