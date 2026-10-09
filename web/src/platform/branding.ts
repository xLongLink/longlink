import { Gem, Image, MessageSquare } from 'lucide-react';

// Keep branding routes, navigation, and publication in their established reading order.
export const brandingPages = [
    { path: '/branding/assets', module: './routes/branding/Assets.tsx', label: 'Brand assets', icon: Image },
    { path: '/branding/values', module: './routes/branding/Values.tsx', label: 'Values', icon: Gem },
    {
        path: '/branding/comunication',
        module: './routes/branding/Communication.tsx',
        label: 'Communication',
        icon: MessageSquare,
    },
] as const;

export const brandingPaths: string[] = brandingPages.map(({ path }) => path);
