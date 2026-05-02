import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

import {
  createCrmCustomer,
  exportCustomersAsCsv,
  fetchCrmCustomers,
  formatCurrency,
  formatDate,
  formatNumber,
  parseImportedCustomers,
  updateCrmCustomer
} from "../api";
import { CRM_PAGE_KEYS } from "../routes";
import {
  Badge,
  CrmPageShell,
  EmptyPanel,
  ErrorPanel,
  FormField,
  Input,
  LoadingPanel,
  Modal,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  Select
} from "../components/CrmPrimitives";

const DEFAULT_FILTERS = {
  search: "",
  segment: "",
  status: "",
  platform: "",
  lastOrder: "",
  sortBy: "lastOrderAt",
  sortDir: "desc",
  page: 1,
  pageSize: 10
};

const EMPTY_RESPONSE = {
  items: [],
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1
  },
  filters: {
    segments: ["High Value", "Frequent", "At Risk", "Lost"],
    statuses: ["Active", "At Risk", "Inactive"],
    platforms: ["Direct", "Swiggy", "Zomato"]
  }
};

const createEmptyCustomerForm = () => ({
  name: "",
  phone: "",
  email: "",
  segment: "",
  platform: "",
  status: "",
  tags: ""
});

const getBadgeTone = (value = "") => {
  if (value === "High Value") return "violet";
  if (value === "Frequent" || value === "Active") return "mint";
  if (value === "At Risk") return "amber";
  if (value === "Lost" || value === "Inactive") return "rose";
  if (value === "Swiggy" || value === "Zomato") return "slate";
  return "neutral";
};

const SORTABLE_COLUMNS = {
  customer: "customer",
  segment: "segment",
  totalOrders: "totalOrders",
  totalSpend: "totalSpend",
  avgOrderValue: "avgOrderValue",
  lastOrderAt: "lastOrderAt",
  platform: "platform",
  status: "status"
};

