import type { ComponentType } from 'react';
import { FileText, Landmark, type LucideIcon, ShieldCheck } from 'lucide-react';
import type { ArticleMetadata } from '@/lib/pages';
import Terms, { metadata as termsMetadata } from '@/platform/legal/terms';
import Privacy, { metadata as privacyMetadata } from '@/platform/legal/privacy';
import Impressum, { metadata as impressumMetadata } from '@/platform/legal/impressum';

type LegalPage = {
    Component: ComponentType;
    Icon: LucideIcon;
    metadata: ArticleMetadata;
};

export const legalPages = [
    { Component: Terms, Icon: FileText, metadata: termsMetadata },
    { Component: Impressum, Icon: Landmark, metadata: impressumMetadata },
    { Component: Privacy, Icon: ShieldCheck, metadata: privacyMetadata },
] satisfies readonly LegalPage[];
