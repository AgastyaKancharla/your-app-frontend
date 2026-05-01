import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { formatRoleLabel, PAGE_PERMISSIONS } from "../../access";
import { UI_CONFIG } from "../../config/uiConfig";
import { CRM_PAGE_KEYS } from "../../modules/crm/routes";
import { hasPermission } from "../../utils/permissionEngine";

const SECTIONS = [
  {
    title: "Dashboard",
    items: [{ key: "HOME", label: "Overview", path: "/dashboard", permission: PAGE_PERMISSIONS.HOME }]
  },
  {
    title: "POS",
    items: [
      { key: "POS", label: "New Order", path: "/dashboard/pos", permission: PAGE_PERMISSIONS.POS },
      { key: "ORDERS", label: "Orders", path: "/dashboard/orders", permission: PAGE_PERMISSIONS.ORDERS },
      { key: "KITCHEN", label: "Kitchen", path: "/dashboard/kitchen", permission: PAGE_PERMISSIONS.KITCHEN },
      {
        key: "ORDER_MANAGEMENT",
        label: "Order Management",
        path: "/dashboard/order-management",
        permission: PAGE_PERMISSIONS.ORDER_MANAGEMENT
      },
      {
        key: "MENU_MANAGEMENT",
        label: "Menu Management",
        path: "/dashboard/menu",
        permission: PAGE_PERMISSIONS.MENU_MANAGEMENT
      },
      { key: "DELIVERY", label: "Dispatch", path: "/dashboard/dispatch", permission: PAGE_PERMISSIONS.DELIVERY }
    ]
  },
  {
    title: "Inventory",
    items: [
      {
        key: "INVENTORY",
        label: "Inventory",
        path: "/dashboard/inventory",
        permission: PAGE_PERMISSIONS.INVENTORY
      }
    ]
  },
  {
    title: "CRM",
    items: [
      {
        key: CRM_PAGE_KEYS.CUSTOMERS_OVERVIEW,
        label: "Overview",
        path: "/dashboard/crm/overview",
        permission: PAGE_PERMISSIONS[CRM_PAGE_KEYS.CUSTOMERS_OVERVIEW]
      },
      {
        key: CRM_PAGE_KEYS.CUSTOMERS_LIST,
        label: "Customers",
        path: "/dashboard/crm/customers",
        permission: PAGE_PERMISSIONS[CRM_PAGE_KEYS.CUSTOMERS_LIST]
      },
      {
        key: CRM_PAGE_KEYS.MARKETING,
        label: "Marketing",
        path: "/dashboard/crm/marketing",
        permission: PAGE_PERMISSIONS[CRM_PAGE_KEYS.MARKETING]
      }
    ]
  },
  {
    title: "Finance",
    items: [
      {
        key: "FINANCE_OVERVIEW",
        label: "Overview",
        path: "/dashboard/finance/overview",
        permission: PAGE_PERMISSIONS.FINANCE_OVERVIEW
      }
    ]
  },
  {
    title: "Settings",
    items: [
      {
        key: "GENERAL_SETTINGS",
        label: "General",
        path: "/dashboard/settings/general",
        permission: PAGE_PERMISSIONS.GENERAL_SETTINGS
      },
      {
        key: "BILLING_TAX_SETTINGS",
        label: "Billing & Tax",
        path: "/dashboard/settings/billing",
        permission: PAGE_PERMISSIONS.BILLING_TAX_SETTINGS
      },
      {
        key: "NOTIFICATION_SETTINGS",
        label: "Notifications",
        path: "/dashboard/settings/notifications",
        permission: PAGE_PERMISSIONS.NOTIFICATION_SETTINGS
      },
      {
        key: "INTEGRATIONS_SETTINGS",
        label: "Integrations",
        path: "/dashboard/settings/integrations",
        permission: PAGE_PERMISSIONS.INTEGRATIONS_SETTINGS
      },
      { key: "STAFF", label: "Staff", path: "/dashboard/settings/staff", permission: PAGE_PERMISSIONS.STAFF },
      { key: "ROLES", label: "Roles", path: "/dashboard/settings/roles", permission: PAGE_PERMISSIONS.ROLES },
      {
        key: "ACTIVITY_LOGS",
        label: "Activity Logs",
        path: "/dashboard/settings/activity",
        permission: PAGE_PERMISSIONS.ACTIVITY_LOGS
      }
    ]
  }
];

