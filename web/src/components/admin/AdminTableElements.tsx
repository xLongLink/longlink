import { Icon } from '@astryxdesign/core/Icon';
import { useToast } from '@astryxdesign/core/Toast';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';

/** Renders the shared copy/delete action menu for admin tables. */
export function AdminActionMenu({
    label,
    copyLabel,
    copyValue,
    onDelete,
}: {
    label: string;
    copyLabel: string;
    copyValue: string;
    onDelete: () => void;
}) {
    const toast = useToast();

    return (
        <MoreMenu
            label={`Open actions for ${label}`}
            items={[
                {
                    label: `Copy ${copyLabel.toLowerCase()}`,
                    icon: <Icon icon="copy" size="sm" />,
                    onClick: () => {
                        void navigator.clipboard.writeText(copyValue);
                        toast({ body: `${copyLabel} copied` });
                    },
                },
                { label: 'Delete', onClick: onDelete },
            ]}
        />
    );
}
