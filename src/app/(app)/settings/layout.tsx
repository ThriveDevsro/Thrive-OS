import { getAccessContext } from "@/lib/role-access";
import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SettingsLayoutContent>{children}</SettingsLayoutContent>;
}

async function SettingsLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { founder } = await getAccessContext();
  return (
    <>
      <div className="list-heading settings-heading">
        <div>
          <h1>Settings</h1>
          <p>Email connections and approved lead collection controls.</p>
        </div>
      </div>
      <div className="settings-layout">
        <SettingsNav founder={founder} />
        <div className="settings-content">{children}</div>
      </div>
    </>
  );
}
