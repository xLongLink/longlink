import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Form } from '@/components/viavai/Form';
import { Sidebar } from '@/components/viavai/Sidebar';
import {
    sampleFormSchema,
    sampleSidebarSchema,
    sampleTableData,
    sampleTableSchema,
} from '@/lib/example-data';
import { Table } from '@/components/viavai/Table';

export default function FormPage() {
    const schema = {
        ...sampleSidebarSchema,
        items: sampleSidebarSchema.items.map((item) => {
            if (item.name === 'Notifications') {
                return {
                    ...item,
                    element: (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-semibold">
                                    Notification preferences
                                </h2>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    Choose how you want to stay informed.
                                </p>
                            </div>

                            <div className="space-y-4 rounded-lg border p-4">
                                <h3 className="text-xl font-semibold">
                                    In-app alerts
                                </h3>

                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-medium">
                                            Mentions & assignments
                                        </p>
                                        <p className="text-muted-foreground text-sm">
                                            Get notified when you are tagged.
                                        </p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-medium">
                                            Workflow updates
                                        </p>
                                        <p className="text-muted-foreground text-sm">
                                            Alerts for automation status.
                                        </p>
                                    </div>
                                    <Switch />
                                </div>
                            </div>

                            <div className="space-y-4 rounded-lg border p-4">
                                <h3 className="text-xl font-semibold">
                                    Notification schedule
                                </h3>
                                <p className="text-muted-foreground text-sm">
                                    Set quiet hours for alerts.
                                </p>
                                <Input defaultValue="22:00 - 07:00" />
                            </div>
                        </div>
                    ),
                };
            }

            if (item.name === 'Profile') {
                return { ...item, element: <Form schema={sampleFormSchema} /> };
            }

            return {
                ...item,
                element: (
                    <Table schema={sampleTableSchema} data={sampleTableData} />
                ),
            };
        }),
    };

    return <Sidebar schema={schema} activeItem="Notifications" />;
}
