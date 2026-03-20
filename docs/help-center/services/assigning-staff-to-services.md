# Assigning Staff to Services

When your business has multiple team members, you can control which staff members are eligible to perform each service. This ensures clients are only offered time slots with qualified team members and keeps your schedule accurate.

## How Staff Assignments Work

Each service can be linked to one or more team members. When a client books that service, SavSpot only shows available time slots for the assigned staff. If no staff are assigned, the service uses the business owner's availability by default.

| Configuration | Booking Behavior |
|---------------|-----------------|
| No staff assigned | Uses business owner's availability |
| One staff member assigned | Only that member's open slots are shown |
| Multiple staff assigned | Slots from all assigned members are shown; client may choose or be auto-assigned |

## Assigning Staff to a Service

1. Navigate to **Services** and open the service you want to configure.
2. Scroll to the **Assigned Staff** section.
3. Select team members from the list of available staff.
4. Save the service.

You can assign or remove staff at any time. Changes take effect immediately for future bookings. Existing bookings are not affected.

## Impact on Availability

Staff assignments directly affect which time slots appear on your booking page. SavSpot calculates available slots by intersecting the service duration with each assigned staff member's availability rules.

For example, if a service is assigned to two staff members:

- **Staff A** is available Monday through Friday, 9 AM to 5 PM.
- **Staff B** is available Wednesday through Saturday, 10 AM to 6 PM.

Clients booking this service see combined availability across both schedules. On Wednesday, slots from both staff members are offered.

> **Tip:** Make sure each assigned staff member has their availability rules configured at `/settings/availability` before assigning them to services. Without availability rules, no slots will appear for that staff member.

## Managing Team Workload

Use staff assignments strategically to balance workload across your team. If one team member is overbooked, consider assigning additional staff to their busiest services.

> **Tip:** Review staff-service assignments when onboarding a new team member. Adding them to existing services immediately expands your bookable capacity.