export default function CustomerListPage({ onNavigate }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [response, setResponse] = useState(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState(createEmptyCustomerForm);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const deferredSearch = useDeferredValue(filters.search);
  const customerQueryFilters = useMemo(
    () => ({
      search: deferredSearch,
      segment: filters.segment,
      status: filters.status,
      platform: filters.platform,
      lastOrder: filters.lastOrder,
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
      page: filters.page,
      pageSize: filters.pageSize
    }),
    [
      deferredSearch,
      filters.lastOrder,
      filters.page,
      filters.pageSize,
      filters.platform,
      filters.segment,
      filters.sortBy,
      filters.sortDir,
      filters.status
    ]
  );

  const loadCustomers = useCallback(async (nextFilters = DEFAULT_FILTERS) => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchCrmCustomers({
        ...nextFilters,
        search: nextFilters.search
      });
      setResponse(data || EMPTY_RESPONSE);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load CRM customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers(customerQueryFilters);
  }, [customerQueryFilters, loadCustomers]);

  const handleFilterChange = (key, value) => {
    startTransition(() => {
      setFilters((current) => ({
        ...current,
        [key]: value,
        page: key === "page" ? value : 1
      }));
    });
  };

  const openCreateModal = useCallback(() => {
    setEditingCustomer(null);
    setCustomerForm(createEmptyCustomerForm());
    setFormOpen(true);
  }, []);

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      segment: customer.segment || "",
      platform: customer.platform || "",
      status: customer.status || "",
      tags: Array.isArray(customer.tags) ? customer.tags.join(", ") : ""
    });
    setFormOpen(true);
  };

  const handleSubmitCustomer = async () => {
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...customerForm,
        tags: customerForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      };

      if (editingCustomer?.id) {
        await updateCrmCustomer(editingCustomer.id, payload);
      } else {
        await createCrmCustomer(payload);
      }

      setFormOpen(false);
      setEditingCustomer(null);
      await loadCustomers(customerQueryFilters);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save customer.");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      return;
    }

    setImporting(true);
    setError("");

    try {
      const importedCustomers = await parseImportedCustomers(importFile);

      for (const customer of importedCustomers) {
        if (!customer.name || !customer.phone) {
          continue;
        }
        await createCrmCustomer(customer);
      }

      setImportOpen(false);
      setImportFile(null);
      await loadCustomers(customerQueryFilters);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to import customers.");
    } finally {
      setImporting(false);
    }
  };

  const currentItems = useMemo(() => response.items || [], [response.items]);
  const pagination = response.pagination || EMPTY_RESPONSE.pagination;
  const filterOptions = response.filters || EMPTY_RESPONSE.filters;

  const headerActions = useMemo(
    () => (
      <>
        <PrimaryButton onClick={openCreateModal}>Add Customer</PrimaryButton>
        <SecondaryButton onClick={() => setImportOpen(true)}>Import</SecondaryButton>
        <SecondaryButton onClick={() => exportCustomersAsCsv(currentItems)}>Export</SecondaryButton>
      </>
    ),
    [currentItems, openCreateModal]
  );

  if (loading && !currentItems.length) {
    return <LoadingPanel label="Loading customer list..." />;
  }

  return (
    <>
      <CrmPageShell
        eyebrow="CRM Customers"
        title="Searchable customer list"
        description="Browse, segment, sort, and enrich the full customer base with live backend data and clean operational workflows."
        actions={headerActions}
      >
        {error ? (
          <ErrorPanel
            description={error}
            action={<PrimaryButton onClick={() => loadCustomers(customerQueryFilters)}>Retry</PrimaryButton>}
          />
        ) : null}

        <SectionCard title="Customer Filters" description="Use search and CRM filters to isolate the exact audience you want to act on.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <FormField label="Search">
              <Input
                value={filters.search}
                onChange={(event) => handleFilterChange("search", event.target.value)}
                placeholder="Search by name, phone, or email"
              />
            </FormField>
            <FormField label="Segment">
              <Select value={filters.segment} onChange={(event) => handleFilterChange("segment", event.target.value)}>
                <option value="">All segments</option>
                {filterOptions.segments.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Status">
              <Select value={filters.status} onChange={(event) => handleFilterChange("status", event.target.value)}>
                <option value="">All statuses</option>
                {filterOptions.statuses.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Platform">
              <Select value={filters.platform} onChange={(event) => handleFilterChange("platform", event.target.value)}>
                <option value="">All platforms</option>
                {filterOptions.platforms.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Last order">
              <Select value={filters.lastOrder} onChange={(event) => handleFilterChange("lastOrder", event.target.value)}>
                <option value="">All time</option>
                <option value="7D">Last 7 days</option>
                <option value="30D">Last 30 days</option>
                <option value="90D">Last 90 days</option>
              </Select>
            </FormField>
            <FormField label="Rows per page">
              <Select value={filters.pageSize} onChange={(event) => handleFilterChange("pageSize", Number(event.target.value))}>
                {[10, 20, 50].map((option) => (
                  <option key={option} value={option}>
                    {option} rows
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </SectionCard>

        <SectionCard
          title="Customer Directory"
          description={`${formatNumber(pagination.totalItems)} customers matched your current filters.`}
        >
          {!currentItems.length ? (
            <EmptyPanel
              title="No customers matched this filter set"
              description="Try widening your search or import a CSV to populate the CRM directory."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1120px] w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-[#8f84ac]">
                      {[
                        ["customer", "Customer"],
                        ["contact", "Contact"],
                        ["segment", "Segment"],
                        ["totalOrders", "Orders"],
                        ["totalSpend", "Spend"],
                        ["avgOrderValue", "AOV"],
                        ["lastOrderAt", "Last Order"],
                        ["platform", "Platform"],
                        ["status", "Status"],
                        ["actions", "Actions"]
                      ].map(([key, label]) => (
                        <th key={key} className="px-4 py-2">
                          {SORTABLE_COLUMNS[key] ? (
                            <button
                              type="button"
                              onClick={() => {
                                const isActive = filters.sortBy === SORTABLE_COLUMNS[key];
                                handleFilterChange("sortBy", SORTABLE_COLUMNS[key]);
                                handleFilterChange("sortDir", isActive && filters.sortDir === "desc" ? "asc" : "desc");
                              }}
                              className="border-0 bg-transparent p-0 text-left text-xs uppercase tracking-[0.2em] text-[#8f84ac]"
                            >
                              {label}
                            </button>
                          ) : (
                            label
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((customer) => (
                      <tr
                        key={customer.id}
                        onClick={() =>
                          onNavigate?.(CRM_PAGE_KEYS.CUSTOMER_PROFILE, {
                            customerId: customer.id
                          })
                        }
                        className="cursor-pointer rounded-3xl bg-[#fbf8ff] transition hover:-translate-y-0.5 hover:bg-[#f7f1ff]"
                      >
                        <td className="rounded-l-3xl px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eadcf9] font-display text-sm font-bold text-[#6f3cc3]">
                              {customer.avatar}
                            </div>
                            <div>
                              <div className="font-semibold text-[#171226]">{customer.name}</div>
                              <div className="text-xs text-[#8f84ac]">{customer.customerCode}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-[#47386f]">
                          <div>{customer.phone || "No phone"}</div>
                          <div className="mt-1 text-xs text-[#8f84ac]">{customer.email || "No email linked"}</div>
                        </td>
                        <td className="px-4 py-4"><Badge tone={getBadgeTone(customer.segment)}>{customer.segment}</Badge></td>
                        <td className="px-4 py-4 text-sm font-semibold text-[#171226]">{formatNumber(customer.totalOrders)}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-[#171226]">{formatCurrency(customer.totalSpend)}</td>
                        <td className="px-4 py-4 text-sm text-[#47386f]">{formatCurrency(customer.avgOrderValue)}</td>
                        <td className="px-4 py-4 text-sm text-[#47386f]">{formatDate(customer.lastOrderAt)}</td>
                        <td className="px-4 py-4"><Badge tone={getBadgeTone(customer.platform)}>{customer.platform}</Badge></td>
                        <td className="px-4 py-4"><Badge tone={getBadgeTone(customer.status)}>{customer.status}</Badge></td>
                        <td className="rounded-r-3xl px-4 py-4">
                          <div className="flex gap-2">
                            <SecondaryButton
                              className="px-3 py-2 text-xs"
                              onClick={(event) => {
                                event.stopPropagation();
                                onNavigate?.(CRM_PAGE_KEYS.CUSTOMER_PROFILE, {
                                  customerId: customer.id
                                });
                              }}
                            >
                              View
                            </SecondaryButton>
                            <SecondaryButton
                              className="px-3 py-2 text-xs"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditModal(customer);
                              }}
                            >
                              Edit
                            </SecondaryButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-[#6f678a]">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <SecondaryButton
                    onClick={() => handleFilterChange("page", Math.max(1, pagination.page - 1))}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </SecondaryButton>
                  <PrimaryButton
                    onClick={() => handleFilterChange("page", Math.min(pagination.totalPages, pagination.page + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Next
                  </PrimaryButton>
                </div>
              </div>
            </>
          )}
        </SectionCard>
      </CrmPageShell>

      <Modal
        open={formOpen}
        title={editingCustomer ? "Edit Customer" : "Add Customer"}
        description="Capture the details needed to drive segmentation, retention, and campaign performance."
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <SecondaryButton onClick={() => setFormOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSubmitCustomer} disabled={saving}>
              {saving ? "Saving..." : editingCustomer ? "Save Changes" : "Create Customer"}
            </PrimaryButton>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Customer name">
            <Input value={customerForm.name} onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))} />
          </FormField>
          <FormField label="Phone number">
            <Input value={customerForm.phone} onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))} />
          </FormField>
          <FormField label="Email">
            <Input value={customerForm.email} onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))} />
          </FormField>
          <FormField label="Segment">
            <Select value={customerForm.segment} onChange={(event) => setCustomerForm((current) => ({ ...current, segment: event.target.value }))}>
              <option value="">Auto classify</option>
              {EMPTY_RESPONSE.filters.segments.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Platform">
            <Select value={customerForm.platform} onChange={(event) => setCustomerForm((current) => ({ ...current, platform: event.target.value }))}>
              <option value="">Auto detect</option>
              {EMPTY_RESPONSE.filters.platforms.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={customerForm.status} onChange={(event) => setCustomerForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="">Auto classify</option>
              {EMPTY_RESPONSE.filters.statuses.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Tags" hint="Separate multiple tags with commas.">
              <Input value={customerForm.tags} onChange={(event) => setCustomerForm((current) => ({ ...current, tags: event.target.value }))} placeholder="High Value, VIP, Regular" />
            </FormField>
          </div>
        </div>
      </Modal>

      <Modal
        open={importOpen}
        title="Import Customers"
        description="Upload a CSV with columns like name, phone, email, segment, platform, and status."
        onClose={() => setImportOpen(false)}
        footer={
          <>
            <SecondaryButton onClick={() => setImportOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleImport} disabled={!importFile || importing}>
              {importing ? "Importing..." : "Import Customers"}
            </PrimaryButton>
          </>
        }
      >
        <FormField label="CSV File" hint="Rows without name or phone are skipped automatically.">
          <Input type="file" accept=".csv" onChange={(event) => setImportFile(event.target.files?.[0] || null)} />
        </FormField>
      </Modal>
    </>
  );
}
