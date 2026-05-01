import CustomersOverviewPage from "./customers/overview.page";
import CustomerListPage from "./customers/list.page";
import CustomerProfilePage from "./customers/profile.page";
import CampaignsPage from "./marketing/campaigns.page";
import { CRM_PAGE_KEYS } from "./routes";

export default function CrmModule({ page, routeState = {}, onNavigate }) {
  if (page === CRM_PAGE_KEYS.CUSTOMERS_OVERVIEW) {
    return <CustomersOverviewPage onNavigate={onNavigate} />;
  }

  if (page === CRM_PAGE_KEYS.CUSTOMERS_LIST) {
    return <CustomerListPage onNavigate={onNavigate} />;
  }

  if (page === CRM_PAGE_KEYS.CUSTOMER_PROFILE) {
    return (
      <CustomerProfilePage
        customerId={routeState?.customerId}
        onNavigate={onNavigate}
      />
    );
  }

  if (page === CRM_PAGE_KEYS.MARKETING) {
    return <CampaignsPage onNavigate={onNavigate} />;
  }

  return null;
}
