import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { capabilities, capabilitiesFor } from "../src/lib/permissions";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { slug: "thrive-dev" },
    update: {},
    create: { name: "Thrive Dev", slug: "thrive-dev" },
  });
  const sources = [
    {
      key: "manual",
      name: "Manual entry",
      method: "MANUAL",
      active: true,
      legalNotes: "Entered by an authorised Thrive Dev user.",
    },
    {
      key: "csv",
      name: "CSV import",
      method: "CSV",
      active: true,
      legalNotes: "Importer must confirm the source and business purpose.",
    },
    {
      key: "webtrh",
      name: "Webtrh public requests",
      method: "PUBLIC_HTML",
      sourceUrl: "https://webtrh.cz/poptavky/",
      active: false,
      cadenceMinutes: 60,
      legalNotes:
        "Public pages only. Approval required. Never bypass Cloudflare, authentication, CAPTCHA or access controls.",
    },
    {
      key: "email",
      name: "Incoming business email",
      method: "EMAIL",
      active: false,
      legalNotes:
        "Only configured company mailboxes and scoped business messages.",
    },
  ];
  for (const source of sources)
    await prisma.leadSource.upsert({
      where: {
        workspaceId_key: { workspaceId: workspace.id, key: source.key },
      },
      update: {},
      create: { workspaceId: workspace.id, ...source },
    });
  if (
    (await prisma.automation.count({
      where: { workspaceId: workspace.id },
    })) === 0
  )
    await prisma.automation.createMany({
      data: [
        {
          workspaceId: workspace.id,
          name: "Proposal follow-up",
          trigger: { event: "opportunity.stage_changed" },
          conditions: [
            { field: "stage", operator: "eq", value: "proposal_sent" },
          ],
          actions: [{ type: "schedule_follow_up", days: 3 }],
          active: false,
        },
        {
          workspaceId: workspace.id,
          name: "Stale opportunity warning",
          trigger: { event: "no_activity" },
          conditions: [{ field: "days", operator: "gte", value: 7 }],
          actions: [{ type: "notify_owner" }],
          active: true,
        },
      ],
    });
  if (
    !(await prisma.automation.findFirst({
      where: { workspaceId: workspace.id, name: "Incoming CRM email" },
    }))
  ) {
    await prisma.automation.create({
      data: {
        workspaceId: workspace.id,
        name: "Incoming CRM email",
        trigger: { event: "email.received" },
        conditions: [{ field: "direction", operator: "eq", value: "INBOUND" }],
        actions: [
          { type: "set_thread_status", status: "WAITING_FOR_US" },
          { type: "notify_owner", title: "Customer email needs a reply" },
        ],
        active: true,
      },
    });
  }
  for (const key of capabilities)
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: key.replaceAll(".", " ") },
    });
  const founder = await prisma.role.upsert({
    where: { workspaceId_key: { workspaceId: workspace.id, key: "founder" } },
    update: {
      description:
        "Full company access, team administration, settings, automations and audit history.",
    },
    create: {
      workspaceId: workspace.id,
      key: "founder",
      name: "Founder / Super Admin",
      description:
        "Full company access, team administration, settings, automations and audit history.",
      system: true,
    },
  });
  const salesperson = await prisma.role.upsert({
    where: {
      workspaceId_key: { workspaceId: workspace.id, key: "salesperson" },
    },
    update: {
      description:
        "Access to assigned leads, owned companies and deals, personal tasks, shared inbox and calendar.",
    },
    create: {
      workspaceId: workspace.id,
      key: "salesperson",
      name: "Salesperson",
      description:
        "Access to assigned leads, owned companies and deals, personal tasks, shared inbox and calendar.",
      system: true,
    },
  });
  const permissions = await prisma.permission.findMany();
  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({
      roleId: founder.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });
  const salespersonCapabilities = new Set(capabilitiesFor("salesperson"));
  await prisma.rolePermission.createMany({
    data: permissions
      .filter((permission) =>
        salespersonCapabilities.has(permission.key as never),
      )
      .map((permission) => ({
        roleId: salesperson.id,
        permissionId: permission.id,
      })),
    skipDuplicates: true,
  });
  const email = process.env.DEMO_FOUNDER_EMAIL ?? "founder@thrivedev.sk";
  const user = await prisma.user.upsert({
    where: { workspaceId_email: { workspaceId: workspace.id, email } },
    update: {},
    create: {
      workspaceId: workspace.id,
      email,
      name: "Patrik Korec",
      passwordHash: await hash(
        process.env.DEMO_FOUNDER_PASSWORD ?? "ChangeMe123!",
        12,
      ),
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: founder.id } },
    update: {},
    create: { userId: user.id, roleId: founder.id },
  });
  const companies = [
    [
      "Northpeak Logistics",
      "northpeaklogistics.co.uk",
      "GB",
      "Manchester",
      "Logistics",
    ],
    ["Tatry Foods", "tatryfoods.sk", "SK", "Poprad", "Food production"],
    ["Morava Energy", "moravaenergy.cz", "CZ", "Brno", "Energy"],
    [
      "Brighton & Finch",
      "brightonfinch.co.uk",
      "GB",
      "Brighton",
      "Professional services",
    ],
    [
      "Danube Robotics",
      "danuberobotics.sk",
      "SK",
      "Bratislava",
      "Industrial automation",
    ],
    ["Bohemia Living", "bohemialiving.cz", "CZ", "Prague", "E-commerce"],
    [
      "Orava Timberworks",
      "oravatimber.sk",
      "SK",
      "Dolný Kubín",
      "Manufacturing",
    ],
    ["Thames Legal Partners", "thameslegal.co.uk", "GB", "London", "Legal"],
    ["Vltava Medical", "vltavamedical.cz", "CZ", "Prague", "Healthcare"],
    ["Karpatská Energia", "karpatskaenergia.sk", "SK", "Košice", "Energy"],
    ["Bristol Forge", "bristolforge.co.uk", "GB", "Bristol", "Manufacturing"],
    ["Nitra Agro Systems", "nitraagro.sk", "SK", "Nitra", "Agriculture"],
    [
      "Silesia Components",
      "silesiacomponents.cz",
      "CZ",
      "Ostrava",
      "Automotive",
    ],
    [
      "Camden Property Group",
      "camdenproperty.co.uk",
      "GB",
      "London",
      "Real estate",
    ],
    [
      "Liptov Wellness",
      "liptovwellness.sk",
      "SK",
      "Liptovský Mikuláš",
      "Hospitality",
    ],
    ["Prague Cloud Works", "praguecloud.cz", "CZ", "Prague", "IT services"],
    [
      "Yorkshire Fleet Care",
      "yorkshirefleet.co.uk",
      "GB",
      "Leeds",
      "Automotive",
    ],
    ["Záhorie Packaging", "zahoriepack.sk", "SK", "Malacky", "Packaging"],
    [
      "Olomouc Office",
      "olomoucoffice.cz",
      "CZ",
      "Olomouc",
      "Workspace services",
    ],
    [
      "Kent Garden Rooms",
      "kentgardenrooms.co.uk",
      "GB",
      "Canterbury",
      "Construction",
    ],
    ["Trenčín Textile Lab", "textilelab.sk", "SK", "Trenčín", "Textile"],
    [
      "Pardubice Freight",
      "pardubicefreight.cz",
      "CZ",
      "Pardubice",
      "Logistics",
    ],
    [
      "Oxford Learning House",
      "oxfordlearninghouse.co.uk",
      "GB",
      "Oxford",
      "Education",
    ],
    ["Žilina Mobility", "zilinamobility.sk", "SK", "Žilina", "Mobility"],
    [
      "Český Retail Systems",
      "ceskyretail.cz",
      "CZ",
      "České Budějovice",
      "Retail",
    ],
    [
      "Northern Dental Group",
      "northerndental.co.uk",
      "GB",
      "Newcastle",
      "Healthcare",
    ],
    ["Prešov Build", "presovbuild.sk", "SK", "Prešov", "Construction"],
    ["Liberec Outdoor", "liberecoutdoor.cz", "CZ", "Liberec", "E-commerce"],
    [
      "Surrey Accountancy",
      "surreyaccountancy.co.uk",
      "GB",
      "Guildford",
      "Accounting",
    ],
    ["Piešťany Care", "piestanycare.sk", "SK", "Piešťany", "Healthcare"],
  ] as const;
  for (const [name, domain, country, city, industry] of companies) {
    const existing = await prisma.company.findFirst({
      where: { workspaceId: workspace.id, domain },
    });
    if (!existing)
      await prisma.company.create({
        data: {
          workspaceId: workspace.id,
          ownerId: user.id,
          name,
          domain,
          website: `https://${domain}`,
          country,
          city,
          industry,
        },
      });
  }
  const contactNames = [
    ["Martin", "Kováč"],
    ["Lucia", "Horváthová"],
    ["Peter", "Novotný"],
    ["Jana", "Bartošová"],
    ["Tomáš", "Šimek"],
    ["Kateřina", "Dvořáková"],
    ["Jan", "Procházka"],
    ["Eva", "Kučerová"],
    ["Petr", "Marek"],
    ["Lenka", "Veselá"],
    ["Oliver", "Bennett"],
    ["Emily", "Clarke"],
    ["James", "Wilson"],
    ["Sophie", "Turner"],
    ["Daniel", "Hughes"],
    ["Marek", "Hudec"],
    ["Zuzana", "Králová"],
    ["Michal", "Benko"],
    ["Veronika", "Poláková"],
    ["Andrej", "Varga"],
    ["Tereza", "Černá"],
    ["Martin", "Svoboda"],
    ["Alena", "Němcová"],
    ["David", "Pospíšil"],
    ["Hana", "Jelínková"],
    ["George", "Foster"],
    ["Charlotte", "Reed"],
    ["Thomas", "Cooper"],
    ["Amelia", "Ward"],
    ["Harry", "Brooks"],
    ["Dominika", "Urbanová"],
    ["Juraj", "Mikula"],
    ["Barbora", "Kollárová"],
    ["Roman", "Tóth"],
    ["Natália", "Blahová"],
    ["Vojtěch", "Kříž"],
    ["Monika", "Benešová"],
    ["Richard", "Fiala"],
    ["Klára", "Růžičková"],
    ["Adam", "Sedláček"],
    ["Jack", "Morgan"],
    ["Isla", "Price"],
    ["Henry", "Bailey"],
    ["Grace", "Murphy"],
    ["Leo", "Richardson"],
  ] as const;
  const storedCompanies = await prisma.company.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { name: "asc" },
  });
  for (const [index, [firstName, lastName]] of contactNames.entries()) {
    const company = storedCompanies[index % storedCompanies.length];
    const email =
      `${firstName}.${lastName}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replaceAll(" ", "") + `@${company.domain}`;
    const existing = await prisma.contact.findFirst({
      where: { workspaceId: workspace.id, email },
    });
    if (!existing)
      await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          companyId: company.id,
          ownerId: user.id,
          firstName,
          lastName,
          email,
          jobTitle:
            index % 4 === 0
              ? "Managing Director"
              : index % 4 === 1
                ? "Operations Manager"
                : index % 4 === 2
                  ? "Head of IT"
                  : "Marketing Director",
          language:
            company.country === "SK"
              ? "sk"
              : company.country === "CZ"
                ? "cs"
                : "en",
          status:
            index % 5 === 0
              ? "QUALIFIED"
              : index % 3 === 0
                ? "CONTACTED"
                : "READY_FOR_OUTREACH",
        },
      });
  }
  await prisma.opportunityStage.createMany({
    data: [
      "New opportunity",
      "Initial contact",
      "Replied",
      "Qualified",
      "Discovery scheduled",
      "Discovery completed",
      "Solution preparation",
      "Proposal sent",
      "Negotiation",
      "Verbal agreement",
      "Won",
      "Lost",
      "Paused",
    ].map((name, position) => ({
      workspaceId: workspace.id,
      name,
      key: name.toLowerCase().replaceAll(" ", "_"),
      position,
      probability: [5, 10, 20, 35, 45, 55, 65, 70, 80, 90, 100, 0, 0][position],
      terminal: position >= 10,
    })),
    skipDuplicates: true,
  });
}

main().finally(() => prisma.$disconnect());
