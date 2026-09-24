<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Repositories\Contracts\UserRepositoryInterface;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
    ) {}

    /**
     * Show the dashboard shell.
     */
    public function index(): Response
    {
        return Inertia::render('dashboard', [
            'stats' => $this->stats(),
            'setup' => $this->setupChecklist(),
        ]);
    }

    /**
     * The headline metric cards.
     *
     * @return array<int, array{key: string, label: string, value: string, description: string}>
     */
    private function stats(): array
    {
        return [
            [
                'key' => 'users',
                'label' => 'Users',
                'value' => (string) $this->users->countAll(),
                'description' => 'Accounts in the application',
            ],
        ];
    }

    /**
     * The onboarding checklist shown on the dashboard.
     *
     * @return array<int, array{key: string, label: string, description: string, status: string}>
     */
    private function setupChecklist(): array
    {
        return [
            [
                'key' => 'configure_app',
                'label' => 'Configure the application',
                'description' => 'Set branding, mail and preferences under Administration → Settings.',
                'status' => 'todo',
            ],
            [
                'key' => 'invite_team',
                'label' => 'Invite your team',
                'description' => 'Create users and assign roles from the Users page.',
                'status' => 'todo',
            ],
            [
                'key' => 'explore_modules',
                'label' => 'Explore the starter kit',
                'description' => 'Browse roles, files, notifications and the Data Processing Center.',
                'status' => 'todo',
            ],
        ];
    }
}
