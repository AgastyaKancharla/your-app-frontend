import { useEffect, useRef, useState } from "react";

import { formatRoleLabel } from "../../access";
import { COMPANY_NAME } from "../../branding";
import { UI_CONFIG } from "../../config/uiConfig";

const pageTitles = {
  HOME: "Dashboard",
  MENU_MANAGEMENT: "Menu Management",
  POS: "Point Of Sale",
  KITCHEN: "Order Workflow",
  ORDERS: "Orders",
  ORDER_MANAGEMENT: "Order Management",
  DELIVERY: "Delivery Management",
  TABLES: "Table Management",
  INVENTORY: "Inventory",
  FINANCE_OVERVIEW: "Finance Overview",
  CUSTOMERS: "Customer CRM",
  MARKETING: "Marketing Tools",
  DOCUMENTS: "Documents Vault",
  STAFF: "Staff Management",
  ROLES: "Roles & Permissions",
  ACTIVITY_LOGS: "Activity Logs",
  SUBSCRIPTION: "Subscription",
  PROFILE: "Profile Settings",
  ADMIN: "Super Admin Console"
};

const PLAN_LABELS = {
  FREE: "Starter",
  BASIC: "Growth",
  STARTER: "Starter",
  GROWTH: "Growth",
  PRO: "Pro",
  ENTERPRISE: "Enterprise"
};

