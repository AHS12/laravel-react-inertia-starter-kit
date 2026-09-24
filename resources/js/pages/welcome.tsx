import { Head, Link, usePage } from '@inertiajs/react';
import {
    DatabaseBackup,
    KeyRound,
    LifeBuoy,
    ServerCog,
    ShieldCheck,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboard, home, login } from '@/routes';

type Feature = {
    icon: LucideIcon;
    title: string;
    description: string;
};

const features: Feature[] = [
    {
        icon: ShieldCheck,
        title: 'Authentication & RBAC',
        description:
            'Fortify-powered auth with 2FA and passkeys, plus role-based access control ready out of the box.',
    },
    {
        icon: Users,
        title: 'Users & roles',
        description:
            'User management, invitations and a permission registry that keeps every action in the right hands.',
    },
    {
        icon: DatabaseBackup,
        title: 'Async exports & imports',
        description:
            'Queue-backed data processing center for spreadsheet exports and imports, with live progress.',
    },
    {
        icon: ServerCog,
        title: 'Queue & reliability',
        description:
            'Named queue channels, Horizon monitoring and stale-job reaping so long-running work never gets lost.',
    },
    {
        icon: KeyRound,
        title: 'Settings engine',
        description:
            'Global and per-user settings with a typed key registry, seeded defaults and an admin UI.',
    },
    {
        icon: LifeBuoy,
        title: 'Developer tools',
        description:
            'Health checks, Telescope, Pulse and Horizon behind a permission-gated developer page.',
    },
];

const steps = [
    {
        title: 'Run the setup wizard',
        description:
            'A one-time browser installer checks the environment, configures the database and drivers, and creates the super admin.',
    },
    {
        title: 'Invite your team',
        description:
            'Create users, assign roles and fine-tune permissions from the built-in admin pages.',
    },
    {
        title: 'Build your product',
        description:
            'Use the Service–Repository scaffolding, typed Inertia props and quality gate to ship your own features.',
    },
];

export default function Welcome() {
    const { auth, name } = usePage().props;
    const appName = name ?? 'Laravel React Starter';

    return (
        <>
            <Head title={appName} />

            <div className="flex min-h-svh flex-col bg-background">
                <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
                    <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
                        <Link
                            href={home()}
                            className="flex items-center gap-2 font-semibold"
                        >
                            <AppLogoIcon className="size-7 fill-current text-foreground" />
                            <span>{appName}</span>
                        </Link>

                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                            <Button asChild size="sm">
                                <Link href={auth.user ? dashboard() : login()}>
                                    {auth.user ? 'Dashboard' : 'Log in'}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="flex-1">
                    <section className="relative overflow-hidden">
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl"
                        />

                        <div className="mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-6 lg:py-28">
                            <div className="flex justify-center">
                                <Badge variant="outline">
                                    Laravel · Inertia · React · TypeScript
                                </Badge>
                            </div>

                            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                                Everything a modern Laravel app needs, already
                                built.
                            </h1>

                            <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-muted-foreground">
                                {appName} is a production-ready starter kit:
                                authentication, RBAC, settings, notifications,
                                media, async exports and imports, a setup wizard
                                and developer tools — so you can start on your
                                product on day one.
                            </p>

                            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                                <Button asChild size="lg">
                                    <Link
                                        href={auth.user ? dashboard() : login()}
                                    >
                                        {auth.user
                                            ? 'Go to dashboard'
                                            : `Log in to ${appName}`}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:pb-28">
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {features.map((feature) => (
                                <div
                                    key={feature.title}
                                    className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm transition-shadow hover:shadow-md"
                                >
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <feature.icon className="size-5" />
                                    </div>
                                    <h2 className="mt-4 font-medium">
                                        {feature.title}
                                    </h2>
                                    <p className="mt-1.5 text-sm text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="border-t bg-muted/30">
                        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
                            <div className="max-w-2xl">
                                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                    Up and running in three steps
                                </h2>
                                <p className="mt-3 text-muted-foreground">
                                    From a fresh checkout to a working
                                    application with users and permissions.
                                </p>
                            </div>

                            <ol className="mt-12 grid gap-8 md:grid-cols-3">
                                {steps.map((step, index) => (
                                    <li key={step.title}>
                                        <div className="flex size-9 items-center justify-center rounded-full border bg-background font-medium">
                                            {index + 1}
                                        </div>
                                        <h3 className="mt-4 font-medium">
                                            {step.title}
                                        </h3>
                                        <p className="mt-1.5 text-sm text-muted-foreground">
                                            {step.description}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </section>
                </main>

                <footer className="border-t">
                    <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
                        <div className="flex items-center gap-2">
                            <AppLogoIcon className="size-5 fill-current" />
                            <span>{appName}</span>
                        </div>
                        <p>
                            &copy; {new Date().getFullYear()} {appName}. Built
                            on your own data.
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
