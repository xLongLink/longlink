import Button from '@/longlink/Button';
import Checkbox from '@/longlink/Checkbox';
import Columns, { Column } from '@/longlink/Columns';
import Dialog from '@/longlink/Dialog';
import Hero from '@/longlink/Hero';
import { Icon } from '@/longlink/Icon';
import Input from '@/longlink/Input';
import Menu, { MenuSection, MenuSubSection } from '@/longlink/Menu';
import Range from '@/longlink/Range';
import Select from '@/longlink/Select';
import Separator from '@/longlink/Separator';
import Slider from '@/longlink/Slider';
import Switch from '@/longlink/Switch';
import Table from '@/longlink/Table';
import Textarea from '@/longlink/Textarea';
import { Blockquote, Code, H1, H2, H3, H4, Li, P, Ul } from '@/longlink/Typography';
import { createRegistry } from '@/longlink/rendering';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';

export const Layout = {
    Hero,
    Menu,
    MenuSection,
    MenuSubSection,
    Card,
    CardHeader,
    CardContent,
    CardFooter,
    Columns,
    Column,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Table,
};

export const Components = {
    Button,
    CardAction,
    CardDescription,
    CardTitle,
    Checkbox,
    Dialog,
    H1,
    H2,
    H3,
    H4,
    Icon,
    Input,
    Li,
    P,
    Range,
    Select,
    Separator,
    Slider,
    Switch,
    Textarea,
    Blockquote,
    Code,
    Ul,
};

export const Logic = {};

export const registry = createRegistry({
    ...Layout,
    ...Components,
    ...Logic,
});

export default registry;
