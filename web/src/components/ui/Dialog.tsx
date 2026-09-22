import { X } from 'lucide-react';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { IconButton } from '@astryxdesign/core/IconButton';
import { type ComponentProps, type ReactNode } from 'react';
import { Dialog as AstryxDialog } from '@astryxdesign/core/Dialog';

type DialogProps = Omit<ComponentProps<typeof AstryxDialog>, 'aria-label' | 'children' | 'padding'> & {
    children: ReactNode;
    gap?: ComponentProps<typeof Stack>['gap'];
    subtitle?: string;
    title: string;
};

/** Renders a shared dialog with a titled, divided header and structured content. */
export function Dialog({
    children,
    gap = 3,
    onOpenChange,
    purpose,
    subtitle,
    title,
    width = 640,
    ...props
}: DialogProps) {
    const hasSubtitle = subtitle !== undefined && subtitle.length > 0;

    return (
        <AstryxDialog
            {...props}
            aria-label={title}
            padding={0}
            width={width}
            onOpenChange={onOpenChange}
            purpose={purpose}
        >
            <Stack gap={0}>
                <Stack
                    direction="horizontal"
                    gap={2}
                    justify="between"
                    align="start"
                    paddingBlock={2}
                    paddingInline={4}
                >
                    <Stack gap={hasSubtitle ? 1 : 0}>
                        <Heading level={2}>{title}</Heading>
                        {hasSubtitle ? (
                            <Text color="secondary" size="sm" type="body">
                                {subtitle}
                            </Text>
                        ) : null}
                    </Stack>
                    {purpose === 'required' ? null : (
                        <IconButton
                            icon={<X />}
                            label="Close dialog"
                            tooltip="Close"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        />
                    )}
                </Stack>
                <Divider />
                <Stack gap={gap} padding={4}>
                    {children}
                </Stack>
            </Stack>
        </AstryxDialog>
    );
}
