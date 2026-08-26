import Link from "next/link";

const items = [
  ["/", "Command Center", "⌂"],
  ["/businesses", "Businesses", "▦"],
  ["/tasks", "Tasks", "✓"],
  ["/agents", "AI Workforce", "◇"],
  ["/approvals", "Approvals", "◆"],
  ["/reviews", "Reviews", "◈"],
  ["/workspaces", "Workspaces", "◎"],
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandMark">S</div>
        <div>
          <div className="brandName">STEWARD</div>
          <div className="brandSub">HQ</div>
        </div>
      </div>
      <nav className="navList">
        {items.map(([href, label, icon]) => (
          <Link className="navItem" href={href} key={href}>
            <span className="navIcon">{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebarBottom">
        <div className="systemStatus"><span className="statusDot good" /> Systems operational</div>
        <div className="version">StewardHQ · V1.4</div>
      </div>
    </aside>
  );
}
