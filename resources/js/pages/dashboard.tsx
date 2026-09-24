import { Head } from '@inertiajs/react';
import { Activity, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { SetupChecklist } from '@/components/dashboard/setup-checklist';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes';
import type { DashboardStat, SetupStep } from '@/types';

type Props = {
    stats: DashboardStat[];
    setup: SetupStep[];
};

const statIcons: Record<string, LucideIcon> = {
    users: Users,
};

export default function Dashboard({ stats, setup }: Props) {
    return (
        <>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <PageHeader
                    title="Dashboard"
                    description="An overview of your workspace."
                />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {stats.map((stat) => (
                        <StatCard
                            key={stat.key}
                            label={stat.label}
                            value={stat.value}
                            description={stat.description ?? undefined}
                            icon={statIcons[stat.key]}
                        />
                    ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <SetupChecklist steps={setup} />

                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Activity</CardTitle>
                            <CardDescription>
                                A live feed of what is happening in your
                                application.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EmptyState
                                icon={Activity}
                                title="No activity yet"
                                description="As you and your team use the application, recent activity will appear here."
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
