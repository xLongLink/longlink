import type { PublicProps } from '../props';
import type { ComponentProps } from 'react';

export { Controller } from 'react-hook-form';

export function Form(
    props: PublicProps<Omit<ComponentProps<'form'>, 'action' | 'method' | 'encType' | 'target' | 'acceptCharset'>>
) {
    return <form {...props} />;
}