export default function Topbar({
  page = "HOME",
  user,
  restaurant,
  tenants = [],
  activeTenantId = "",
  onTenantChange,
  restaurantName,
  onLogout,
  onOpenProfile,
  hideAccountMenu = false,
  isMobile = false,
  onToggleSidebar,
  onBrandClick
}) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const name = user?.name || "Owner";
  const role = user?.role || "OWNER";
  const avatarLetter = name?.[0]?.toUpperCase() || "O";
  const ownerName = restaurant?.ownerName || name;
  const workspaceLabel = restaurantName || restaurant?.name || "Restaurant Workspace";
  const plan = String(restaurant?.subscriptionPlan || "").trim().toUpperCase();
  const planLabel = role === "SUPER_ADMIN" ? "Platform" : (PLAN_LABELS[plan] || "Trial");
  const accountDetails = [
    { label: "Current plan", value: planLabel },
    { label: "Account name", value: name },
    { label: "Owner name", value: ownerName },
    { label: "Role", value: formatRoleLabel(role) },
    { label: "Restaurant ID", value: restaurant?.id || "Not assigned" },
    { label: "Phone number", value: user?.phone || restaurant?.phone || "Not added" },
    { label: "Email linked", value: user?.email || restaurant?.email || "Not linked" },
    { label: "Restaurant email", value: restaurant?.email || "Not added" }
  ].filter(
    (item) => !(UI_CONFIG.DEV_MODE_UNLOCK_ALL && item.label === "Current plan")
  );
  const hasMultipleTenants = Array.isArray(tenants) && tenants.length > 1;
  const selectedTenantValue = String(activeTenantId || restaurant?.tenantId || restaurant?.id || "");

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (accountMenuRef.current?.contains(event.target)) {
        return;
      }

      setIsAccountMenuOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isAccountMenuOpen]);

  const handleOpenProfile = () => {
    setIsAccountMenuOpen(false);
    onOpenProfile?.();
  };

  const handleLogoutClick = () => {
    setIsAccountMenuOpen(false);
    onLogout?.();
  };

  const accountMenu = (
    <div style={accountMenuWrap} ref={accountMenuRef}>
      <button
        type="button"
        style={{
          ...profileButton,
          ...(isMobile ? mobileProfileButton : null)
        }}
        onClick={() => setIsAccountMenuOpen((open) => !open)}
        aria-expanded={isAccountMenuOpen}
        aria-haspopup="menu"
      >
        <div style={avatar}>{avatarLetter}</div>
        <div style={profileTextWrap}>
          <div style={nameStyle}>{workspaceLabel}</div>
          <div style={secondaryLine}>
            {isMobile ? ownerName : `Owner: ${ownerName}`}
          </div>
        </div>
        {!isMobile ? (
          <div style={profileMetaWrap}>
            <span style={metaPill}>{formatRoleLabel(role)}</span>
            {!UI_CONFIG.DEV_MODE_UNLOCK_ALL ? (
              <span style={planPill}>{planLabel}</span>
            ) : null}
          </div>
        ) : null}
        <span style={menuArrow}>{isAccountMenuOpen ? "▴" : "▾"}</span>
      </button>

      {isAccountMenuOpen ? (
        <div
          style={{
            ...accountDropdown,
            width: isMobile ? "min(340px, calc(100vw - 28px))" : accountDropdown.width
          }}
          role="menu"
        >
          <div style={dropdownHero}>
            <div style={dropdownAvatar}>{avatarLetter}</div>
            <div style={dropdownHeroText}>
              <div style={dropdownTitle}>{ownerName}</div>
              <div style={dropdownSubtitle}>{workspaceLabel}</div>
            </div>
          </div>

          <div
            style={{
              ...detailGrid,
              gridTemplateColumns: isMobile ? "1fr" : detailGrid.gridTemplateColumns
            }}
          >
            {accountDetails.map((item) => (
              <div key={item.label} style={detailCard}>
                <div style={detailLabel}>{item.label}</div>
                <div style={detailValue}>{item.value}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              ...actionRow,
              gridTemplateColumns: isMobile ? "1fr" : actionRow.gridTemplateColumns
            }}
          >
            {onOpenProfile ? (
              <button type="button" style={profileAction} onClick={handleOpenProfile}>
                Open Profile Settings
              </button>
            ) : null}
            {onLogout ? (
              <button type="button" style={logoutAction} onClick={handleLogoutClick}>
                Logout
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      style={{
        ...topbar,
        ...(isMobile ? mobileTopbar : desktopTopbar)
      }}
    >
      {isMobile ? (
        <>
          <div style={mobileBrandWrap}>
            <button type="button" style={brandButton} onClick={onBrandClick}>
              {COMPANY_NAME}
            </button>
            <div style={mobilePageTitle}>{pageTitles[page] || COMPANY_NAME}</div>
          </div>

          <div style={mobileControlsRow}>
            {hasMultipleTenants ? (
              <select
                value={selectedTenantValue}
                onChange={(event) => onTenantChange?.(event.target.value)}
                style={tenantSelectorMobile}
              >
                {tenants.map((tenant) => {
                  const value = String(tenant?.tenantId || tenant?.id || "");
                  const label = tenant?.name || "Workspace";
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
            ) : null}
            {onToggleSidebar ? (
              <button type="button" style={menuToggle} onClick={onToggleSidebar}>
                Menu
              </button>
            ) : (
              <span />
            )}

            {!hideAccountMenu ? accountMenu : null}
          </div>
        </>
      ) : (
        <>
          <div style={desktopBrandRow}>
            <button type="button" style={brandButton} onClick={onBrandClick}>
              <div style={companyBrandChip}>
                <div style={companyBrandMark}>╱╲</div>
                <div style={companyBrandText}>{COMPANY_NAME}</div>
              </div>
            </button>
          </div>

          <div style={desktopInfoRow}>
            <div style={desktopSectionLeft}>
              <div style={workspaceLogoMark}>╱╲</div>
              <div>
                <div style={workspaceTitle}>{workspaceLabel}</div>
                <div style={workspaceSub}>Workspace</div>
              </div>
              {hasMultipleTenants ? (
                <select
                  value={selectedTenantValue}
                  onChange={(event) => onTenantChange?.(event.target.value)}
                  style={tenantSelectorDesktop}
                >
                  {tenants.map((tenant) => {
                    const value = String(tenant?.tenantId || tenant?.id || "");
                    const label = tenant?.name || "Workspace";
                    const roleLabel = String(tenant?.role || "").trim();
                    return (
                      <option key={value} value={value}>
                        {roleLabel ? `${label} (${roleLabel})` : label}
                      </option>
                    );
                  })}
                </select>
              ) : null}
            </div>

            <div style={desktopSectionRight}>{!hideAccountMenu ? accountMenu : null}</div>
          </div>
        </>
      )}
    </div>
  );
}

const topbar = {
  display: "grid",
  gap: 12,
  padding: "16px 20px",
  background: "#111217",
  borderBottom: "1px solid #22242e"
};

const desktopTopbar = {
  gridTemplateRows: "auto auto"
};

const mobileTopbar = {
  display: "flex",
  flexDirection: "column",
  gap: 12
};

const mobileBrandWrap = {
  width: "100%",
  textAlign: "center",
  display: "grid",
  justifyItems: "center",
  gap: 2
};

const mobilePageTitle = {
  color: "#f2f4f8",
  fontWeight: 700,
  fontSize: 18
};

const mobileControlsRow = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12
};

const desktopSectionLeft = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
  justifySelf: "start"
};

const workspaceLogoMark = {
  width: 30,
  height: 30,
  borderRadius: 9,
  display: "grid",
  placeItems: "center",
  color: "#61e0ff",
  background: "rgba(97,224,255,0.12)",
  fontSize: 12,
  fontWeight: 800,
  flexShrink: 0
};

const workspaceTitle = {
  color: "#f2f4f8",
  fontSize: 15,
  fontWeight: 700
};

const workspaceSub = {
  color: "#8f98af",
  fontSize: 11,
  marginTop: 2
};

const companyBrandChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid rgba(244,201,58,0.16)",
  background: "rgba(244,201,58,0.06)"
};

const companyBrandMark = {
  width: 28,
  height: 28,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  color: "#1a1506",
  background: "#f4c93a",
  fontSize: 11,
  fontWeight: 800
};

const companyBrandText = {
  color: "#f4c93a",
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: 0.3
};

const desktopSectionRight = {
  justifySelf: "end"
};

const menuToggle = {
  height: 38,
  borderRadius: 10,
  border: "1px solid #2f3545",
  background: "#161a23",
  color: "#f3f6fc",
  padding: "0 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer"
};

const tenantSelectorDesktop = {
  height: 36,
  borderRadius: 10,
  border: "1px solid #2f3545",
  background: "#161a23",
  color: "#f3f6fc",
  padding: "0 10px",
  fontSize: 12,
  fontWeight: 700,
  maxWidth: 260
};

const tenantSelectorMobile = {
  height: 38,
  borderRadius: 10,
  border: "1px solid #2f3545",
  background: "#161a23",
  color: "#f3f6fc",
  padding: "0 10px",
  fontSize: 12,
  fontWeight: 700,
  maxWidth: "58vw"
};

const accountMenuWrap = {
  position: "relative",
  maxWidth: "100%"
};

const profileButton = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  borderRadius: 14,
  border: "1px solid #2a3040",
  background: "#161a23",
  color: "#f3f6fc",
  padding: "10px 14px",
  minHeight: 64,
  cursor: "pointer",
  textAlign: "left"
};

const mobileProfileButton = {
  minHeight: 52,
  padding: "8px 12px",
  gap: 10,
  maxWidth: "min(220px, calc(100vw - 120px))"
};

const profileTextWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  minWidth: 0,
  overflow: "hidden"
};

const avatar = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #f8d76e, #f98a6d)",
  display: "grid",
  placeItems: "center",
  color: "#101114",
  fontWeight: 800,
  flexShrink: 0
};

const nameStyle = {
  color: "#f3f5fa",
  fontWeight: 700,
  fontSize: 14,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

const secondaryLine = {
  color: "#8a91a4",
  fontSize: 12,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

const profileMetaWrap = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  flexShrink: 0
};

const metaPill = {
  borderRadius: 999,
  border: "1px solid rgba(244,201,58,0.28)",
  background: "rgba(244,201,58,0.12)",
  color: "#f4c93a",
  padding: "3px 8px",
  fontSize: 11,
  fontWeight: 700
};

const planPill = {
  borderRadius: 999,
  border: "1px solid rgba(97,224,255,0.2)",
  background: "rgba(97,224,255,0.12)",
  color: "#9deaff",
  padding: "3px 8px",
  fontSize: 11,
  fontWeight: 700
};

const menuArrow = {
  color: "#94a0bb",
  fontSize: 14,
  flexShrink: 0
};

const accountDropdown = {
  position: "absolute",
  top: "calc(100% + 10px)",
  right: 0,
  width: "min(420px, calc(100vw - 48px))",
  borderRadius: 18,
  border: "1px solid #2a3040",
  background: "#10151e",
  boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
  padding: 16,
  zIndex: 20
};

const dropdownHero = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  paddingBottom: 14,
  marginBottom: 14,
  borderBottom: "1px solid rgba(149,161,190,0.16)"
};

const dropdownAvatar = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #f8d76e, #f98a6d)",
  display: "grid",
  placeItems: "center",
  color: "#101114",
  fontWeight: 800
};

