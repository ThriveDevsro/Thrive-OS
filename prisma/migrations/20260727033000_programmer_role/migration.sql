INSERT INTO "Role" ("id", "workspaceId", "name", "key", "description", "system")
SELECT
  gen_random_uuid(),
  workspace."id",
  'Programmer',
  'programmer',
  'Technical access to assigned CRM work, shared inbox, calendar, AI and automations. No team or security administration.',
  true
FROM "Workspace" AS workspace
ON CONFLICT ("workspaceId", "key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "system" = true;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "Role" AS role
JOIN "Permission" AS permission ON permission."key" IN (
  'dashboard.read.owned',
  'company.read.owned',
  'company.update.owned',
  'lead.read.owned',
  'opportunity.update.owned',
  'email.send',
  'analytics.read.owned',
  'ai.lead.analyze.owned',
  'ai.analysis.approve',
  'ai.copilot.use'
)
WHERE role."key" = 'programmer'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
