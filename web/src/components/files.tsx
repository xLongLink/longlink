import { useMemo, useState } from 'react';
import { FileCode2, FileText, Folder, Search, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type FileEntry = {
    name: string;
    path: string;
    size: string;
    updated: string;
    kind: 'folder' | 'code' | 'doc';
};

const FILES: FileEntry[] = [
    {
        name: 'README.md',
        path: 'README.md',
        size: '3.2 KB',
        updated: 'Jan 18, 2026',
        kind: 'doc',
    },
    {
        name: 'src/components/files.tsx',
        path: 'src/components/files.tsx',
        size: '4.1 KB',
        updated: 'Jan 29, 2026',
        kind: 'code',
    },
    {
        name: 'src/components/ui',
        path: 'src/components/ui',
        size: '—',
        updated: 'Jan 20, 2026',
        kind: 'folder',
    },
    {
        name: 'vite.config.ts',
        path: 'vite.config.ts',
        size: '1.3 KB',
        updated: 'Jan 14, 2026',
        kind: 'code',
    },
    {
        name: 'public/logo.svg',
        path: 'public/logo.svg',
        size: '2.8 KB',
        updated: 'Jan 10, 2026',
        kind: 'doc',
    },
    {
        name: 'package.json',
        path: 'package.json',
        size: '1.6 KB',
        updated: 'Jan 09, 2026',
        kind: 'code',
    },
];

const KIND_LABEL: Record<FileEntry['kind'], string> = {
    folder: 'Folder',
    code: 'Code',
    doc: 'Docs',
};

const KIND_ICON: Record<FileEntry['kind'], typeof Folder> = {
    folder: Folder,
    code: FileCode2,
    doc: FileText,
};

export function Files() {
    const [query, setQuery] = useState('');

    const results = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) {
            return FILES;
        }
        return FILES.filter((file) =>
            `${file.name} ${file.path}`.toLowerCase().includes(normalized)
        );
    }, [query]);

    return (
        <div className="space-y-6">
            <InputGroup className="h-10">
                <InputGroupAddon>
                    <Search className="h-4 w-4" />
                </InputGroupAddon>
                <InputGroupInput
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search files (e.g. src/components)"
                    aria-label="Search files"
                />
                {query ? (
                    <InputGroupButton
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Clear search"
                        onClick={() => setQuery('')}
                    >
                        <X className="h-3 w-3" />
                    </InputGroupButton>
                ) : null}
            </InputGroup>

            <Card className="p-0">
                {results.length === 0 ? (
                    <div className="p-10">
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Search />
                                </EmptyMedia>
                                <EmptyTitle>No files found</EmptyTitle>
                                <EmptyDescription>
                                    Try adjusting your search query or browse the repository tree.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    </div>
                ) : (
                    <div className="p-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File</TableHead>
                                    <TableHead>Path</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Updated</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.map((file) => {
                                    const Icon = KIND_ICON[file.kind];
                                    return (
                                        <TableRow key={file.path}>
                                            <TableCell className="font-medium text-white">
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-4 w-4 text-white/60" />
                                                    {file.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-white/60">
                                                {file.path}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {KIND_LABEL[file.kind]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-white/70">
                                                {file.size}
                                            </TableCell>
                                            <TableCell className="text-white/70">
                                                {file.updated}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>
        </div>
    );
}

export default Files;
