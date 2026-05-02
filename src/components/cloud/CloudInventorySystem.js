import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import API_URL from "../../config/api";
import { useInventoryStore } from "../../store/inventoryStore";
import { cloudKitchenTheme } from "../../theme";
import { connectOrdersSocket, formatCurrency } from "./cloudKitchenUtils";

const ACTIVE_TENANT_STORAGE_KEY = "restaurant_crm_active_tenant_id";

const TABS = [
  { key: "raw", label: "Raw Materials", endpoint: "/api/inventory/raw" },
  { key: "prep", label: "Prep Items", endpoint: "/api/inventory/prep" },
  { key: "packaging", label: "Packaging", endpoint: "/api/inventory/packaging" },
  { key: "wastage", label: "Wastage", endpoint: "/api/inventory/wastage" },
  { key: "suppliers", label: "Suppliers", endpoint: "/api/inventory/suppliers" },
  { key: "purchase-orders", label: "Purchase Orders", endpoint: "/api/inventory/purchase-orders" }
];

const EMPTY_FORMS = {
  raw: {
    name: "",
    category: "General",
    unit: "kg",
    currentStock: "",
    minStock: "",
    costPerUnit: "",
    supplierId: "",
    supplierName: "",
    expiryDate: "",
    image: ""
  },
  prep: {
    name: "",
    batchNo: "",
    quantity: "",
    unit: "kg",
    cost: "",
    preparedAt: new Date().toISOString().slice(0, 10),
    expiryAt: "",
    status: "ACTIVE",
    rawMaterialUsage: [{ materialId: "", qty: "", unit: "kg" }]
  },
  packaging: {
    name: "",
    category: "Packaging",
    unit: "pcs",
    stock: "",
    minStock: "",
    costPerUnit: "",
    supplierId: "",
    image: ""
  },
  wastage: {
    type: "raw",
    itemId: "",
    quantity: "",
    reason: "expired"
  },
  suppliers: {
    name: "",
    contact: "",
    phone: "",
    email: "",
    category: "General",
    rating: "4",
    onTimeDelivery: "100",
    isActive: true,
    address: "",
    notes: ""
  },
  "purchase-orders": {
    supplierId: "",
    status: "OPEN",
    paymentStatus: "UNPAID",
    expectedDelivery: "",
    notes: "",
    items: [{ type: "raw", itemId: "", itemName: "", qty: "", unit: "kg", cost: "" }]
  }
};

const CSV_FIELDS = {
  raw: [
    "name",
    "category",
    "unit",
    "currentStock",
    "minStock",
    "costPerUnit",
    "supplierId",
    "supplierName",
    "expiryDate",
    "image"
  ],
  prep: [
    "name",
    "batchNo",
    "quantity",
    "unit",
    "cost",
    "preparedAt",
    "expiryAt",
    "status",
    "rawMaterialUsage"
  ],
  packaging: [
    "name",
    "category",
    "unit",
    "stock",
    "minStock",
    "costPerUnit",
    "supplierId",
    "image"
  ],
  wastage: ["type", "itemId", "quantity", "reason"],
  suppliers: [
    "name",
    "contact",
    "phone",
    "email",
    "category",
    "rating",
    "onTimeDelivery",
    "isActive",
    "address",
    "notes"
  ],
  "purchase-orders": [
    "supplierId",
    "status",
    "paymentStatus",
    "expectedDelivery",
    "notes",
    "items"
  ]
};

const METRIC_CONFIG = {
  raw: [
    ["totalItems", "Total Items"],
    ["totalStockValue", "Total Stock Value", "currency"],
    ["lowStockItems", "Low Stock Items"],
    ["expiringSoon", "Expiring Soon"],
    ["todayConsumption", "Today Consumption"]
  ],
  prep: [
    ["totalPrepItems", "Total Prep Items"],
    ["totalValue", "Total Value", "currency"],
    ["expiringToday", "Expiring Today"],
    ["expiringSoon", "Expiring Soon"],
    ["totalBatches", "Total Batches"]
  ],
  packaging: [
    ["totalItems", "Total Items"],
    ["stockValue", "Stock Value", "currency"],
    ["lowStock", "Low Stock"],
    ["outOfStock", "Out of Stock"],
    ["dailyUsage", "Daily Usage"]
  ],
  wastage: [
    ["totalWastage", "Total Wastage", "currency"],
    ["quantityWasted", "Quantity Wasted"],
    ["weeklyWastage", "Weekly Wastage", "currency"],
    ["monthlyWastage", "Monthly Wastage", "currency"],
    ["percentOfSales", "% of Sales", "percent"]
  ],
  suppliers: [
    ["totalSuppliers", "Total Suppliers"],
    ["activeSuppliers", "Active Suppliers"],
    ["monthlyPurchase", "Monthly Purchase", "currency"],
    ["onTimeDelivery", "On-time Delivery", "percent"]
  ],
  "purchase-orders": [
    ["totalPOs", "Total POs"],
    ["open", "Open"],
    ["inTransit", "In Transit"],
    ["received", "Received"],
    ["monthlyValue", "Monthly Value", "currency"]
  ]
};

