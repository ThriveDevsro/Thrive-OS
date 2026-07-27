import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="list-heading settings-heading">
        <div>
          <h1>Settings</h1>
          <p>Workspace configuration, collection controls and audit history.</p>
        </div>
      </div>
      <div className="settings-layout">
        <SettingsNav />
        <div className="settings-content">{children}</div>
      </div>
    </>
  );
}
