import { Button } from '@/longlink/Button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/longlink/Card';
import Checkbox from '@/longlink/Checkbox';
import Columns, { Column } from '@/longlink/Columns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/longlink/Dialog';
import Hero from '@/longlink/Hero';
import { Icon } from '@/longlink/Icon';
import Input from '@/longlink/Input';
import Menu, { MenuSection, MenuSubSection } from '@/longlink/Menu';
import Page from '@/longlink/Page';
import Range from '@/longlink/Range';
import Select from '@/longlink/Select';
import Separator from '@/longlink/Separator';
import Slider from '@/longlink/Slider';
import Stack from '@/longlink/Stack';
import Switch from '@/longlink/Switch';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/longlink/Table';
import Textarea from '@/longlink/Textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/longlink/Tabs';
import { Blockquote, Code, H1, H2, H3, H4, Li, P, Ul } from '@/longlink/Typography';
import { createRegistry } from '@/rendering';

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
};

export const Components = {
    Button,
    CardAction,
    CardDescription,
    CardTitle,
    Checkbox,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    H1,
    H2,
    H3,
    H4,
    Icon,
    Input,
    Li,
    P,
    Page,
    Range,
    Select,
    Separator,
    Slider,
    Stack,
    Switch,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
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
