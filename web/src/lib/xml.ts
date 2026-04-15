export type XmlApiResponse =
    | string
    | { xml?: string | null; content?: string | null; page?: string | null }
    | null
    | undefined;

export function resolveXmlPayload(payload: XmlApiResponse): string | null {
    if (typeof payload === 'string') {
        const trimmedPayload = payload.trim();
        return trimmedPayload.length > 0 ? trimmedPayload : null;
    }

    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const xmlCandidate = payload.xml ?? payload.content ?? payload.page;

    if (typeof xmlCandidate !== 'string') {
        return null;
    }

    const trimmedCandidate = xmlCandidate.trim();
    return trimmedCandidate.length > 0 ? trimmedCandidate : null;
}
