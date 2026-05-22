import type { LucideIcon } from 'lucide-react';

export type DocItem = {
    title: string;
    path: string;
    id: string;
    icon: LucideIcon;
};

export type DocGroup = {
    title: string;
    items: DocItem[];
};
