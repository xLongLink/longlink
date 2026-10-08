import { Building2, FileText, ShieldCheck } from 'lucide-react';

// Keep legal routes, navigation, and publication in their established reading order.
export const legalPages = [
    { path: '/terms', module: './routes/legal/Terms.tsx', label: 'Terms', icon: FileText },
    { path: '/impressum', module: './routes/legal/Impressum.tsx', label: 'Impressum', icon: Building2 },
    { path: '/privacy', module: './routes/legal/Privacy.tsx', label: 'Privacy', icon: ShieldCheck },
] as const;

export const legalPaths: string[] = legalPages.map(({ path }) => path);
