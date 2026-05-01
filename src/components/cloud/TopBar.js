import { cloudKitchenTheme } from "../../theme";

export default function TopBar({
  restaurant,
  workspaceName,
  onToggleSidebar,
  isMobile = false,
  notificationCount = 0
}) {
  return (
    <div
      style={{
        ...topBar,
        ...(isMobile ? topBarMobile : null)
      }}
    >
      <div style={leftCluster}>
        {isMobile ? (
          <button type="button" style={menuButton} onClick={onToggleSidebar}>
            Menu
          </button>
        ) : null}

        <div>
          <div style={workspaceTitle}>{workspaceName || restaurant?.name || "Cloud Kitchen"}</div>
          <div style={workspaceMeta}>Operational command center</div>
        </div>
      </div>

      <div
        style={{
          ...rightCluster,
          ...(isMobile ? rightClusterMobile : null)
        }}
      >
        <div style={liveBadge}>
          <span style={liveDot} />
          {notificationCount > 0 ? `${notificationCount} alerts` : "Live"}
        </div>
      </div>
    </div>
  );
}

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  padding: "18px 24px",
  borderBottom: "1px solid rgba(17, 24, 39, 0.1)",
  background:
    "linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.8)), radial-gradient(circle at 10% 0%, rgba(255, 255, 255, 0.96), transparent 28%), radial-gradient(circle at 96% 24%, rgba(202, 240, 248, 0.34), transparent 34%)",
  boxShadow: "0 18px 50px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9)",
  position: "sticky",
  top: 0,
  zIndex: 8,
  backdropFilter: "blur(22px) saturate(170%)"
};

const topBarMobile = {
  flexDirection: "column",
  alignItems: "stretch",
  padding: "12px",
  gap: 12
};

const leftCluster = {
  display: "flex",
  alignItems: "center",
  gap: 12
};

const workspaceTitle = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: "clamp(17px, 5vw, 20px)",
  fontWeight: 700
};

const workspaceMeta = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  marginTop: 4
};

const rightCluster = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "flex-end"
};

const rightClusterMobile = {
  width: "100%",
  justifyContent: "space-between"
};

const menuButton = {
  height: 38,
  borderRadius: 12,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  padding: "0 14px",
  color: cloudKitchenTheme.textPrimary,
  fontWeight: 700
};

const liveBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 34,
  borderRadius: 999,
  padding: "0 10px",
  background: cloudKitchenTheme.panelSoft,
  border: `1px solid ${cloudKitchenTheme.border}`,
  color: cloudKitchenTheme.textPrimary,
  fontSize: 12,
  fontWeight: 700
};

const liveDot = {
  width: 8,
  height: 8,
  borderRadius: 999,
  background: cloudKitchenTheme.success
};
