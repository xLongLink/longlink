import { useState } from 'react';

export function useMetadata<Row extends { id: string }>(rows: readonly Row[]) {
    const [id, select] = useState<string | null>(null);
    const metadata = id === null ? undefined : rows.find((row) => row.id === id);

    if (id !== null && !metadata) select(null);

    return [metadata, select] as const;
}
