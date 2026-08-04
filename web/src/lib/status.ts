import type { TranslatorFn } from '@astryxdesign/core/i18n';
import type { Status } from '@/lib/generated/platform-api-v1/types.gen';

/** Returns translated labels for every Platform lifecycle status. */
export function createStatusLabels(t: TranslatorFn): Record<Status, string> {
    return {
        creating: t('status.creating'),
        running: t('status.running'),
        failed: t('status.failed'),
        deleting: t('status.deleting'),
    };
}
