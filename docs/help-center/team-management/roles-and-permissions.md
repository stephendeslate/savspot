# Roles and Permissions

SavSpot uses a role-based access control system to manage what each team member can see and do within your workspace. Understanding the role hierarchy helps you assign the right level of access to each person on your team.

## Role Hierarchy

Roles follow a strict hierarchy: **Owner > Admin > Staff**. Each role inherits the permissions of the roles below it, with additional capabilities at each level.

- **Owner** -- Full control over the workspace, including billing, account deletion, and all administrative functions. There is one Owner per workspace.
- **Admin** -- Can manage team members, services, settings, and client data. Cannot access billing or delete the workspace.
- **Staff** -- Can view and manage their own bookings, communicate with clients, and update their profile and availability.

## Permissions by Role

| Permission | Owner | Admin | Staff |
|---|---|---|---|
| View own bookings | Yes | Yes | Yes |
| Manage own availability | Yes | Yes | Yes |
| Message clients | Yes | Yes | Yes |
| View all bookings | Yes | Yes | No |
| Create and edit services | Yes | Yes | No |
| Manage clients | Yes | Yes | No |
| Invite team members | Yes | Yes | No |
| Remove team members | Yes | Yes | No |
| Change member roles | Yes | Yes | No |
| Configure payment settings | Yes | Yes | No |
| Configure tax rates | Yes | Yes | No |
| Manage communications settings | Yes | Yes | No |
| Access billing and subscription | Yes | No | No |
| Transfer ownership | Yes | No | No |
| Delete workspace | Yes | No | No |

> **Tip:** Follow the principle of least privilege. Assign the Staff role to team members who only need to manage their own schedule and client interactions. Promote to Admin only when broader management access is required.

## Changing Roles

Only Owners and Admins can change a team member's role. To update a role:

1. Navigate to **Settings > Team** (`/settings/team`).
2. Find the team member in the list.
3. Select the new role from the dropdown.
4. Save the change.

> **Tip:** The Owner role cannot be assigned through the role dropdown. Ownership must be transferred explicitly through the account settings, and only the current Owner can initiate a transfer.
