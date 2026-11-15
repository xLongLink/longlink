import { viewComponent } from '../props';
import * as dialog from '@/components/shadcn/dialog';
import * as native from '@/components/custom/native-dialog';

export const Dialog = viewComponent(native.Dialog);

export const DialogTrigger = viewComponent(dialog.DialogTrigger);

export const DialogPortal = viewComponent(dialog.DialogPortal);

export const DialogClose = viewComponent(dialog.DialogClose);

export const DialogOverlay = viewComponent(dialog.DialogOverlay);

export const DialogContent = viewComponent(dialog.DialogContent);

export const DialogHeader = viewComponent(dialog.DialogHeader);

export const DialogFooter = viewComponent(dialog.DialogFooter);

export const DialogTitle = viewComponent(dialog.DialogTitle);

export const DialogDescription = viewComponent(dialog.DialogDescription);