const dropdownHeroText = {
  minWidth: 0
};

const dropdownTitle = {
  color: "#f4f7fd",
  fontSize: 16,
  fontWeight: 700
};

const dropdownSubtitle = {
  color: "#9aa5be",
  fontSize: 13,
  marginTop: 2
};

const detailGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10
};

const detailCard = {
  borderRadius: 12,
  border: "1px solid rgba(149,161,190,0.14)",
  background: "#161c27",
  padding: "10px 12px"
};

const detailLabel = {
  color: "#8f9bb3",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.3
};

const detailValue = {
  color: "#f4f7fd",
  fontSize: 13,
  fontWeight: 600,
  marginTop: 4,
  wordBreak: "break-word"
};

const actionRow = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
  marginTop: 14
};

const profileAction = {
  height: 40,
  borderRadius: 10,
  border: "1px solid rgba(244,201,58,0.24)",
  background: "rgba(244,201,58,0.12)",
  color: "#f4c93a",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer"
};

const logoutAction = {
  height: 40,
  borderRadius: 10,
  border: "1px solid #3a4052",
  background: "transparent",
  color: "#d9e1f1",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer"
};
const desktopBrandRow = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};

const desktopInfoRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16
};

const brandButton = {
  border: 0,
  background: "transparent",
  color: "inherit",
  padding: 0,
  cursor: "pointer",
  font: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: 8
};
