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
          <p>Controls for approved lead collection sources.</p>
        </div>
      </div>
      <div className="settings-content settings-content-single">{children}</div>
    </>
  );
}
