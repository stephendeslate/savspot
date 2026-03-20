# Creating Workflows

Build automated workflows to streamline your business operations. The workflow builder is available at **Settings > Workflows** (`/settings/workflows`).

## Workflow Builder Interface

The workflow builder uses a visual editor where you connect triggers to actions in a sequential flow. Each workflow starts with a trigger event and executes one or more actions when that event occurs.

The builder has three main areas:

| Area | Purpose |
|------|---------|
| Trigger panel | Select the event that starts the workflow |
| Action list | Add and configure the actions to execute |
| Settings sidebar | Name, description, and activation toggle |

## Building a Workflow

1. Navigate to `/settings/workflows` and click **Create Workflow**.
2. Give your workflow a descriptive name (e.g., "New Booking Follow-Up").
3. Select a trigger from the trigger panel.
4. Click **Add Action** to add your first action.
5. Configure the action's settings (e.g., email template, delay time, webhook URL).
6. Add additional actions if needed -- they execute in order from top to bottom.
7. Click **Save** to store the workflow.

## Naming and Organizing Workflows

Use clear, descriptive names that indicate what the workflow does. Good examples:

- "Send Reminder 24h Before Appointment"
- "Thank You Email After First Booking"
- "Notify Team on Cancellation"

> Tip: Add a brief description to each workflow explaining its purpose. This helps when you have many workflows and need to quickly identify what each one does.

## Activating and Deactivating Workflows

New workflows are created in a **draft** state and do not run until activated.

1. Open the workflow from your workflows list.
2. Toggle the **Active** switch in the settings sidebar.
3. Click **Save** to confirm.

To temporarily stop a workflow without deleting it, toggle the switch back to inactive. The workflow retains all its configuration and can be reactivated at any time.

> Tip: Test your workflow with a sample booking before activating it to make sure the actions behave as expected.
