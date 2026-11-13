import type { z } from 'zod';
import type { LucideIcon } from 'lucide-react';
import type { zTagIcon } from '@/lib/generated/platform-api-v1/zod.gen';
import {
    Tag,
    Users,
    Folder,
    Layers,
    Wrench,
    Calendar,
    BookOpen,
    Building2,
    AppWindow,
    ClipboardList,
    BriefcaseBusiness,
    ChartNoAxesCombined
} from 'lucide-react';

export const icons = {
    tag: { label: 'Tag', component: Tag },
    'app-window': { label: 'Applications', component: AppWindow },
    'book-open': { label: 'Book', component: BookOpen },
    'briefcase-business': { label: 'Business', component: BriefcaseBusiness },
    'building-2': { label: 'Building', component: Building2 },
    calendar: { label: 'Calendar', component: Calendar },
    'chart-no-axes-combined': { label: 'Chart', component: ChartNoAxesCombined },
    'clipboard-list': { label: 'Checklist', component: ClipboardList },
    folder: { label: 'Folder', component: Folder },
    layers: { label: 'Layers', component: Layers },
    users: { label: 'People', component: Users },
    wrench: { label: 'Tools', component: Wrench }
} satisfies Record<z.output<typeof zTagIcon>, { label: string; component: LucideIcon }>;
