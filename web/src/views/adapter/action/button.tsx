import { viewComponent } from '../props';
import * as group from '@/components/shadcn/button-group';
import * as button from '@/components/longlink/action/button';

export const Button = viewComponent(button.Button);

export const ButtonGroup = viewComponent(group.ButtonGroup);

export const ButtonGroupText = viewComponent(group.ButtonGroupText);

export const ButtonGroupSeparator = viewComponent(group.ButtonGroupSeparator);