const Section = ({ title, isOpen, isActive, onToggle, children }) => (
  <motion.div
    className={`sidebar-nav-section ${isActive ? "sidebar-nav-section-active" : ""}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.28, ease: "easeOut" }}
  >
    <motion.button
      type="button"
      className="sidebar-section-trigger"
      onClick={onToggle}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      aria-expanded={isOpen}
    >
      <span>{title}</span>
      <motion.span
        className="sidebar-section-chevron"
        animate={{ rotate: isOpen ? 90 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {">"}
      </motion.span>
    </motion.button>

    <AnimatePresence initial={false}>
      {isOpen ? (
        <motion.div
          className="sidebar-section-items"
          initial={{ height: 0, opacity: 0, y: -4 }}
          animate={{ height: "auto", opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="space-y-1 pt-1">{children}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  </motion.div>
);

const Item = ({ label, page, currentPage, onNavigate }) => {
  const active = currentPage === page;

  const handleNavigate = () => {
    onNavigate?.(page);
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleNavigate();
        }
      }}
      whileHover={{ x: 4, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className={`sidebar-glass-item px-3 py-2 rounded-lg text-sm cursor-pointer ${
        active
          ? "sidebar-glass-item-active text-black font-bold"
          : "text-black/70 hover:text-black"
      }`}
    >
      {label}
    </motion.div>
  );
};

export default function Sidebar({
  goTo,
  currentPage,
  allowedPages,
  restaurantName = "Food fire",
  user,
  userRole = "OWNER",
  businessType = "",
  onOpenProfile,
  onLogout
}) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const normalizedBusinessType = String(businessType || "").trim().toUpperCase();
  const userName = user?.name || "Owner";
  const effectiveRole = user?.role || userRole || "OWNER";
  const avatarLetter = userName.slice(0, 1).toUpperCase() || "O";
  const allowedPageSet = useMemo(
    () => (Array.isArray(allowedPages) ? new Set(allowedPages) : null),
    [allowedPages]
  );
  const visibleSections = useMemo(
    () =>
      SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            (!allowedPageSet || allowedPageSet.has(item.key)) &&
            hasPermission({ role: effectiveRole }, item.permission) &&
            (!item.cloudOnly || normalizedBusinessType === "CLOUD_KITCHEN") &&
            !(UI_CONFIG.DEV_MODE_UNLOCK_ALL && item.key === "SUBSCRIPTION")
        )
      })).filter((section) => section.items.length > 0),
    [allowedPageSet, effectiveRole, normalizedBusinessType]
  );
  const activeSectionTitle = useMemo(
    () => visibleSections.find((section) => section.items.some((item) => item.key === currentPage))?.title,
    [currentPage, visibleSections]
  );
  const [openSections, setOpenSections] = useState(() => new Set());
  const expandedSections = useMemo(() => {
    const next = new Set(openSections);
    if (activeSectionTitle) {
      next.add(activeSectionTitle);
    }
    return next;
  }, [activeSectionTitle, openSections]);

  const toggleSection = (title) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (profileMenuRef.current?.contains(event.target)) {
        return;
      }

      setIsProfileMenuOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileMenuOpen]);

  const handleOpenProfile = () => {
    setIsProfileMenuOpen(false);
    onOpenProfile?.();
  };

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    onLogout?.();
  };

  return (
    <motion.div
      className="sidebar-liquid-glass h-full min-h-0 w-64 text-black flex flex-col p-4 border-r border-black/10"
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-6 relative z-10">
        <motion.div
          role="button"
          tabIndex={0}
          onClick={() => goTo?.("HOME")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              goTo?.("HOME");
            }
          }}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 360, damping: 26 }}
          className="sidebar-brand-glass flex items-center gap-3 p-3 rounded-xl cursor-pointer"
        >
          <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center font-bold shadow-lg shadow-black/20">
            WF
          </div>
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-semibold">{restaurantName}</p>
            <p className="m-0 text-xs font-medium text-black/50">Workspace</p>
          </div>
        </motion.div>
      </div>

      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {visibleSections.map((section) => {
          const isOpen = expandedSections.has(section.title);
          const isActive = section.title === activeSectionTitle;

          return (
          <Section
            key={section.title}
            title={section.title}
            isOpen={isOpen}
            isActive={isActive}
            onToggle={() => toggleSection(section.title)}
          >
            {section.items.map((item) => (
              <Item
                key={item.key}
                label={item.label}
                page={item.key}
                path={item.path}
                currentPage={currentPage}
                onNavigate={goTo}
              />
            ))}
          </Section>
          );
        })}
      </div>

      {(user || onOpenProfile || onLogout) ? (
        <div className="relative z-20 mt-4" ref={profileMenuRef}>
          <AnimatePresence initial={false}>
            {isProfileMenuOpen ? (
              <motion.div
                key="sidebar-profile-menu"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="absolute bottom-full left-0 right-0 mb-3 rounded-xl border border-black/10 bg-white/95 p-2 shadow-2xl shadow-black/15 backdrop-blur-xl"
                role="menu"
              >
                {onOpenProfile ? (
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-black/80 hover:bg-black/5"
                    onClick={handleOpenProfile}
                  >
                    Profile settings
                  </button>
                ) : null}
                {onLogout ? (
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-black/80 hover:bg-black/5"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.button
            type="button"
            className="sidebar-brand-glass flex w-full items-center gap-3 rounded-xl p-3 text-left"
            onClick={() => setIsProfileMenuOpen((open) => !open)}
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="menu"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black font-bold text-white shadow-lg shadow-black/20">
              {avatarLetter}
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-sm font-semibold text-black">{userName}</p>
              <p className="m-0 text-xs font-medium text-black/50">{formatRoleLabel(effectiveRole)}</p>
            </div>
            <span className="text-sm font-black text-black/50">{isProfileMenuOpen ? "v" : "^"}</span>
          </motion.button>
        </div>
      ) : null}
    </motion.div>
  );
}
