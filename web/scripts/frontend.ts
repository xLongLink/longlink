import type { JSX } from 'react';

export * from '../src/components/longlink';
export { z } from 'zod';
export { useForm } from 'react-hook-form';
export { zodResolver } from '@hookform/resolvers/zod';
export { useSubmit } from '../src/views/hooks/use-submit';
export { useConfirm, type ConfirmOptions } from '../src/components/longlink/hooks/use-confirm';
export type FrontendElement = JSX.Element;
export type FrontendElementType = JSX.ElementType;
