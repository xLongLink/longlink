/** Encodes flat parsed values for FastAPI Form and File parameters without guessing nested formats. */
export function encode(values: Record<string, unknown>): FormData {
    const prototype: unknown = Object.getPrototypeOf(values);

    if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError('Form submissions require a flat object.');
    }

    const data = new FormData();

    for (const [name, value] of Object.entries(values)) {
        for (const item of Array.isArray(value) ? value : [value]) {
            if (item === null || item === undefined) continue;

            if (item instanceof File) {
                data.append(name, item);
            } else if (
                typeof item === 'string' ||
                typeof item === 'boolean' ||
                (typeof item === 'number' && Number.isFinite(item))
            ) {
                data.append(name, String(item));
            } else {
                throw new TypeError(`Field "${name}" must contain text, finite numbers, booleans, or files.`);
            }
        }
    }

    return data;
}
