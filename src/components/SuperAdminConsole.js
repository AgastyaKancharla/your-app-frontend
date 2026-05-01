import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import PageContainer from "./ui/PageContainer";
import { API_BASE_URL } from "../config";

const PLAN_OPTIONS = ["FREE", "BASIC", "PRO", "ENTERPRISE"];
const STATUS_OPTIONS = ["ALL", "ACTIVE", "SUSPENDED"];

const readableSize = (bytes) => {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export default function SuperAdminConsole() {
  const [overview, setOverview] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedTenantPlan, setSelectedTenantPlan] = useState("FREE");
  const [selectedTenantDays, setSelectedTenantDays] = useState(30);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [loadingTenantDetails, setLoadingTenantDetails] = useState(false);
  const [savingAction, setSavingAction] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      setLoadingOverview(true);
      const res = await axios.get(`${API_BASE_URL}/api/admin/overview`);
      setOverview(res.data || null);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to load admin overview");
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const fetchTenants = useCallback(async () => {
    try {
      setLoadingTenants(true);
      const params = {
        page,
        limit: pageSize
      };

      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (planFilter !== "ALL") params.plan = planFilter;

      const res = await axios.get(`${API_BASE_URL}/api/admin/tenants`, { params });
      const payload = res.data || {};
      setTenants(Array.isArray(payload.items) ? payload.items : []);
      setPagination(payload.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to load tenants");
    } finally {
      setLoadingTenants(false);
    }
  }, [page, pageSize, planFilter, search, statusFilter]);

  const fetchTenantDetails = useCallback(async (tenantId) => {
    if (!tenantId) {
      setSelectedTenant(null);
      return;
    }

    try {
      setLoadingTenantDetails(true);
      const res = await axios.get(`${API_BASE_URL}/api/admin/tenants/${tenantId}`);
      const payload = res.data || null;
      setSelectedTenant(payload);
      setSelectedTenantPlan(payload?.restaurant?.subscriptionPlan || "FREE");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to load tenant details");
    } finally {
      setLoadingTenantDetails(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const refreshAll = async () => {
    await Promise.all([
      fetchOverview(),
      fetchTenants(),
      selectedTenant?.restaurant?._id
        ? fetchTenantDetails(selectedTenant.restaurant._id)
        : Promise.resolve()
    ]);
  };

  const setTenantStatus = async (tenantId, status) => {
    try {
      setSavingAction(true);
      await axios.patch(`${API_BASE_URL}/api/admin/tenants/${tenantId}/status`, {
        status
      });
      await refreshAll();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to update tenant status");
    } finally {
      setSavingAction(false);
    }
  };

  const updateTenantPlan = async () => {
    const tenantId = selectedTenant?.restaurant?._id;
    if (!tenantId) return;

    try {
      setSavingAction(true);
      await axios.patch(`${API_BASE_URL}/api/admin/tenants/${tenantId}/plan`, {
        plan: selectedTenantPlan,
        defaultDays: selectedTenantPlan === "FREE" ? 0 : Number(selectedTenantDays || 30)
      });
      await refreshAll();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to update tenant plan");
    } finally {
      setSavingAction(false);
    }
  };

  const forceTenantSignout = async (tenantId) => {
    const confirmed = window.confirm(
      "Force signout all users for this tenant? They will need to login again."
    );
    if (!confirmed) return;

    try {
      setSavingAction(true);
      await axios.post(`${API_BASE_URL}/api/admin/tenants/${tenantId}/force-signout`);
      await refreshAll();
      alert("Forced signout completed");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to force signout");
    } finally {
      setSavingAction(false);
    }
  };

  const counts = useMemo(() => {
    const byPlan = overview?.byPlan || {};
    return {
      total: Number(overview?.totalTenants || 0),
      free: Number(byPlan.FREE || 0),
      basic: Number(byPlan.BASIC || 0),
      pro: Number(byPlan.PRO || 0),
      enterprise: Number(byPlan.ENTERPRISE || 0)
    };
  }, [overview]);

  return (
    <PageContainer>
      <div style={header}>
        <h2 style={title}>Super Admin Console</h2>
        <p style={subtitle}>Manage all tenant restaurants, plans, statuses and support actions.</p>
      </div>

      <section style={statsGrid}>
        <StatCard label="Tenants" value={counts.total} loading={loadingOverview} />
        <StatCard label="Free" value={counts.free} loading={loadingOverview} />
        <StatCard label="Basic" value={counts.basic} loading={loadingOverview} />
        <StatCard label="Pro" value={counts.pro} loading={loadingOverview} />
        <StatCard label="Enterprise" value={counts.enterprise} loading={loadingOverview} />
      </section>

      <section style={panel}>
        <div style={toolbar}>
          <input
            placeholder="Search tenant (name/email/owner)"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ ...input, minWidth: 260 }}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={input}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={planFilter}
            onChange={(event) => setPlanFilter(event.target.value)}
            style={input}
          >
            {["ALL", ...PLAN_OPTIONS].map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
          <button
            style={btn}
            onClick={() => {
              setPage(1);
              fetchTenants();
            }}
            disabled={loadingTenants}
          >
            {loadingTenants ? "Loading..." : "Apply"}
          </button>
        </div>

        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Tenant</th>
                <th style={th}>Owner</th>
                <th style={th}>Plan</th>
                <th style={th}>Status</th>
                <th style={th}>Expiry</th>
                <th style={th}>Created</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!tenants.length ? (
                <tr>
                  <td style={td} colSpan={7}>
                    {loadingTenants ? "Loading tenants..." : "No tenants found"}
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant._id}>
                    <td style={td}>{tenant.name || "-"}</td>
                    <td style={td}>{tenant.ownerName || "-"}</td>
                    <td style={td}>{tenant.subscriptionPlan || "FREE"}</td>
                    <td style={td}>{tenant.status || "ACTIVE"}</td>
                    <td style={td}>{formatDate(tenant.subscriptionExpiry)}</td>
                    <td style={td}>{formatDate(tenant.createdAt)}</td>
                    <td style={td}>
                      <div style={rowActions}>
                        <button
                          style={smallBtn}
                          onClick={() => fetchTenantDetails(tenant._id)}
                          disabled={savingAction}
                        >
                          Open
                        </button>
                        <button
                          style={smallBtn}
                          onClick={() =>
                            setTenantStatus(
                              tenant._id,
                              tenant.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED"
                            )
                          }
                          disabled={savingAction}
                        >
                          {tenant.status === "SUSPENDED" ? "Activate" : "Suspend"}
                        </button>
                        <button
                          style={smallBtn}
                          onClick={() => forceTenantSignout(tenant._id)}
                          disabled={savingAction}
                        >
                          Signout All
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={pager}>
          <button
            style={smallBtn}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1 || loadingTenants}
          >
            Prev
          </button>
          <span style={pagerText}>
            Page {page} / {Math.max(1, Number(pagination.totalPages || 1))}
          </span>
          <button
            style={smallBtn}
            onClick={() =>
              setPage((prev) =>
                Math.min(Number(pagination.totalPages || 1), prev + 1)
              )
            }
            disabled={page >= Number(pagination.totalPages || 1) || loadingTenants}
          >
            Next
          </button>
        </div>
      </section>

      <section style={panel}>
        <h3 style={panelTitle}>Tenant Details</h3>
        {!selectedTenant ? (
          <p style={hint}>Select a tenant from the list to view details.</p>
        ) : loadingTenantDetails ? (
          <p style={hint}>Loading details...</p>
        ) : (
          <div style={detailsGrid}>
            <div style={detailCard}>
              <div style={detailTitle}>Restaurant</div>
              <div style={detailLine}>Name: {selectedTenant.restaurant?.name || "-"}</div>
              <div style={detailLine}>Email: {selectedTenant.restaurant?.email || "-"}</div>
              <div style={detailLine}>Phone: {selectedTenant.restaurant?.phone || "-"}</div>
              <div style={detailLine}>Status: {selectedTenant.restaurant?.status || "-"}</div>
            </div>

            <div style={detailCard}>
              <div style={detailTitle}>Plan Controls</div>
              <div style={controlRow}>
                <select
                  value={selectedTenantPlan}
                  onChange={(event) => setSelectedTenantPlan(event.target.value)}
                  style={input}
                >
                  {PLAN_OPTIONS.map((plan) => (
                    <option key={plan} value={plan}>
                      {plan}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={selectedTenantDays}
                  onChange={(event) =>
                    setSelectedTenantDays(Math.max(1, Number(event.target.value || 1)))
                  }
                  style={input}
                  placeholder="Default days"
                  disabled={selectedTenantPlan === "FREE"}
                />
                <button style={btn} onClick={updateTenantPlan} disabled={savingAction}>
                  Update Plan
                </button>
              </div>
              <p style={hint}>
                If no explicit expiry is sent, backend sets expiry to now + default days for paid
                plans.
              </p>
            </div>

            <div style={detailCard}>
              <div style={detailTitle}>Usage Snapshot</div>
              <div style={detailLine}>Owners: {selectedTenant.usage?.owners || 0}</div>
              <div style={detailLine}>Staff: {selectedTenant.usage?.staff || 0}</div>
              <div style={detailLine}>Orders: {selectedTenant.usage?.orders || 0}</div>
              <div style={detailLine}>Expenses: {selectedTenant.usage?.expenses || 0}</div>
              <div style={detailLine}>
                Documents: {selectedTenant.usage?.documents?.count || 0} (
                {readableSize(selectedTenant.usage?.documents?.totalSizeBytes || 0)})
              </div>
            </div>
          </div>
        )}
      </section>
    </PageContainer>
  );
}

function StatCard({ label, value, loading }) {
  return (
    <div style={statCard}>
      <div style={statLabel}>{label}</div>
      <div style={statValue}>{loading ? "..." : value}</div>
    </div>
  );
}

const header = {
  marginBottom: 12
};

const title = {
  margin: 0,
  color: "#f3f6fc",
  fontSize: 30
};

const subtitle = {
  margin: "6px 0 0",
  color: "#96a0b8",
  fontSize: 14
};

const panel = {
  border: "1px solid #2a2d38",
  background: "#151821",
  borderRadius: 14,
  padding: 14,
  marginBottom: 12
};

const panelTitle = {
  margin: 0,
  color: "#eef2fb",
  fontSize: 18
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
  marginBottom: 12
};

const statCard = {
  border: "1px solid #2b3040",
  background: "#11151f",
  borderRadius: 12,
  padding: "12px 14px"
};

const statLabel = {
  color: "#95a0b8",
  fontSize: 12
};

const statValue = {
  marginTop: 6,
  color: "#f3f6fc",
  fontSize: 24,
  fontWeight: 700
};

const toolbar = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 10
};

const input = {
  height: 36,
  borderRadius: 8,
  border: "1px solid #343949",
  background: "#0f1218",
  color: "#ecf1fa",
  padding: "0 10px",
  outline: 0
};

const btn = {
  height: 36,
  border: 0,
  borderRadius: 8,
  background: "#6d7ff5",
  color: "#f5f7fd",
  fontWeight: 700,
  padding: "0 14px",
  cursor: "pointer"
};

const smallBtn = {
  height: 30,
  border: "1px solid #3d4356",
  borderRadius: 8,
  background: "#11141d",
  color: "#d7dff2",
  fontWeight: 600,
  padding: "0 10px",
  cursor: "pointer"
};

const tableWrap = {
  width: "100%",
  overflowX: "auto"
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 1000
};

const th = {
  textAlign: "left",
  color: "#97a2bc",
  fontSize: 12,
  borderBottom: "1px solid #303547",
  padding: "10px 8px"
};

const td = {
  color: "#e5e9f3",
  fontSize: 13,
  borderBottom: "1px solid #252a39",
  padding: "11px 8px",
  verticalAlign: "top"
};

const rowActions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
};

const pager = {
  marginTop: 10,
  display: "flex",
  alignItems: "center",
  gap: 10
};

const pagerText = {
  color: "#9aa5bf",
  fontSize: 13
};

const hint = {
  margin: "10px 0 0",
  color: "#99a4bc",
  fontSize: 13
};

const detailsGrid = {
  marginTop: 10,
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
};

const detailCard = {
  border: "1px solid #2b3040",
  background: "#10141d",
  borderRadius: 10,
  padding: 12
};

const detailTitle = {
  color: "#eef2fb",
  fontSize: 15,
  fontWeight: 700,
  marginBottom: 8
};

const detailLine = {
  color: "#cfd7eb",
  fontSize: 13,
  marginBottom: 6
};

const controlRow = {
  display: "grid",
  gridTemplateColumns: "1fr 120px auto",
  gap: 8,
  alignItems: "center"
};
