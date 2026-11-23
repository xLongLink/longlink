import type { ComponentProps } from 'react';
import { Stack } from '@/components/longlink/layout/stack';

type IllustratedFormProps = Pick<ComponentProps<'form'>, 'onSubmit' | 'noValidate' | 'aria-busy' | 'children'> & {
    image: { src: string; width: number; height: number };
};

export function IllustratedForm({ image, children, ...props }: IllustratedFormProps) {
    return (
        <form {...props} className="grid min-h-full grid-cols-1 items-center sm:grid-cols-2">
            {children}
            <Stack
                direction="horizontal"
                gap={0}
                align="center"
                justify="center"
                padding={6}
                className="h-full bg-black/10 dark:bg-black/20"
            >
                <img
                    src={image.src}
                    alt=""
                    width={image.width}
                    height={image.height}
                    decoding="async"
                    className="w-full max-w-72 object-contain invert dark:invert-0"
                />
            </Stack>
        </form>
    );
}
