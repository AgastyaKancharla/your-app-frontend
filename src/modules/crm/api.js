import axios from "axios";

import { API_BASE_URL } from "../../config";

const crmBaseUrl = `${API_BASE_URL}/api/crm`;

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const compactFormatter = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1
});

export const formatCurrency = (value = 0) => currencyFormatter.format(Number(value || 0));
export const formatCompactNumber = (value = 0) => compactFormatter.format(Number(value || 0));

export const formatNumber = (value = 0) => new Intl.NumberFormat("en-IN").format(Number(value || 0));

export const formatDate = (value) => {
  if (!value) {
    return "No activity yet";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
};

export const formatDateTime = (value) => {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
};

export const buildCrmQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, value);
  });

  return searchParams.toString();
};

export const fetchCrmAnalytics = async () => {
  const response = await axios.get(`${crmBaseUrl}/analytics`);
  return response.data;
};

export const fetchCrmCustomers = async (params = {}) => {
  const query = buildCrmQueryString(params);
  const response = await axios.get(`${crmBaseUrl}/customers${query ? `?${query}` : ""}`);
  return response.data;
};

export const fetchCrmCustomer = async (customerId) => {
  const response = await axios.get(`${crmBaseUrl}/customers/${customerId}`);
  return response.data;
};

export const createCrmCustomer = async (payload) => {
  const response = await axios.post(`${crmBaseUrl}/customers`, payload);
  return response.data;
};

export const updateCrmCustomer = async (customerId, payload) => {
  const response = await axios.put(`${crmBaseUrl}/customers/${customerId}`, payload);
  return response.data;
};

export const fetchCrmCampaigns = async () => {
  const response = await axios.get(`${crmBaseUrl}/campaigns`);
  return response.data;
};

export const createCrmCampaign = async (payload) => {
  const response = await axios.post(`${crmBaseUrl}/campaigns`, payload);
  return response.data;
};

export const exportCustomersAsCsv = (rows = []) => {
  const headers = [
    "Customer",
    "Customer ID",
    "Phone",
    "Email",
    "Segment",
    "Orders",
    "Total Spend",
    "AOV",
    "Last Order",
    "Platform",
    "Status"
  ];
  const csvRows = rows.map((row) => [
    row.name,
    row.customerCode,
    row.phone,
    row.email,
    row.segment,
    row.totalOrders,
    row.totalSpend,
    row.avgOrderValue,
    formatDate(row.lastOrderAt),
    row.platform,
    row.status
  ]);
  const csv = [headers, ...csvRows]
    .map((columns) =>
      columns
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = `crm-customers-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(downloadUrl);
};

export const parseImportedCustomers = async (file) => {
  const text = await file.text();
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);

  if (!headerLine) {
    return [];
  }

  const headers = headerLine.split(",").map((header) => header.trim().toLowerCase());

  return lines.map((line) => {
    const columns = line.split(",").map((column) => column.trim().replace(/^"|"$/g, ""));
    const record = headers.reduce((accumulator, header, index) => {
      accumulator[header] = columns[index] || "";
      return accumulator;
    }, {});

    return {
      name: record.name || record.customer || "",
      phone: record.phone || "",
      email: record.email || "",
      segment: record.segment || "",
      platform: record.platform || "",
      status: record.status || "",
      tags: record.tags ? record.tags.split("|").map((tag) => tag.trim()).filter(Boolean) : []
    };
  });
};
