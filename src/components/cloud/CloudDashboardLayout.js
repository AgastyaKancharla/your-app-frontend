import { AnimatePresence, motion } from "framer-motion";

import Sidebar from "../layout/Sidebar.jsx";
import TopBar from "./TopBar";
import { cloudKitchenTheme } from "../../theme";

export default function CloudDashboardLayout({
  currentPage,
  onNavigate,
  allowedPages,
  workspaceName,
  user,
  restaurant,
  tenants,
  activeTenantId,
  onTenantChange,
  onToggleSidebar,
  isMobile = false,
  isSidebarOpen = false,
  onCloseSidebar,
  onLogout,
  onOpenProfile,
  dateRange,
  onDateRangeChange,
  notificationCount,
  children
}) {
  const sidebarContent = (
    <Sidebar
      currentPage={currentPage}
      goTo={onNavigate}
      allowedPages={allowedPages}
      restaurantName={workspaceName}
      user={user}
      userRole={user?.role}
      businessType={restaurant?.businessType || user?.businessType}
      onOpenProfile={onOpenProfile}
      onLogout={onLogout}
    />
  );

  return (
    <div style={shell}>
      {isMobile ? (
        <AnimatePresence initial={false}>
          {isSidebarOpen ? (
            <>
              <motion.div
                key="sidebar-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                style={backdrop}
                onClick={onCloseSidebar}
              />
              <motion.div
                key="sidebar-panel"
                initial={{ x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={mobileSidebar}
              >
                {sidebarContent}
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>
      ) : (
        sidebarContent
      )}

      <div style={mainArea}>
        <TopBar
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          user={user}
          restaurant={restaurant}
          workspaceName={workspaceName}
          tenants={tenants}
          activeTenantId={activeTenantId}
          onTenantChange={onTenantChange}
          onToggleSidebar={onToggleSidebar}
          isMobile={isMobile}
          onLogout={onLogout}
          onOpenProfile={onOpenProfile}
          notificationCount={notificationCount}
        />

        <div
          style={{
            ...contentArea,
            padding: isMobile ? "10px" : contentArea.padding
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

const shell = {
  height: "100dvh",
  minHeight: 0,
  width: "100%",
  display: "flex",
  background: cloudKitchenTheme.appBg,
  color: cloudKitchenTheme.textPrimary
};

const mainArea = {
  flex: 1,
  width: "100%",
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden"
};

const contentArea = {
  flex: 1,
  width: "100%",
  minWidth: 0,
  minHeight: 0,
  padding: "18px 20px 22px",
  overflowY: "auto"
};

const backdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.16)",
  zIndex: 19
};

const mobileSidebar = {
  position: "fixed",
  inset: "0 auto 0 0",
  width: "min(92vw, 300px)",
  height: "100dvh",
  zIndex: 20
};
