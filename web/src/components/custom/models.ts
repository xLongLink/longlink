import { z } from 'zod';

export type DirectoryModel = {
    id: string;
    name: string;
    provider: string;
    description: string;
    rating: number;
    reviews: number;
    context: number;
    input: number;
    output: number;
    modalities: string[];
    tags: string[];
};

export function formatContext(context: number): string {
    return context >= 1000000 ? `${context / 1000000}M` : `${context / 1000}k`;
}

const bookmarkKey = 'longlink:model-bookmarks';

let memoryBookmarks: string[] = [];

/** Retains bookmarks in memory when opaque View origins cannot access local storage. */
export function readBookmarks(): string[] {
    try {
        const value = z.array(z.string()).safeParse(JSON.parse(localStorage.getItem(bookmarkKey) ?? '[]'));

        if (value.success) return value.data;
    } catch {
        return memoryBookmarks;
    }

    return memoryBookmarks;
}

export function writeBookmarks(ids: string[]): void {
    memoryBookmarks = ids;

    try {
        localStorage.setItem(bookmarkKey, JSON.stringify(ids));
    } catch {
        return;
    }
}
