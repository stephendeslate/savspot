# Roles and Permissions

SavSpot uses a role-based access control system to manage what each team member can see and do. Roles follow a strict hierarchy: **Owner > Admin > Staff**.

## Role Descriptions

- **Owner** — Full control over the workspace, including billing, subscription management, and all administrative functions. There is one Owner per workspace.
- **Admin** — Can manage team members, services, settings, and client data. Cannot access billing or delete the workspace. Pages like Team, Service Categories, Branding, Calendar Settings, and Analytics require Admin access.
- **Staff** — Can view and manage bookings and services assigned to them. Cannot access admin-level settings or team management.

## Permissions by Role

| Permission | Owner | Admin | Staff |
|------------|-------|-------|-------|
| View and manage bookings | Yes | Yes | Yes |
| View calendar | Yes | Yes | Yes |
| Create walk-in bookings | Yes | Yes | Yes |
| View client directory | Yes | Yes | Yes |
| Manage services | Yes | Yes | No |
| Manage service categories | Yes | Yes | No |
| Manage team members | Yes | Yes | No |
| Invite team members | Yes | Yes | No |
| Configure settings (branding, availability, notifications) | Yes | Yes | No |
| Access analytics and insights | Yes | Yes | No |
| Manage billing and subscription | Yes | No | No |
| Transfer ownership | Yes | No | No |

## Changing Roles

Only Owners and Admins can change a team member's role:

1. Navigate to **Settings > Team** (`/settings/team`).
2. Find the team member in the list.
3. Use the role dropdown to select **Admin** or **Staff**.

The Owner role cannot be assigned through the dropdown.

> **Tip:** Follow the principle of least privilege. Assign the Staff role to team members who only need to manage their own schedule. Promote to Admin only when broader management access is required.