const STATUS_FILTERS = {
  raw: ["ALL", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"],
  prep: ["ALL", "ACTIVE", "LOW_STOCK", "EXPIRED", "CONSUMED"],
  packaging: ["ALL", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"],
  wastage: ["ALL", "raw", "prep", "packaging"],
  suppliers: ["ALL", "ACTIVE", "INACTIVE"],
  "purchase-orders": ["ALL", "OPEN", "CONFIRMED", "IN_TRANSIT", "DELIVERED"]
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getRowId = (row = {}) => String(row._id || row.id || row.poNumber || row.name || "");

const getTabConfig = (key) => TABS.find((tab) => tab.key === key) || TABS[0];

const getStatusTone = (status = "") => {
  const value = String(status || "").toUpperCase();
  if (["IN_STOCK", "ACTIVE", "DELIVERED", "PAID"].includes(value)) return "green";
  if (["LOW_STOCK", "EXPIRING_SOON", "OPEN", "CONFIRMED", "PARTIAL"].includes(value)) return "orange";
  if (["OUT_OF_STOCK", "EXPIRED", "CONSUMED", "CANCELLED", "UNPAID"].includes(value)) return "red";
  return "neutral";
};

function useIsNarrow() {
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 980 : false
  );

  useEffect(() => {
    const sync = () => setIsNarrow(window.innerWidth < 980);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return isNarrow;
}

export default function InventorySystem() {
  const isNarrow = useIsNarrow();
  const searchRef = useRef(null);
  const importInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("raw");
  const { rows, setRows } = useInventoryStore();
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modalMode, setModalMode] = useState("");
  const [editingRow, setEditingRow] = useState(null);
  const [viewingRow, setViewingRow] = useState(null);
  const [form, setForm] = useState(EMPTY_FORMS.raw);
  const [supporting, setSupporting] = useState({
    suppliers: [],
    raw: [],
    prep: [],
    packaging: []
  });

  const activeConfig = getTabConfig(activeTab);

  const loadSupportingData = useCallback(async () => {
    try {
      const [suppliersRes, rawRes, prepRes, packagingRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/inventory/suppliers`, { params: { limit: 100 } }),
        axios.get(`${API_URL}/api/inventory/raw`, { params: { limit: 100 } }),
        axios.get(`${API_URL}/api/inventory/prep`, { params: { limit: 100 } }),
        axios.get(`${API_URL}/api/inventory/packaging`, { params: { limit: 100 } })
      ]);

      setSupporting({
        suppliers:
          suppliersRes.status === "fulfilled" ? suppliersRes.value.data?.data || [] : [],
        raw: rawRes.status === "fulfilled" ? rawRes.value.data?.data || [] : [],
        prep: prepRes.status === "fulfilled" ? prepRes.value.data?.data || [] : [],
        packaging:
          packagingRes.status === "fulfilled" ? packagingRes.value.data?.data || [] : []
      });
    } catch {
      setSupporting({ suppliers: [], raw: [], prep: [], packaging: [] });
    }
  }, []);

  const loadActiveTab = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search,
        limit: 100,
        status: statusFilter
      };

      if (activeTab === "wastage" && statusFilter !== "ALL") {
        params.type = statusFilter;
        delete params.status;
      }

      const response = await axios.get(`${API_URL}${activeConfig.endpoint}`, { params });
      setRows(Array.isArray(response.data?.data) ? response.data.data : []);
      setMetrics(response.data?.metrics || {});
      setError("");
    } catch (requestError) {
      setRows([]);
      setMetrics({});
      setError(requestError.response?.data?.message || "Unable to load inventory data.");
    } finally {
      setLoading(false);
    }
  }, [activeConfig.endpoint, activeTab, search, setRows, statusFilter]);

  useEffect(() => {
    setStatusFilter("ALL");
    setSearch("");
    setMessage("");
    setError("");
  }, [activeTab]);

  useEffect(() => {
    loadActiveTab();
  }, [loadActiveTab]);

  useEffect(() => {
    loadSupportingData();
  }, [loadSupportingData, rows.length]);

  useEffect(() => {
    const tenantId = window.localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY) || "";
    const socket = connectOrdersSocket(tenantId);
    if (!socket) return undefined;

    const reload = () => {
      loadActiveTab();
      loadSupportingData();
    };

    socket.on("inventory:update", reload);
    socket.on("order:new", reload);

    return () => {
      socket.off("inventory:update", reload);
      socket.off("order:new", reload);
      socket.disconnect();
    };
  }, [loadActiveTab, loadSupportingData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadActiveTab();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadActiveTab]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openCreate = () => {
    setEditingRow(null);
    setForm(JSON.parse(JSON.stringify(EMPTY_FORMS[activeTab])));
    setModalMode("edit");
  };

  const openEdit = (row) => {
    setEditingRow(row);
    setForm(buildFormFromRow(activeTab, row));
    setModalMode("edit");
  };

  const closeModal = () => {
    if (saving) return;
    setModalMode("");
    setEditingRow(null);
    setViewingRow(null);
  };

  const saveForm = async () => {
    try {
      setSaving(true);
      setError("");
      const payload = buildPayload(activeTab, form);
      const id = editingRow ? getRowId(editingRow) : "";
      const method = editingRow ? "put" : "post";
      const url = editingRow
        ? `${API_URL}${activeConfig.endpoint}/${id}`
        : `${API_URL}${activeConfig.endpoint}`;

      await axios[method](url, payload);
      setMessage(editingRow ? "Updated successfully." : "Created successfully.");
      closeModal();
      await loadActiveTab();
      await loadSupportingData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save.");
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row) => {
    if (!window.confirm(`Delete ${row.name || row.poNumber || "this item"}?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}${activeConfig.endpoint}/${getRowId(row)}`);
      setMessage("Deleted successfully.");
      await loadActiveTab();
      await loadSupportingData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete.");
    }
  };

  const updatePOStatus = async (row, status) => {
    try {
      await axios.patch(`${API_URL}/api/inventory/purchase-orders/${getRowId(row)}/status`, {
        status
      });
      setMessage(status === "DELIVERED" ? "PO received and stock updated." : "PO status updated.");
      await loadActiveTab();
      await loadSupportingData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update PO.");
    }
  };

  const saveInlineRaw = async (row, patch) => {
    try {
      const payload = buildPayload("raw", { ...buildFormFromRow("raw", row), ...patch });
      await axios.put(`${API_URL}/api/inventory/raw/${getRowId(row)}`, payload);
      await loadActiveTab();
      await loadSupportingData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update stock.");
    }
  };

  const exportRows = () => {
    if (!rows.length) {
      setError("There are no rows to export for this tab.");
      return;
    }

    const csv = buildCsv(activeTab, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Export downloaded.");
    setError("");
  };

  const importRows = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setImporting(true);
      setError("");
      const text = await file.text();
      const records = parseCsv(text);
      if (!records.length) {
        throw new Error("CSV file has no data rows.");
      }

      for (const record of records) {
        const payload = buildPayload(activeTab, normalizeImportRecord(activeTab, record));
        await axios.post(`${API_URL}${activeConfig.endpoint}`, payload);
      }

      setMessage(`Imported ${records.length} ${records.length === 1 ? "row" : "rows"}.`);
      await loadActiveTab();
      await loadSupportingData();
    } catch (importError) {
      setError(importError.response?.data?.message || importError.message || "Unable to import CSV.");
    } finally {
      setImporting(false);
    }
  };

  const columns = useMemo(() => getColumns(activeTab), [activeTab]);
  const modalTitle = `${editingRow ? "Edit" : "Add"} ${activeConfig.label}`;

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <h1 style={title}>Inventory</h1>
          <p style={subtitle}>Raw materials, prep batches, packaging, wastage, suppliers, and POs</p>
        </div>
        <div style={headerActions}>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={importRows}
          />
          <button
            type="button"
            style={secondaryButton}
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? "Importing" : "Import"}
          </button>
          <button type="button" style={secondaryButton} onClick={exportRows}>
            Export
          </button>
          <button type="button" style={primaryButton} onClick={openCreate}>
            Add {activeConfig.label.replace(/s$/, "")}
          </button>
        </div>
      </div>

      <div style={tabsWrap}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            style={{
              ...tabButton,
              ...(activeTab === tab.key ? tabButtonActive : null)
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section style={metricsGrid}>
        {(METRIC_CONFIG[activeTab] || []).map(([key, label, format]) => (
          <MetricCard key={key} label={label} value={formatMetric(metrics[key], format)} />
        ))}
      </section>

      <div style={{ ...stickyFilters, ...(isNarrow ? stickyFiltersNarrow : null) }}>
        <input
          ref={searchRef}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search inventory (Ctrl+K)"
          style={searchInput}
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          style={selectInput}
        >
          {(STATUS_FILTERS[activeTab] || ["ALL"]).map((option) => (
            <option key={option} value={option}>
              {formatLabel(option)}
            </option>
          ))}
        </select>
        <button type="button" style={secondaryButton} onClick={loadActiveTab}>
          Refresh
        </button>
      </div>

      {message ? <div style={successBanner}>{message}</div> : null}
      {error ? <div style={errorBanner}>{error}</div> : null}

      <InventoryTable
        activeTab={activeTab}
        columns={columns}
        rows={rows}
        loading={loading}
        isNarrow={isNarrow}
        onEdit={openEdit}
        onDelete={deleteRow}
        onView={(row) => setViewingRow(row)}
        onReceivePO={(row) => updatePOStatus(row, "DELIVERED")}
        onInlineRawUpdate={saveInlineRaw}
      />

      {activeTab === "wastage" && rows.length ? (
        <WastageCharts metrics={metrics} />
      ) : null}

      {modalMode === "edit" ? (
        <EditorModal
          title={modalTitle}
          activeTab={activeTab}
          form={form}
          setForm={setForm}
          supporting={supporting}
          saving={saving}
          onClose={closeModal}
          onSave={saveForm}
        />
      ) : null}

      {viewingRow ? <ViewModal row={viewingRow} onClose={() => setViewingRow(null)} /> : null}
    </div>
  );
}

function getColumns(tab) {
  if (tab === "raw") {
    return [
      { key: "name", label: "Item Name" },
      { key: "category", label: "Category" },
      { key: "unit", label: "Unit" },
      { key: "currentStock", label: "Current Stock" },
      { key: "minStock", label: "Min Stock" },
      { key: "costPerUnit", label: "Cost / Unit" },
      { key: "supplierName", label: "Supplier" },
      { key: "expiryDate", label: "Expiry Date" },
      { key: "status", label: "Status" }
    ];
  }
  if (tab === "prep") {
    return [
      { key: "name", label: "Prep Item" },
      { key: "batchNo", label: "Batch" },
      { key: "quantity", label: "Qty" },
      { key: "cost", label: "Cost" },
      { key: "preparedAt", label: "Prepared On" },
      { key: "expiryAt", label: "Expiry" },
      { key: "status", label: "Status" }
    ];
  }
  if (tab === "packaging") {
    return [
      { key: "name", label: "Item" },
      { key: "category", label: "Category" },
      { key: "stock", label: "Stock" },
      { key: "minStock", label: "Min Stock" },
      { key: "costPerUnit", label: "Cost / Unit" },
      { key: "supplierName", label: "Supplier" },
      { key: "status", label: "Status" }
    ];
  }
  if (tab === "wastage") {
    return [
      { key: "itemName", label: "Item" },
      { key: "type", label: "Type" },
      { key: "quantity", label: "Quantity" },
      { key: "reason", label: "Reason" },
      { key: "value", label: "Value" },
      { key: "createdAt", label: "Logged" }
    ];
  }
  if (tab === "suppliers") {
    return [
      { key: "name", label: "Supplier" },
      { key: "contact", label: "Contact" },
      { key: "category", label: "Category" },
      { key: "rating", label: "Rating" },
      { key: "onTimeDelivery", label: "On-time %" },
      { key: "isActive", label: "Status" }
    ];
  }
  return [
    { key: "poNumber", label: "PO Number" },
    { key: "supplierName", label: "Supplier" },
    { key: "status", label: "Status" },
    { key: "paymentStatus", label: "Payment" },
    { key: "expectedDelivery", label: "Expected" },
    { key: "totalAmount", label: "Value" },
    { key: "items", label: "Items" }
  ];
}

function InventoryTable({
  activeTab,
  columns,
  rows,
  loading,
  isNarrow,
  onEdit,
  onDelete,
  onView,
  onReceivePO,
  onInlineRawUpdate
}) {
  if (loading) {
    return <div style={emptyState}>Loading inventory...</div>;
  }

  if (!rows.length) {
    return <div style={emptyState}>No records found in this tab.</div>;
  }

  if (isNarrow) {
    return (
      <div style={cardGrid}>
        {rows.map((row) => (
          <div key={getRowId(row)} style={mobileCard}>
            <div style={mobileCardTop}>
              <div>
                <div style={rowTitle}>{row.name || row.poNumber || row.itemName}</div>
                <div style={mutedText}>{row.category || row.supplierName || formatLabel(row.type)}</div>
              </div>
              <RowStatus activeTab={activeTab} row={row} />
            </div>
            <div style={mobileFields}>
              {columns.slice(1, 6).map((column) => (
                <div key={column.key} style={mobileField}>
                  <span>{column.label}</span>
                  <strong>{renderCellValue(activeTab, row, column.key)}</strong>
                </div>
              ))}
            </div>
            <ActionMenu
              row={row}
              activeTab={activeTab}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
              onReceivePO={onReceivePO}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={tableShell}>
      <table style={table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={tableHead}>
                {column.label}
              </th>
            ))}
            <th style={tableHead}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowId(row)} style={tableRow}>
              {columns.map((column) => (
                <td key={column.key} style={tableCell}>
                  {renderCell(activeTab, row, column.key, onInlineRawUpdate)}
                </td>
              ))}
              <td style={tableCell}>
                <ActionMenu
                  row={row}
                  activeTab={activeTab}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onView={onView}
                  onReceivePO={onReceivePO}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderCell(activeTab, row, key, onInlineRawUpdate) {
  if (key === "name") {
    return (
      <div style={itemIdentity}>
        {row.image ? <img src={row.image} alt={row.name} style={itemImage} /> : <div style={imageFallback} />}
        <div>
          <div style={rowTitle}>{row.name || row.itemName}</div>
          <div style={mutedText}>{row._id ? String(row._id).slice(-6).toUpperCase() : ""}</div>
        </div>
      </div>
    );
  }

  if (activeTab === "raw" && ["currentStock", "minStock", "costPerUnit"].includes(key)) {
    return (
      <InlineNumber
        value={row[key]}
        suffix={key === "costPerUnit" ? "" : row.unit}
        onCommit={(value) => onInlineRawUpdate(row, { [key]: value })}
      />
    );
  }

  if (key === "status") return <RowStatus activeTab={activeTab} row={row} />;
  if (key === "expiryDate" || key === "expiryAt") return <ExpiryIndicator value={row[key]} />;
  if (key === "supplierName") return <SupplierBadge value={row.supplierName} />;
  if (["costPerUnit", "cost", "value", "totalAmount"].includes(key)) return formatCurrency(row[key]);
  if (key === "paymentStatus") return <StatusBadge label={row.paymentStatus || "UNPAID"} />;
  if (key === "isActive") return <StatusBadge label={row.isActive === false ? "Inactive" : "Active"} />;
  if (key === "items") return `${(row.items || row.lines || []).length} lines`;
  if (key === "createdAt" || key === "preparedAt" || key === "expectedDelivery") return formatDate(row[key]);
  if (key === "stock") return <StockIndicator current={row.stock} min={row.minStock} unit={row.unit} />;
  if (key === "currentStock") return <StockIndicator current={row.currentStock} min={row.minStock} unit={row.unit} />;
  if (key === "quantity") return `${toNumber(row.quantity)} ${row.unit || ""}`;
  if (key === "onTimeDelivery") return `${toNumber(row.onTimeDelivery)}%`;
  return renderCellValue(activeTab, row, key);
}

function renderCellValue(_activeTab, row, key) {
  if (key === "status") return formatLabel(row.status);
  if (key === "isActive") return row.isActive === false ? "Inactive" : "Active";
  if (key === "items") return `${(row.items || row.lines || []).length} lines`;
  if (key === "createdAt" || key === "preparedAt" || key === "expectedDelivery") return formatDate(row[key]);
  if (key === "expiryDate" || key === "expiryAt") return formatDate(row[key]);
  if (["costPerUnit", "cost", "value", "totalAmount"].includes(key)) return formatCurrency(row[key]);
  if (key === "stock") return `${toNumber(row.stock)} ${row.unit || ""}`;
  if (key === "currentStock") return `${toNumber(row.currentStock)} ${row.unit || ""}`;
  if (key === "quantity") return `${toNumber(row.quantity)} ${row.unit || ""}`;
  if (key === "onTimeDelivery") return `${toNumber(row.onTimeDelivery)}%`;
  return row[key] === undefined || row[key] === null || row[key] === "" ? "-" : String(row[key]);
}

function InlineNumber({ value, suffix, onCommit }) {
  const [draft, setDraft] = useState(String(value ?? ""));

  useEffect(() => {
    setDraft(String(value ?? ""));
  }, [value]);

  const commit = () => {
    if (String(value ?? "") !== draft) {
      onCommit(draft);
    }
  };

  return (
    <div style={inlineWrap}>
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        style={inlineInput}
        inputMode="decimal"
      />
      {suffix ? <span style={mutedText}>{suffix}</span> : null}
    </div>
  );
}

function RowStatus({ activeTab, row }) {
  if (activeTab === "raw") {
    return <StockIndicator current={row.currentStock} min={row.minStock} unit={row.unit} />;
  }
  if (activeTab === "packaging") {
    return <StockIndicator current={row.stock} min={row.minStock} unit={row.unit} />;
  }
  if (activeTab === "suppliers") {
    return <StatusBadge label={row.isActive === false ? "Inactive" : "Active"} />;
  }
  return <StatusBadge label={row.status || row.type || "Active"} />;
}

function StatusBadge({ label }) {
  const tone = getStatusTone(label);
  return (
    <span
      style={{
        ...badge,
        ...(tone === "green"
          ? badgeGreen
          : tone === "orange"
            ? badgeOrange
            : tone === "red"
              ? badgeRed
              : badgeNeutral)
      }}
    >
      {formatLabel(label)}
    </span>
  );
}

function StockIndicator({ current, min, unit }) {
  const status = getStockStatus(current, min);
  return (
    <span style={stockWrap}>
      <StatusBadge label={status} />
      <span style={mutedText}>
        {toNumber(current)} {unit || ""} / min {toNumber(min)}
      </span>
    </span>
  );
}

function ExpiryIndicator({ value }) {
  const status = getExpiryStatus(value);
  if (!value) return <span style={mutedText}>No expiry</span>;
  return (
    <span style={stockWrap}>
      <StatusBadge label={status} />
      <span style={mutedText}>{formatDate(value)}</span>
    </span>
  );
}

function SupplierBadge({ value }) {
  return value ? <span style={supplierBadge}>{value}</span> : <span style={mutedText}>Unassigned</span>;
}

function ActionMenu({ row, activeTab, onEdit, onDelete, onView, onReceivePO }) {
  const canReceive =
    activeTab === "purchase-orders" &&
    !["DELIVERED", "CANCELLED", "RECEIVED"].includes(String(row.status || "").toUpperCase());

  return (
    <div style={actionRow}>
      <button type="button" style={smallButton} onClick={() => onView(row)}>
        View
      </button>
      <button type="button" style={smallButton} onClick={() => onEdit(row)}>
        Edit
      </button>
      {canReceive ? (
        <button type="button" style={smallButtonDark} onClick={() => onReceivePO(row)}>
          Receive
        </button>
      ) : null}
      <button type="button" style={smallButtonDanger} onClick={() => onDelete(row)}>
        Delete
      </button>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div style={metricCard}>
      <div style={metricLabel}>{label}</div>
      <div style={metricValue}>{value}</div>
    </div>
  );
}

function EditorModal({ title, activeTab, form, setForm, supporting, saving, onClose, onSave }) {
  return (
    <div style={modalBackdrop} onClick={onClose}>
      <div style={modalCard} onClick={(event) => event.stopPropagation()}>
        <div style={modalHeader}>
          <h2 style={modalTitle}>{title}</h2>
          <button type="button" style={smallButton} onClick={onClose}>
            Close
          </button>
        </div>
        <FormFields activeTab={activeTab} form={form} setForm={setForm} supporting={supporting} />
        <div style={modalActions}>
          <button type="button" style={secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button type="button" style={primaryButton} onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormFields({ activeTab, form, setForm, supporting }) {
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  if (activeTab === "raw") {
    return (
      <div style={formGrid}>
        <Field label="Name" value={form.name} onChange={(value) => setField("name", value)} />
        <Field label="Category" value={form.category} onChange={(value) => setField("category", value)} />
        <Field label="Unit" value={form.unit} onChange={(value) => setField("unit", value)} />
        <Field label="Current Stock" value={form.currentStock} onChange={(value) => setField("currentStock", value)} />
        <Field label="Min Stock" value={form.minStock} onChange={(value) => setField("minStock", value)} />
        <Field label="Cost per Unit" value={form.costPerUnit} onChange={(value) => setField("costPerUnit", value)} />
        <SelectField label="Supplier" value={form.supplierId} onChange={(value) => setField("supplierId", value)} options={supporting.suppliers} />
        <Field label="Expiry Date" type="date" value={form.expiryDate} onChange={(value) => setField("expiryDate", value)} />
        <Field label="Image URL" value={form.image} onChange={(value) => setField("image", value)} wide />
      </div>
    );
  }

  if (activeTab === "prep") {
    return (
      <div style={formGrid}>
        <Field label="Name" value={form.name} onChange={(value) => setField("name", value)} />
        <Field label="Batch No" value={form.batchNo} onChange={(value) => setField("batchNo", value)} />
        <Field label="Quantity" value={form.quantity} onChange={(value) => setField("quantity", value)} />
        <Field label="Unit" value={form.unit} onChange={(value) => setField("unit", value)} />
        <Field label="Cost" value={form.cost} onChange={(value) => setField("cost", value)} />
        <Field label="Prepared On" type="date" value={form.preparedAt} onChange={(value) => setField("preparedAt", value)} />
        <Field label="Expiry" type="date" value={form.expiryAt} onChange={(value) => setField("expiryAt", value)} />
        <SelectStatic label="Status" value={form.status} onChange={(value) => setField("status", value)} options={["ACTIVE", "LOW_STOCK", "EXPIRED", "CONSUMED"]} />
        <UsageEditor form={form} setForm={setForm} rawItems={supporting.raw} />
      </div>
    );
  }

  if (activeTab === "packaging") {
    return (
      <div style={formGrid}>
        <Field label="Name" value={form.name} onChange={(value) => setField("name", value)} />
        <Field label="Category" value={form.category} onChange={(value) => setField("category", value)} />
        <Field label="Unit" value={form.unit} onChange={(value) => setField("unit", value)} />
        <Field label="Stock" value={form.stock} onChange={(value) => setField("stock", value)} />
        <Field label="Min Stock" value={form.minStock} onChange={(value) => setField("minStock", value)} />
        <Field label="Cost per Unit" value={form.costPerUnit} onChange={(value) => setField("costPerUnit", value)} />
        <SelectField label="Supplier" value={form.supplierId} onChange={(value) => setField("supplierId", value)} options={supporting.suppliers} />
        <Field label="Image URL" value={form.image} onChange={(value) => setField("image", value)} />
      </div>
    );
  }

  if (activeTab === "wastage") {
    const itemOptions = form.type === "prep" ? supporting.prep : form.type === "packaging" ? supporting.packaging : supporting.raw;
    return (
      <div style={formGrid}>
        <SelectStatic label="Type" value={form.type} onChange={(value) => setForm({ ...form, type: value, itemId: "" })} options={["raw", "prep", "packaging"]} />
        <SelectField label="Item" value={form.itemId} onChange={(value) => setField("itemId", value)} options={itemOptions} />
        <Field label="Quantity" value={form.quantity} onChange={(value) => setField("quantity", value)} />
        <SelectStatic label="Reason" value={form.reason} onChange={(value) => setField("reason", value)} options={["expired", "damaged", "over-prep", "spillage", "quality issue"]} />
      </div>
    );
  }

  if (activeTab === "suppliers") {
    return (
      <div style={formGrid}>
        <Field label="Name" value={form.name} onChange={(value) => setField("name", value)} />
        <Field label="Contact" value={form.contact} onChange={(value) => setField("contact", value)} />
        <Field label="Phone" value={form.phone} onChange={(value) => setField("phone", value)} />
        <Field label="Email" value={form.email} onChange={(value) => setField("email", value)} />
        <Field label="Category" value={form.category} onChange={(value) => setField("category", value)} />
        <Field label="Rating" value={form.rating} onChange={(value) => setField("rating", value)} />
        <Field label="On-time Delivery %" value={form.onTimeDelivery} onChange={(value) => setField("onTimeDelivery", value)} />
        <label style={checkboxField}>
          <input type="checkbox" checked={form.isActive !== false} onChange={(event) => setField("isActive", event.target.checked)} />
          Active supplier
        </label>
        <Field label="Address" value={form.address} onChange={(value) => setField("address", value)} wide />
        <Field label="Notes" value={form.notes} onChange={(value) => setField("notes", value)} wide />
      </div>
    );
  }

  return <POEditor form={form} setForm={setForm} supporting={supporting} />;
}

function UsageEditor({ form, setForm, rawItems }) {
  const updateLine = (index, key, value) => {
    setForm((current) => ({
      ...current,
      rawMaterialUsage: current.rawMaterialUsage.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [key]: value } : line
      )
    }));
  };

  return (
    <div style={{ ...wideField, gap: 10 }}>
      <div style={sectionLine}>
        <strong>Raw material usage</strong>
        <button
          type="button"
          style={smallButton}
          onClick={() =>
            setForm((current) => ({
              ...current,
              rawMaterialUsage: [...current.rawMaterialUsage, { materialId: "", qty: "", unit: "kg" }]
            }))
          }
        >
          Add Line
        </button>
      </div>
      {(form.rawMaterialUsage || []).map((line, index) => (
        <div key={`usage-${index}`} style={lineGrid}>
          <SelectField label="Material" value={line.materialId} onChange={(value) => updateLine(index, "materialId", value)} options={rawItems} />
          <Field label="Qty" value={line.qty} onChange={(value) => updateLine(index, "qty", value)} />
          <Field label="Unit" value={line.unit} onChange={(value) => updateLine(index, "unit", value)} />
          <button
            type="button"
            style={smallButtonDanger}
            onClick={() =>
              setForm((current) => ({
                ...current,
                rawMaterialUsage: current.rawMaterialUsage.filter((_, lineIndex) => lineIndex !== index)
              }))
            }
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

function POEditor({ form, setForm, supporting }) {
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateLine = (index, key, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const nextLine = { ...line, [key]: value };
        if (key === "type") {
          nextLine.itemId = "";
          nextLine.itemName = "";
          nextLine.unit = value === "packaging" ? "pcs" : "kg";
        }
        if (key === "itemId") {
          const options = getOptionsForType(nextLine.type, supporting);
          const selected = options.find((item) => getRowId(item) === value);
          nextLine.itemName = selected?.name || "";
          nextLine.unit = selected?.unit || nextLine.unit;
          nextLine.cost = selected?.costPerUnit || selected?.pricePerUnit || selected?.cost || nextLine.cost;
        }
        return nextLine;
      })
    }));
  };

  return (
    <div style={formGrid}>
      <SelectField label="Supplier" value={form.supplierId} onChange={(value) => setField("supplierId", value)} options={supporting.suppliers} />
      <SelectStatic label="Status" value={form.status} onChange={(value) => setField("status", value)} options={["OPEN", "CONFIRMED", "IN_TRANSIT", "DELIVERED"]} />
      <SelectStatic label="Payment" value={form.paymentStatus} onChange={(value) => setField("paymentStatus", value)} options={["UNPAID", "PARTIAL", "PAID"]} />
      <Field label="Expected Delivery" type="date" value={form.expectedDelivery} onChange={(value) => setField("expectedDelivery", value)} />
      <Field label="Notes" value={form.notes} onChange={(value) => setField("notes", value)} wide />
      <div style={{ ...wideField, gap: 10 }}>
        <div style={sectionLine}>
          <strong>PO items</strong>
          <button
            type="button"
            style={smallButton}
            onClick={() =>
              setForm((current) => ({
                ...current,
                items: [...current.items, { type: "raw", itemId: "", itemName: "", qty: "", unit: "kg", cost: "" }]
              }))
            }
          >
            Add Item
          </button>
        </div>
        {(form.items || []).map((line, index) => (
          <div key={`po-${index}`} style={poLineGrid}>
            <SelectStatic label="Type" value={line.type} onChange={(value) => updateLine(index, "type", value)} options={["raw", "prep", "packaging"]} />
            <SelectField label="Linked Item" value={line.itemId} onChange={(value) => updateLine(index, "itemId", value)} options={getOptionsForType(line.type, supporting)} />
            <Field label="Item Name" value={line.itemName} onChange={(value) => updateLine(index, "itemName", value)} />
            <Field label="Qty" value={line.qty} onChange={(value) => updateLine(index, "qty", value)} />
            <Field label="Unit" value={line.unit} onChange={(value) => updateLine(index, "unit", value)} />
            <Field label="Cost" value={line.cost} onChange={(value) => updateLine(index, "cost", value)} />
            <button
              type="button"
              style={smallButtonDanger}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  items: current.items.filter((_, lineIndex) => lineIndex !== index)
                }))
              }
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", wide = false }) {
  return (
    <label style={wide ? wideField : field}>
      <span style={fieldLabel}>{label}</span>
      <input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} style={fieldInput} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label style={field}>
      <span style={fieldLabel}>{label}</span>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)} style={fieldInput}>
        <option value="">Select</option>
        {(options || []).map((option) => (
          <option key={getRowId(option)} value={getRowId(option)}>
            {option.name || option.supplierName || option.poNumber}
          </option>
        ))}
      </select>
    </label>
  );
}

function SelectStatic({ label, value, onChange, options }) {
  return (
    <label style={field}>
      <span style={fieldLabel}>{label}</span>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)} style={fieldInput}>
        {(options || []).map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ViewModal({ row, onClose }) {
  return (
    <div style={modalBackdrop} onClick={onClose}>
      <div style={modalCard} onClick={(event) => event.stopPropagation()}>
        <div style={modalHeader}>
          <h2 style={modalTitle}>{row.name || row.poNumber || "Details"}</h2>
          <button type="button" style={smallButton} onClick={onClose}>
            Close
          </button>
        </div>
        <pre style={jsonBlock}>{JSON.stringify(row, null, 2)}</pre>
      </div>
    </div>
  );
}

function WastageCharts({ metrics }) {
  return (
    <section style={chartsGrid}>
      <ChartBlock title="Category Wise" data={metrics.categoryWise} />
      <ChartBlock title="Top Reasons" data={metrics.reasonWise} />
      <ChartBlock title="Trend" data={metrics.trend} />
    </section>
  );
}

function ChartBlock({ title, data = {} }) {
  const rows = Object.entries(data || {}).slice(0, 8);
  const max = Math.max(1, ...rows.map(([, value]) => toNumber(value)));
  return (
    <div style={chartCard}>
      <h3 style={chartTitle}>{title}</h3>
      {rows.length ? (
        rows.map(([label, value]) => (
          <div key={label} style={chartRow}>
            <span>{formatLabel(label)}</span>
            <div style={chartTrack}>
              <div style={{ ...chartBar, width: `${Math.max(4, (toNumber(value) / max) * 100)}%` }} />
            </div>
            <strong>{formatCurrency(value)}</strong>
          </div>
        ))
      ) : (
        <div style={mutedText}>No chart data yet.</div>
      )}
    </div>
  );
}

function buildFormFromRow(tab, row = {}) {
  if (tab === "raw") {
    return {
      ...EMPTY_FORMS.raw,
      name: row.name || "",
      category: row.category || "General",
      unit: row.unit || "kg",
      currentStock: String(row.currentStock ?? row.quantity ?? ""),
      minStock: String(row.minStock ?? ""),
      costPerUnit: String(row.costPerUnit ?? row.pricePerUnit ?? ""),
      supplierId: row.supplierId || "",
      supplierName: row.supplierName || "",
      expiryDate: toDateInput(row.expiryDate),
      image: row.image || ""
    };
  }
  if (tab === "prep") {
    return {
      ...EMPTY_FORMS.prep,
      name: row.name || "",
      batchNo: row.batchNo || "",
      quantity: String(row.quantity ?? ""),
      unit: row.unit || "kg",
      cost: String(row.cost ?? ""),
      preparedAt: toDateInput(row.preparedAt),
      expiryAt: toDateInput(row.expiryAt),
      status: row.status || "ACTIVE",
      rawMaterialUsage:
        row.rawMaterialUsage?.length
          ? row.rawMaterialUsage.map((line) => ({
              materialId: line.materialId || "",
              qty: String(line.qty ?? ""),
              unit: line.unit || "kg"
            }))
          : [{ materialId: "", qty: "", unit: "kg" }]
    };
  }
  if (tab === "packaging") {
    return {
      ...EMPTY_FORMS.packaging,
      name: row.name || "",
      category: row.category || "Packaging",
      unit: row.unit || "pcs",
      stock: String(row.stock ?? ""),
      minStock: String(row.minStock ?? ""),
      costPerUnit: String(row.costPerUnit ?? ""),
      supplierId: row.supplierId || "",
      image: row.image || ""
    };
  }
  if (tab === "suppliers") {
    return {
      ...EMPTY_FORMS.suppliers,
      name: row.name || "",
      contact: row.contact || "",
      phone: row.phone || "",
      email: row.email || "",
      category: row.category || "General",
      rating: String(row.rating ?? 4),
      onTimeDelivery: String(row.onTimeDelivery ?? 100),
      isActive: row.isActive !== false,
      address: row.address || "",
      notes: row.notes || ""
    };
  }
  if (tab === "purchase-orders") {
    return {
      ...EMPTY_FORMS["purchase-orders"],
      supplierId: row.supplierId || "",
      status: row.status || "OPEN",
      paymentStatus: row.paymentStatus || "UNPAID",
      expectedDelivery: toDateInput(row.expectedDelivery || row.expectedDate),
      notes: row.notes || "",
      items:
        (row.items || row.lines || []).length
          ? (row.items || row.lines).map((line) => ({
              type: line.type || "raw",
              itemId: line.itemId || "",
              itemName: line.ingredientName || line.itemName || "",
              qty: String(line.qty ?? line.quantity ?? ""),
              unit: line.unit || "kg",
              cost: String(line.cost ?? line.unitPrice ?? "")
            }))
          : [{ type: "raw", itemId: "", itemName: "", qty: "", unit: "kg", cost: "" }]
    };
  }
  return { ...EMPTY_FORMS[tab] };
}

function buildPayload(tab, form) {
  if (tab === "prep") {
    return {
      ...form,
      quantity: toNumber(form.quantity),
      cost: toNumber(form.cost),
      rawMaterialUsage: (form.rawMaterialUsage || []).map((line) => ({
        materialId: line.materialId,
        qty: toNumber(line.qty),
        unit: line.unit || "kg"
      }))
    };
  }
  if (tab === "purchase-orders") {
    return {
      ...form,
      items: (form.items || []).map((line) => ({
        type: line.type,
        itemId: line.itemId,
        itemName: line.itemName,
        qty: toNumber(line.qty),
        unit: line.unit,
        cost: toNumber(line.cost)
      }))
    };
  }
  if (tab === "suppliers") {
    return {
      ...form,
      rating: toNumber(form.rating),
      onTimeDelivery: toNumber(form.onTimeDelivery),
      isActive: form.isActive !== false
    };
  }
  if (tab === "wastage") {
    return {
      ...form,
      quantity: toNumber(form.quantity)
    };
  }
  const numericFields =
    tab === "raw"
      ? ["currentStock", "minStock", "costPerUnit"]
      : ["stock", "minStock", "costPerUnit"];
  return numericFields.reduce(
    (acc, key) => ({
      ...acc,
      [key]: toNumber(form[key])
    }),
    { ...form }
  );
}

function buildCsv(tab, rows) {
  const fields = CSV_FIELDS[tab] || [];
  const body = rows.map((row) =>
    fields.map((field) => escapeCsvValue(getCsvValue(tab, row, field))).join(",")
  );
  return [fields.join(","), ...body].join("\n");
}

function getCsvValue(tab, row, field) {
  if (field === "currentStock") return row.currentStock ?? row.quantity ?? "";
  if (field === "supplierName") return row.supplierName || row.supplier?.name || "";
  if (field === "rawMaterialUsage") return JSON.stringify(row.rawMaterialUsage || []);
  if (field === "items") return JSON.stringify(row.items || row.lines || []);
  if (field === "expectedDelivery") return toDateInput(row.expectedDelivery || row.expectedDate);
  if (field === "preparedAt" || field === "expiryAt" || field === "expiryDate") {
    return toDateInput(row[field]);
  }
  if (tab === "purchase-orders" && field === "status") return row.status || "OPEN";
  if (tab === "suppliers" && field === "isActive") return row.isActive !== false ? "true" : "false";
  return row[field] ?? "";
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);

  const [headerRow = [], ...dataRows] = rows;
  const headers = headerRow.map((header) => header.trim());
  return dataRows.map((dataRow) =>
    headers.reduce((record, header, index) => {
      record[header] = dataRow[index] ?? "";
      return record;
    }, {})
  );
}

function normalizeImportRecord(tab, record) {
  const form = { ...EMPTY_FORMS[tab], ...record };

  if (tab === "prep") {
    form.rawMaterialUsage = parseJsonArray(
      record.rawMaterialUsage,
      EMPTY_FORMS.prep.rawMaterialUsage
    );
  }

  if (tab === "purchase-orders") {
    form.items = parseJsonArray(record.items, EMPTY_FORMS["purchase-orders"].items);
  }

  if (tab === "suppliers") {
    form.isActive = !["false", "0", "inactive", "no"].includes(
      String(record.isActive).trim().toLowerCase()
    );
  }

  return form;
}

function parseJsonArray(value, fallback) {
  if (!value) return JSON.parse(JSON.stringify(fallback));
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length ? parsed : JSON.parse(JSON.stringify(fallback));
  } catch {
    return JSON.parse(JSON.stringify(fallback));
  }
}

function getOptionsForType(type, supporting) {
  if (type === "prep") return supporting.prep || [];
  if (type === "packaging") return supporting.packaging || [];
  return supporting.raw || [];
}

function formatMetric(value, format) {
  if (format === "currency") return formatCurrency(value);
  if (format === "percent") return `${toNumber(value)}%`;
  return String(value ?? 0);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatLabel(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStockStatus(current, min) {
  if (toNumber(current) <= 0) return "OUT_OF_STOCK";
  if (toNumber(current) <= toNumber(min)) return "LOW_STOCK";
  return "IN_STOCK";
}

function getExpiryStatus(value) {
  if (!value) return "NONE";
  const date = new Date(value).getTime();
  if (!Number.isFinite(date)) return "NONE";
  if (date < Date.now()) return "EXPIRED";
  if (date <= Date.now() + 72 * 60 * 60 * 1000) return "EXPIRING_SOON";
  return "FRESH";
}

const page = {
  display: "grid",
  gap: 18,
  color: cloudKitchenTheme.textPrimary,
  background: "#FFFFFF"
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap"
};

const title = { margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: 0 };
const subtitle = { margin: "6px 0 0", color: cloudKitchenTheme.textSecondary, fontSize: 14 };

const headerActions = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "flex-end"
};

const tabsWrap = {
  display: "flex",
  gap: 8,
  overflowX: "auto",
  paddingBottom: 2
};

const tabButton = {
  height: 42,
  borderRadius: 12,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  color: "#111111",
  padding: "0 14px",
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap"
};

const tabButtonActive = { background: "#111111", color: "#FFFFFF", borderColor: "#111111" };

const metricsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: 12
};

const metricCard = {
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 14,
  background: "#FFFFFF",
  boxShadow: cloudKitchenTheme.shadow,
  padding: 14
};

const metricLabel = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 0
};

const metricValue = { marginTop: 8, color: "#111111", fontSize: 24, fontWeight: 800 };

const stickyFilters = {
  position: "sticky",
  top: 0,
  zIndex: 4,
  display: "grid",
  gridTemplateColumns: "minmax(min(100%, 220px), 1fr) 180px 100px",
  gap: 10,
  background: "#FFFFFF",
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 14,
  boxShadow: cloudKitchenTheme.shadow,
  padding: 12
};

const stickyFiltersNarrow = {
  position: "relative",
  gridTemplateColumns: "1fr"
};

const searchInput = {
  height: 42,
  borderRadius: 10,
  border: `1px solid ${cloudKitchenTheme.border}`,
  padding: "0 12px",
  outline: "none",
  fontSize: 14
};

const selectInput = { ...searchInput, background: "#FFFFFF" };

const primaryButton = {
  minHeight: 42,
  border: 0,
  borderRadius: 12,
  background: "#111111",
  color: "#FFFFFF",
  padding: "0 16px",
  fontWeight: 800,
  cursor: "pointer"
};

const secondaryButton = {
  minHeight: 42,
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 12,
  background: "#FFFFFF",
  color: "#111111",
  padding: "0 14px",
  fontWeight: 800,
  cursor: "pointer"
};

const tableShell = {
  overflowX: "auto",
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 14,
  boxShadow: cloudKitchenTheme.shadow,
  background: "#FFFFFF"
};

const table = { width: "100%", borderCollapse: "separate", borderSpacing: 0 };
const tableHead = {
  textAlign: "left",
  padding: "14px 12px",
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 0,
  whiteSpace: "nowrap",
  borderBottom: `1px solid ${cloudKitchenTheme.border}`
};
const tableRow = { background: "#FFFFFF" };
const tableCell = {
  padding: "14px 12px",
  borderBottom: `1px solid ${cloudKitchenTheme.border}`,
  verticalAlign: "middle",
  fontSize: 13
};

const itemIdentity = { display: "flex", alignItems: "center", gap: 10, minWidth: 220 };
const itemImage = { width: 44, height: 44, borderRadius: 10, objectFit: "cover" };
const imageFallback = { width: 44, height: 44, borderRadius: 10, background: "#F3F4F6" };
const rowTitle = { fontWeight: 800, color: "#111111", fontSize: 14 };
const mutedText = { color: cloudKitchenTheme.textSecondary, fontSize: 12 };
const stockWrap = { display: "grid", gap: 5 };
const inlineWrap = { display: "flex", alignItems: "center", gap: 6 };
const inlineInput = {
  width: 86,
  height: 34,
  borderRadius: 8,
  border: `1px solid ${cloudKitchenTheme.border}`,
  padding: "0 8px",
  fontWeight: 700
};

const badge = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 28,
  borderRadius: 999,
  padding: "0 10px",
  border: "1px solid transparent",
  fontSize: 11,
  fontWeight: 800,
  whiteSpace: "nowrap"
};
const badgeGreen = { background: "#ECFDF5", borderColor: "#BBF7D0", color: "#166534" };
const badgeOrange = { background: "#FFFBEB", borderColor: "#FDE68A", color: "#92400E" };
const badgeRed = { background: "#FEF2F2", borderColor: "#FECACA", color: "#991B1B" };
const badgeNeutral = { background: "#F3F4F6", borderColor: "#E5E7EB", color: "#374151" };
const supplierBadge = { ...badge, ...badgeNeutral };

const actionRow = { display: "flex", gap: 6, flexWrap: "wrap" };
const smallButton = {
  minHeight: 32,
  borderRadius: 9,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  color: "#111111",
  padding: "0 10px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer"
};
const smallButtonDark = { ...smallButton, background: "#111111", borderColor: "#111111", color: "#FFFFFF" };
const smallButtonDanger = { ...smallButton, background: "#FEF2F2", borderColor: "#FECACA", color: "#991B1B" };

const emptyState = {
  border: `1px dashed ${cloudKitchenTheme.border}`,
  borderRadius: 14,
  padding: 28,
  textAlign: "center",
  color: cloudKitchenTheme.textSecondary,
  background: "#FFFFFF"
};

const cardGrid = { display: "grid", gap: 12 };
const mobileCard = {
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 14,
  background: "#FFFFFF",
  boxShadow: cloudKitchenTheme.shadow,
  padding: 14,
  display: "grid",
  gap: 12
};
const mobileCardTop = { display: "flex", justifyContent: "space-between", gap: 12 };
const mobileFields = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 };
const mobileField = {
  display: "grid",
  gap: 4,
  borderRadius: 10,
  background: "#F9FAFB",
  padding: 10,
  fontSize: 12
};

const modalBackdrop = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "rgba(17,24,39,0.34)",
  display: "grid",
  placeItems: "center",
  padding: 18
};
const modalCard = {
  width: "min(980px, 100%)",
  maxHeight: "92vh",
  overflowY: "auto",
  borderRadius: 16,
  background: "#FFFFFF",
  border: `1px solid ${cloudKitchenTheme.border}`,
  boxShadow: "0 24px 90px rgba(15,23,42,0.24)",
  padding: 18,
  display: "grid",
  gap: 16
};
const modalHeader = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" };
const modalTitle = { margin: 0, fontSize: 22, fontWeight: 800 };
const modalActions = { display: "flex", justifyContent: "flex-end", gap: 10 };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 };
const field = { display: "grid", gap: 7 };
const wideField = { ...field, gridColumn: "1 / -1" };
const fieldLabel = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 0
};
const fieldInput = {
  minHeight: 42,
  borderRadius: 10,
  border: `1px solid ${cloudKitchenTheme.border}`,
  padding: "0 12px",
  background: "#FFFFFF",
  outline: "none"
};
const checkboxField = { display: "flex", alignItems: "center", gap: 8, minHeight: 42, fontWeight: 700 };
const lineGrid = { display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, alignItems: "end" };
const poLineGrid = { display: "grid", gridTemplateColumns: "1fr 1.5fr 1.5fr 0.8fr 0.8fr 0.8fr auto", gap: 8, alignItems: "end" };
const sectionLine = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" };
const jsonBlock = { margin: 0, borderRadius: 12, background: "#F9FAFB", padding: 14, overflowX: "auto", fontSize: 12 };
const successBanner = { borderRadius: 12, padding: "10px 12px", background: "#ECFDF5", border: "1px solid #BBF7D0", color: "#166534" };
const errorBanner = { borderRadius: 12, padding: "10px 12px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" };
const chartsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 12 };
const chartCard = { border: `1px solid ${cloudKitchenTheme.border}`, borderRadius: 14, background: "#FFFFFF", boxShadow: cloudKitchenTheme.shadow, padding: 14 };
const chartTitle = { margin: "0 0 12px", fontSize: 16, fontWeight: 800 };
const chartRow = { display: "grid", gridTemplateColumns: "100px 1fr 86px", gap: 8, alignItems: "center", marginBottom: 9, fontSize: 12 };
const chartTrack = { height: 8, borderRadius: 999, background: "#E5E7EB", overflow: "hidden" };
const chartBar = { height: "100%", borderRadius: 999, background: "#111111" };
