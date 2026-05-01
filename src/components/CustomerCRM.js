import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import PageContainer from "./ui/PageContainer";
import { API_BASE_URL } from "../config";

const CURRENCY = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const createEmptyForm = () => ({
  name: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pinCode: "",
  latitude: "",
  longitude: "",
  notes: "",
  loyaltyPoints: "",
  whatsappOptIn: true,
  smsOptIn: true
});

const normalizePhone = (value = "") => String(value || "").replace(/[^\d+]/g, "").trim();
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
};

const hasGeoPoint = (customer) => {
  return (
    Number.isFinite(Number(customer?.latitude)) &&
    Number.isFinite(Number(customer?.longitude))
  );
};

const buildMapBounds = (customers = []) => {
  if (!customers.length) {
    return null;
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  customers.forEach((customer) => {
    const lat = Number(customer.latitude);
    const lng = Number(customer.longitude);

    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  });

  if (minLat === maxLat) {
    minLat -= 0.01;
    maxLat += 0.01;
  }
  if (minLng === maxLng) {
    minLng -= 0.01;
    maxLng += 0.01;
  }

  const latPad = (maxLat - minLat) * 0.15;
  const lngPad = (maxLng - minLng) * 0.15;

  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad
  };
};

const projectToMap = (lat, lng, bounds) => {
  if (!bounds) {
    return { x: 50, y: 50 };
  }

  const xRaw = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const yRaw = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 100;

  return {
    x: Math.max(4, Math.min(96, xRaw)),
    y: Math.max(6, Math.min(94, yRaw))
  };
};

const CUSTOMER_SEGMENTS = [
  { id: "ALL", label: "All" },
  { id: "REPEAT", label: "Repeat" },
  { id: "HIGH_VALUE", label: "High Value" },
  { id: "INACTIVE_30D", label: "Inactive 30d" },
  { id: "RECENT_30D", label: "Recent 30d" },
  { id: "GEO_TAGGED", label: "Geo Tagged" }
];

const MARKETING_DRAFT_STORAGE_KEY = "wevalue_marketing_campaign_draft";

const toWhatsappNumber = (phone = "") => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
};

const buildGeoMapUrl = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "";
  }

  const delta = 0.015;
  const left = lng - delta;
  const right = lng + delta;
  const top = lat + delta;
  const bottom = lat - delta;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
};

export default function CustomerCRM() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [form, setForm] = useState(createEmptyForm());
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupState, setLookupState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [findingByPhone, setFindingByPhone] = useState(false);
  const [segmentFilter, setSegmentFilter] = useState("ALL");
  const [isLocatingCustomer, setIsLocatingCustomer] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [locationState, setLocationState] = useState("");

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/customers`);
      const nextCustomers = Array.isArray(res.data) ? res.data : [];
      setCustomers(nextCustomers);
      setSelectedCustomerId((currentSelected) => currentSelected || nextCustomers[0]?.id || "");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  const upsertCustomerInDirectory = useCallback((customerPayload) => {
    if (!customerPayload?.id) {
      return;
    }

    setCustomers((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      const withoutCurrent = current.filter((entry) => entry.id !== customerPayload.id);
      return [customerPayload, ...withoutCurrent];
    });
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const segmentCounts = useMemo(() => {
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    return {
      ALL: customers.length,
      REPEAT: customers.filter((customer) => Number(customer.orderCount || 0) >= 2).length,
      HIGH_VALUE: customers.filter((customer) => Number(customer.lifetimeValue || 0) >= 3000).length,
      INACTIVE_30D: customers.filter((customer) => {
        if (!customer.lastOrderAt) {
          return true;
        }
        return now - new Date(customer.lastOrderAt).getTime() > THIRTY_DAYS_MS;
      }).length,
      RECENT_30D: customers.filter((customer) => {
        if (!customer.lastOrderAt) {
          return false;
        }
        return now - new Date(customer.lastOrderAt).getTime() <= THIRTY_DAYS_MS;
      }).length,
      GEO_TAGGED: customers.filter(hasGeoPoint).length
    };
  }, [customers]);

  const segmentCustomers = useMemo(() => {
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    if (segmentFilter === "REPEAT") {
      return customers.filter((customer) => Number(customer.orderCount || 0) >= 2);
    }
    if (segmentFilter === "HIGH_VALUE") {
      return customers.filter((customer) => Number(customer.lifetimeValue || 0) >= 3000);
    }
    if (segmentFilter === "INACTIVE_30D") {
      return customers.filter((customer) => {
        if (!customer.lastOrderAt) {
          return true;
        }
        return now - new Date(customer.lastOrderAt).getTime() > THIRTY_DAYS_MS;
      });
    }
    if (segmentFilter === "RECENT_30D") {
      return customers.filter((customer) => {
        if (!customer.lastOrderAt) {
          return false;
        }
        return now - new Date(customer.lastOrderAt).getTime() <= THIRTY_DAYS_MS;
      });
    }
    if (segmentFilter === "GEO_TAGGED") {
      return customers.filter(hasGeoPoint);
    }

    return customers;
  }, [customers, segmentFilter]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return segmentCustomers;
    }

    return segmentCustomers.filter((customer) => {
      return (
        String(customer.name || "").toLowerCase().includes(query) ||
        String(customer.phone || "").toLowerCase().includes(query) ||
        String(customer.city || "").toLowerCase().includes(query)
      );
    });
  }, [search, segmentCustomers]);

  const selectedCustomer = useMemo(() => {
    return customers.find((customer) => customer.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const selectedOrderHistory = useMemo(() => {
    if (!selectedCustomer?.orderHistory?.length) {
      return [];
    }

    return [...selectedCustomer.orderHistory].sort((a, b) => {
      const aTime = new Date(a?.orderedAt || 0).getTime();
      const bTime = new Date(b?.orderedAt || 0).getTime();
      return bTime - aTime;
    });
  }, [selectedCustomer]);

  const geoTaggedCustomers = useMemo(() => {
    return customers.filter(hasGeoPoint);
  }, [customers]);

  const mapBounds = useMemo(() => buildMapBounds(geoTaggedCustomers), [geoTaggedCustomers]);

  const mapAnchor = useMemo(() => {
    if (!geoTaggedCustomers.length) {
      return null;
    }

    const sums = geoTaggedCustomers.reduce(
      (acc, customer) => {
        acc.lat += Number(customer.latitude);
        acc.lng += Number(customer.longitude);
        return acc;
      },
      { lat: 0, lng: 0 }
    );

    return {
      latitude: sums.lat / geoTaggedCustomers.length,
      longitude: sums.lng / geoTaggedCustomers.length
    };
  }, [geoTaggedCustomers]);

  useEffect(() => {
    if (!selectedCustomer) {
      setForm(createEmptyForm());
      return;
    }

    setForm({
      name: selectedCustomer.name || "",
      email: selectedCustomer.email || "",
      address: selectedCustomer.address || "",
      city: selectedCustomer.city || "",
      state: selectedCustomer.state || "",
      pinCode: selectedCustomer.pinCode || "",
      latitude:
        selectedCustomer.latitude === null || selectedCustomer.latitude === undefined
          ? ""
          : String(selectedCustomer.latitude),
      longitude:
        selectedCustomer.longitude === null || selectedCustomer.longitude === undefined
          ? ""
          : String(selectedCustomer.longitude),
      notes: selectedCustomer.notes || "",
      loyaltyPoints: String(selectedCustomer.loyaltyPoints ?? 0),
      whatsappOptIn: selectedCustomer.marketingPreferences?.whatsapp !== false,
      smsOptIn: selectedCustomer.marketingPreferences?.sms !== false
    });
    setLookupPhone(selectedCustomer.phone || "");
  }, [selectedCustomer]);

  const selectedMapCustomer = useMemo(() => {
    if (!geoTaggedCustomers.length) {
      return null;
    }

    return (
      geoTaggedCustomers.find((customer) => customer.id === selectedCustomerId) ||
      geoTaggedCustomers[0]
    );
  }, [geoTaggedCustomers, selectedCustomerId]);

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const findCustomerByPhone = async () => {
    const normalized = normalizePhone(lookupPhone);
    if (!normalized) {
      setLookupState({
        tone: "warning",
        text: "Enter customer mobile number to search."
      });
      return;
    }

    try {
      setFindingByPhone(true);
      setLookupState({
        tone: "info",
        text: "Searching customer profile..."
      });

      const response = await axios.get(`${API_BASE_URL}/api/customers/lookup`, {
        params: { phone: normalized }
      });

      const customer = response.data || null;
      if (!customer) {
        throw new Error("Customer lookup failed");
      }

      upsertCustomerInDirectory(customer);
      setSelectedCustomerId(customer.id);
      setLookupState({
        tone: "success",
        text: "Customer found and selected."
      });
    } catch (err) {
      console.error(err);
      setLookupState({
        tone: "error",
        text:
          err.response?.status === 404
            ? "No customer found for this mobile number."
            : err.response?.data?.message || "Unable to lookup customer."
      });
    } finally {
      setFindingByPhone(false);
    }
  };

  const resolveAddressFromCoordinates = async (latitude, longitude) => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    setIsResolvingAddress(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/customers/reverse-geocode`, {
        params: {
          latitude: lat,
          longitude: lng
        }
      });
      const payload = response.data || {};

      if (payload.address) {
        updateField("address", payload.address);
      } else if (payload.displayName) {
        updateField("address", payload.displayName);
      }
      if (payload.city) {
        updateField("city", payload.city);
      }
      if (payload.state) {
        updateField("state", payload.state);
      }
      if (payload.pinCode) {
        updateField("pinCode", payload.pinCode);
      }

      setLocationState("Address auto-filled from map coordinates.");
    } catch (err) {
      console.error(err);
      setLocationState("Location saved. Address lookup failed, enter address manually.");
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const geocodeFromAddress = async () => {
    const query = [form.address, form.city, form.state, form.pinCode].filter(Boolean).join(", ");
    if (!query) {
      setLocationState("Enter address details before geocoding.");
      return;
    }

    setIsResolvingAddress(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/customers/geocode`, {
        params: {
          query
        }
      });
      const result = response.data || null;
      if (!result) {
        setLocationState("No map match found for this address.");
        return;
      }

      updateField("latitude", String(result.latitude || ""));
      updateField("longitude", String(result.longitude || ""));
      if (!form.city && result.city) {
        updateField("city", result.city);
      }
      if (!form.state && result.state) {
        updateField("state", result.state);
      }
      if (!form.pinCode && result.pinCode) {
        updateField("pinCode", result.pinCode);
      }
      setLocationState("Coordinates updated from address.");
    } catch (err) {
      console.error(err);
      setLocationState(err.response?.data?.message || "Unable to geocode this address right now.");
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const detectCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationState("Geolocation is not supported in this browser.");
      return;
    }

    setIsLocatingCustomer(true);
    setLocationState("Fetching current location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(position.coords?.latitude);
        const longitude = Number(position.coords?.longitude);
        updateField("latitude", String(latitude || ""));
        updateField("longitude", String(longitude || ""));
        setLocationState("Current location captured.");
        setIsLocatingCustomer(false);
        await resolveAddressFromCoordinates(latitude, longitude);
      },
      (error) => {
        console.error(error);
        setLocationState("Location permission denied or unavailable.");
        setIsLocatingCustomer(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000
      }
    );
  };

  const queueCampaignDraft = () => {
    if (!selectedCustomer) {
      return;
    }

    const firstName = String(selectedCustomer.name || "Customer").trim() || "Customer";
    const payload = {
      channel: "WHATSAPP",
      title: `VIP Offer - ${firstName}`,
      message: `Hi ${firstName}, thank you for ordering with us. We have a special offer for you today.`,
      couponCode: "",
      sourceCustomerId: selectedCustomer.id,
      sourcePhone: selectedCustomer.phone
    };
    window.localStorage.setItem(MARKETING_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    setLookupState({
      tone: "success",
      text: "Campaign draft saved. Open Marketing page to send it."
    });
  };

  const saveCustomer = async () => {
    if (!selectedCustomer) {
      return;
    }

    try {
      setSaving(true);
      await axios.put(`${API_BASE_URL}/api/customers/${selectedCustomer.id}`, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pinCode: form.pinCode.trim(),
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
        notes: form.notes.trim(),
        loyaltyPoints: Number(form.loyaltyPoints || 0),
        whatsappOptIn: form.whatsappOptIn,
        smsOptIn: form.smsOptIn
      });
      await loadCustomers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to save customer");
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    return customers.reduce(
      (acc, customer) => {
        acc.lifetimeValue += Number(customer.lifetimeValue || 0);
        acc.loyaltyPoints += Number(customer.loyaltyPoints || 0);
        acc.orderCount += Number(customer.orderCount || 0);
        return acc;
      },
      { lifetimeValue: 0, loyaltyPoints: 0, orderCount: 0 }
    );
  }, [customers]);

  const selectedCustomerAddress = [form.address, form.city, form.state, form.pinCode]
    .filter(Boolean)
    .join(", ");

  const selectedCustomerPhone = normalizePhone(
    selectedMapCustomer?.phone || selectedCustomer?.phone || ""
  );
  const whatsappNumber = toWhatsappNumber(selectedCustomerPhone);
  const whatsappMessage = encodeURIComponent(
    `Hi ${selectedCustomer?.name || "Customer"}, thank you for choosing us.`
  );
  const smsMessage = encodeURIComponent(
    `Hi ${selectedCustomer?.name || "Customer"}, we have a new offer for you.`
  );
  const callLink = selectedCustomerPhone ? `tel:${selectedCustomerPhone}` : "";
  const smsLink = selectedCustomerPhone ? `sms:${selectedCustomerPhone}?body=${smsMessage}` : "";
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
    : "";

  const mapAnchorPosition =
    mapAnchor && mapBounds
      ? projectToMap(Number(mapAnchor.latitude), Number(mapAnchor.longitude), mapBounds)
      : null;

  const liveMapEmbedUrl = useMemo(() => {
    if (!selectedMapCustomer) {
      return "";
    }
    return buildGeoMapUrl(selectedMapCustomer.latitude, selectedMapCustomer.longitude);
  }, [selectedMapCustomer]);

  return (
    <PageContainer>
      <div style={header}>
        <div style={headerLeft}>
          <h2 style={title}>Customer CRM</h2>
          <p style={subtitle}>
            Mobile-first customer intelligence with profile, order timeline, and loyalty insights.
          </p>

          <div style={lookupRow}>
            <input
              value={lookupPhone}
              onChange={(event) => setLookupPhone(event.target.value)}
              placeholder="Find customer by mobile number"
              style={lookupInput}
            />
            <button
              type="button"
              onClick={findCustomerByPhone}
              style={lookupButton}
              disabled={findingByPhone}
            >
              {findingByPhone ? "Finding..." : "Find"}
            </button>
          </div>

          {lookupState ? (
            <div
              style={{
                ...lookupStatus,
                ...(lookupState.tone === "success"
                  ? lookupStatusSuccess
                  : lookupState.tone === "warning"
                    ? lookupStatusWarning
                    : lookupState.tone === "error"
                      ? lookupStatusError
                      : lookupStatusInfo)
              }}
            >
              {lookupState.text}
            </div>
          ) : null}
        </div>

        <div style={summaryGrid}>
          <SummaryCard label="Customers" value={String(customers.length)} />
          <SummaryCard label="Lifetime Value" value={CURRENCY.format(totals.lifetimeValue)} />
          <SummaryCard label="Orders" value={String(totals.orderCount)} />
        </div>
      </div>

      <div style={layout}>
        <section style={listPanel}>
          <div style={panelHeader}>
            <h3 style={panelTitle}>Customer Directory</h3>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, mobile, city"
              style={searchInput}
            />
          </div>
          <div style={segmentRow}>
            {CUSTOMER_SEGMENTS.map((segment) => (
              <button
                key={segment.id}
                type="button"
                onClick={() => setSegmentFilter(segment.id)}
                style={{
                  ...segmentBtn,
                  ...(segmentFilter === segment.id ? segmentBtnActive : null)
                }}
              >
                {segment.label} ({segmentCounts[segment.id] || 0})
              </button>
            ))}
          </div>

          {loading ? <p style={hint}>Loading customers...</p> : null}
          {!filteredCustomers.length ? (
            <p style={hint}>No customers found yet. Create orders with mobile numbers to populate CRM.</p>
          ) : (
            <div style={customerList}>
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => setSelectedCustomerId(customer.id)}
                  style={{
                    ...customerListItem,
                    ...(selectedCustomerId === customer.id ? customerListItemActive : null)
                  }}
                >
                  <div>
                    <div style={customerName}>{customer.name || "Walk-in Customer"}</div>
                    <div style={customerPhone}>{customer.phone}</div>
                    <div style={customerMetaLine}>
                      Orders: {customer.orderCount || 0} • Last: {formatDateTime(customer.lastOrderAt)}
                    </div>
                  </div>
                  <div style={customerValue}>{CURRENCY.format(customer.lifetimeValue || 0)}</div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section style={detailPanel}>
          {!selectedCustomer ? (
            <p style={hint}>Select a customer to view profile, map location, and order intelligence.</p>
          ) : (
            <>
              <div style={detailHeader}>
                <div>
                  <h3 style={detailTitle}>{selectedCustomer.name || "Walk-in Customer"}</h3>
                  <div style={detailMeta}>{selectedCustomer.phone}</div>
                  <div style={detailMetaSecondary}>
                    First Order: {formatDateTime(selectedCustomer.firstOrderAt)} • Last Order:{" "}
                    {formatDateTime(selectedCustomer.lastOrderAt)}
                  </div>
                </div>
                <div style={detailChips}>
                  <span style={chip}>LTV {CURRENCY.format(selectedCustomer.lifetimeValue || 0)}</span>
                  <span style={chip}>Orders {selectedCustomer.orderCount || 0}</span>
                  <span style={chip}>
                    AOV {CURRENCY.format(selectedCustomer.metrics?.averageOrderValue || 0)}
                  </span>
                  <span style={chip}>Points {selectedCustomer.loyaltyPoints || 0}</span>
                </div>
              </div>

              <div style={sectionGrid}>
                <div style={detailCard}>
                  <h4 style={cardTitle}>Profile & Location</h4>
                  <div style={fieldGrid}>
                    <label style={field}>
                      <span style={fieldLabel}>Name</span>
                      <input
                        value={form.name}
                        onChange={(event) => updateField("name", event.target.value)}
                        style={input}
                      />
                    </label>
                    <label style={field}>
                      <span style={fieldLabel}>Email</span>
                      <input
                        value={form.email}
                        onChange={(event) => updateField("email", event.target.value)}
                        style={input}
                      />
                    </label>
                    <label style={field}>
                      <span style={fieldLabel}>Loyalty Points</span>
                      <input
                        type="number"
                        value={form.loyaltyPoints}
                        onChange={(event) => updateField("loyaltyPoints", event.target.value)}
                        style={input}
                      />
                    </label>
                    <label style={field}>
                      <span style={fieldLabel}>City</span>
                      <input
                        value={form.city}
                        onChange={(event) => updateField("city", event.target.value)}
                        style={input}
                      />
                    </label>
                    <label style={field}>
                      <span style={fieldLabel}>State</span>
                      <input
                        value={form.state}
                        onChange={(event) => updateField("state", event.target.value)}
                        style={input}
                      />
                    </label>
                    <label style={field}>
                      <span style={fieldLabel}>Pin Code</span>
                      <input
                        value={form.pinCode}
                        onChange={(event) => updateField("pinCode", event.target.value)}
                        style={input}
                      />
                    </label>
                    <label style={field}>
                      <span style={fieldLabel}>Latitude</span>
                      <input
                        value={form.latitude}
                        onChange={(event) => updateField("latitude", event.target.value)}
                        style={input}
                        placeholder="12.9716"
                      />
                    </label>
                    <label style={field}>
                      <span style={fieldLabel}>Longitude</span>
                      <input
                        value={form.longitude}
                        onChange={(event) => updateField("longitude", event.target.value)}
                        style={input}
                        placeholder="77.5946"
                      />
                    </label>
                  </div>

                  <div style={locationActionRow}>
                    <button
                      type="button"
                      style={miniActionBtn}
                      onClick={detectCurrentLocation}
                      disabled={isLocatingCustomer}
                    >
                      {isLocatingCustomer ? "Locating..." : "Use Current Location"}
                    </button>
                    <button
                      type="button"
                      style={miniActionBtn}
                      onClick={geocodeFromAddress}
                      disabled={isResolvingAddress}
                    >
                      {isResolvingAddress ? "Mapping..." : "Map Address"}
                    </button>
                    <button
                      type="button"
                      style={miniActionBtn}
                      onClick={() => resolveAddressFromCoordinates(form.latitude, form.longitude)}
                      disabled={isResolvingAddress || !form.latitude || !form.longitude}
                    >
                      Resolve Address
                    </button>
                  </div>
                  {locationState ? <div style={locationHint}>{locationState}</div> : null}

                  <label style={field}>
                    <span style={fieldLabel}>Address</span>
                    <textarea
                      value={form.address}
                      onChange={(event) => updateField("address", event.target.value)}
                      style={textarea}
                    />
                  </label>

                  <label style={field}>
                    <span style={fieldLabel}>Internal Notes</span>
                    <textarea
                      value={form.notes}
                      onChange={(event) => updateField("notes", event.target.value)}
                      style={textarea}
                    />
                  </label>

                  <div style={toggleWrap}>
                    <label style={toggleLabel}>
                      <input
                        type="checkbox"
                        checked={form.whatsappOptIn}
                        onChange={(event) => updateField("whatsappOptIn", event.target.checked)}
                      />
                      WhatsApp Opt-in
                    </label>
                    <label style={toggleLabel}>
                      <input
                        type="checkbox"
                        checked={form.smsOptIn}
                        onChange={(event) => updateField("smsOptIn", event.target.checked)}
                      />
                      SMS Opt-in
                    </label>
                  </div>

                  {selectedCustomerAddress ? (
                    <div style={addressPreview}>{selectedCustomerAddress}</div>
                  ) : null}

                  <button style={saveBtn} onClick={saveCustomer} disabled={saving}>
                    {saving ? "Saving..." : "Save Customer"}
                  </button>
                </div>

                <div style={detailCard}>
                  <h4 style={cardTitle}>Customer Intelligence</h4>
                  <div style={metricGrid}>
                    <Metric label="Total Orders" value={selectedCustomer.orderCount || 0} />
                    <Metric
                      label="Lifetime Value"
                      value={CURRENCY.format(selectedCustomer.lifetimeValue || 0)}
                    />
                    <Metric
                      label="Average Order"
                      value={CURRENCY.format(selectedCustomer.metrics?.averageOrderValue || 0)}
                    />
                    <Metric label="Loyalty Points" value={selectedCustomer.loyaltyPoints || 0} />
                  </div>

                  <div style={dataBlock}>
                    <div style={fieldLabel}>Favorite Dishes</div>
                    {!selectedCustomer.favoriteDishes?.length ? (
                      <p style={hint}>Favorites will auto-build from order history.</p>
                    ) : (
                      <div style={tagWrap}>
                        {selectedCustomer.favoriteDishes.map((dish) => (
                          <span key={dish.name} style={tag}>
                            {dish.name} x{dish.orderCount}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={dataBlock}>
                    <div style={fieldLabel}>Referral Program</div>
                    <div style={referralBox}>
                      <span>Referral Code: {selectedCustomer.referralCode || "-"}</span>
                      <span>Total Referrals: {selectedCustomer.totalReferrals || 0}</span>
                      <span>Referred By: {selectedCustomer.referredByCode || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={detailCard}>
                <h4 style={cardTitle}>Order Timeline</h4>
                {!selectedOrderHistory.length ? (
                  <p style={hint}>No order history available yet.</p>
                ) : (
                  <div style={historyList}>
                    {selectedOrderHistory.map((entry, index) => {
                      const itemDetails = Array.isArray(entry.itemDetails) ? entry.itemDetails : [];
                      const fallbackItems = Array.isArray(entry.items) ? entry.items : [];
                      const displayItems = itemDetails.length
                        ? itemDetails
                        : fallbackItems.map((name) => ({
                            displayName: name,
                            quantity: 1,
                            lineTotal: 0
                          }));
                      const orderMeta = [
                        entry.invoiceNumber ? `Invoice: ${entry.invoiceNumber}` : "",
                        entry.orderStatus ? `Status: ${entry.orderStatus}` : "",
                        entry.serviceType ? `Service: ${entry.serviceType}` : "",
                        entry.paymentMode ? `Payment: ${entry.paymentMode}` : ""
                      ]
                        .filter(Boolean)
                        .join(" • ");

                      return (
                        <div key={`${entry.orderId || "order"}-${index}`} style={historyItem}>
                          <div style={historyHead}>
                            <div>
                              <div style={historyAmount}>{CURRENCY.format(entry.totalAmount || 0)}</div>
                              <div style={historyMeta}>{formatDateTime(entry.orderedAt)}</div>
                              {orderMeta ? <div style={historyMeta}>{orderMeta}</div> : null}
                            </div>
                            <div style={historySerial}>#{selectedOrderHistory.length - index}</div>
                          </div>
                          <div style={historyItemsGrid}>
                            {displayItems.length ? (
                              displayItems.slice(0, 10).map((item, itemIndex) => (
                                <div
                                  key={`${entry.orderId || index}-line-${itemIndex}`}
                                  style={historyLineItem}
                                >
                                  <span style={historyItems}>
                                    {item.displayName || item.name || "Menu Item"}
                                  </span>
                                  <span style={historyLineMeta}>
                                    x{item.quantity || 1}
                                    {toNumber(item.lineTotal)
                                      ? ` • ${CURRENCY.format(item.lineTotal)}`
                                      : ""}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span style={historyItems}>No items recorded</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </PageContainer>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div style={summaryCard}>
      <span style={summaryLabel}>{label}</span>
      <strong style={summaryValue}>{value}</strong>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={metricCard}>
      <span style={metricLabel}>{label}</span>
      <strong style={metricValue}>{value}</strong>
    </div>
  );
}

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 14
};

const headerLeft = {
  display: "grid",
  gap: 10,
  width: "min(620px, 100%)"
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

const lookupRow = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
};

const lookupInput = {
  height: 38,
  minWidth: 240,
  flex: "1 1 260px",
  borderRadius: 10,
  border: "1px solid #343949",
  background: "#0f1218",
  color: "#ecf1fa",
  padding: "0 12px",
  outline: 0
};

const lookupButton = {
  height: 38,
  borderRadius: 10,
  border: "1px solid #42506a",
  background: "#20293a",
  color: "#eaf0fc",
  fontWeight: 700,
  padding: "0 14px",
  cursor: "pointer"
};

const lookupStatus = {
  borderRadius: 10,
  padding: "8px 10px",
  border: "1px solid transparent",
  fontSize: 12
};

const lookupStatusInfo = {
  color: "#8dc4ff",
  borderColor: "rgba(141,196,255,0.45)",
  background: "rgba(76,136,220,0.16)"
};

const lookupStatusSuccess = {
  color: "#7de3bb",
  borderColor: "rgba(125,227,187,0.45)",
  background: "rgba(54,169,131,0.16)"
};

const lookupStatusWarning = {
  color: "#ffcd88",
  borderColor: "rgba(255,205,136,0.45)",
  background: "rgba(210,148,59,0.16)"
};

const lookupStatusError = {
  color: "#ffb7b7",
  borderColor: "rgba(255,183,183,0.45)",
  background: "rgba(204,91,91,0.16)"
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
  width: "min(520px, 100%)"
};

const summaryCard = {
  border: "1px solid #2d3343",
  borderRadius: 12,
  background: "#121620",
  padding: 12,
  display: "grid",
  gap: 6
};

const summaryLabel = {
  color: "#91a0bf",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.35
};

const summaryValue = {
  color: "#f2f5fb",
  fontSize: 20,
  fontWeight: 800
};

const mapPanel = {
  border: "1px solid #2a2d38",
  background: "#151821",
  borderRadius: 16,
  padding: 14,
  marginBottom: 14,
  display: "grid",
  gap: 10
};

const mapPanelHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap"
};

const mapTitle = {
  margin: 0,
  color: "#eef2fb",
  fontSize: 18
};

const mapMeta = {
  color: "#99a4bc",
  fontSize: 12
};

const mapPanelBody = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12
};

const mapBoard = {
  position: "relative",
  minHeight: 320,
  borderRadius: 14,
  border: "1px solid #303548",
  background:
    "radial-gradient(circle at 20% 20%, rgba(68,101,190,0.22), transparent 48%), linear-gradient(135deg, #0f131d, #161d2a)",
  overflow: "hidden"
};

const mapGridOverlay = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    "linear-gradient(rgba(136,155,196,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(136,155,196,0.08) 1px, transparent 1px)",
  backgroundSize: "32px 32px"
};

const mapPin = {
  position: "absolute",
  transform: "translate(-50%, -50%)",
  width: 30,
  height: 30,
  borderRadius: 999,
  border: "1px solid rgba(255,198,79,0.45)",
  background: "rgba(255,198,79,0.92)",
  color: "#1a1f2e",
  fontWeight: 900,
  fontSize: 12,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  zIndex: 3
};

const mapPinActive = {
  boxShadow: "0 0 0 5px rgba(255,198,79,0.24)"
};

const restaurantPin = {
  ...mapPin,
  width: 26,
  height: 26,
  borderColor: "rgba(80,223,166,0.5)",
  background: "rgba(80,223,166,0.95)",
  color: "#123126",
  zIndex: 4
};

const mapEmptyState = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  color: "#a5b2ce",
  fontSize: 14,
  textAlign: "center",
  padding: 20
};

const mapSideCard = {
  border: "1px solid #2f3547",
  borderRadius: 12,
  background: "#10141d",
  padding: 12,
  display: "grid",
  gap: 6,
  alignContent: "start"
};

const mapCustomerName = {
  color: "#f4c93a",
  fontSize: 17,
  fontWeight: 800
};

const mapCustomerMeta = {
  color: "#a8b3cd",
  fontSize: 13
};

const actionRow = {
  marginTop: 6,
  display: "flex",
  gap: 6,
  flexWrap: "wrap"
};

const actionBtn = {
  height: 30,
  borderRadius: 8,
  border: "1px solid rgba(66,145,247,0.45)",
  background: "rgba(66,145,247,0.18)",
  color: "#d8e8ff",
  fontSize: 12,
  fontWeight: 700,
  textDecoration: "none",
  padding: "0 10px",
  display: "inline-flex",
  alignItems: "center"
};

const actionBtnGhost = {
  height: 30,
  borderRadius: 8,
  border: "1px solid rgba(148,164,195,0.42)",
  background: "transparent",
  color: "#d9e2f4",
  fontSize: 12,
  fontWeight: 700,
  textDecoration: "none",
  padding: "0 10px",
  display: "inline-flex",
  alignItems: "center",
  cursor: "pointer"
};

const liveMapFrameWrap = {
  border: "1px solid #2f3547",
  borderRadius: 12,
  overflow: "hidden",
  background: "#0f141f"
};

const liveMapFrame = {
  width: "100%",
  minHeight: 280,
  border: 0
};

const layout = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 14
};

const listPanel = {
  border: "1px solid #2a2d38",
  background: "#151821",
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 12,
  alignContent: "start"
};

const detailPanel = {
  border: "1px solid #2a2d38",
  background: "#151821",
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 14,
  alignContent: "start"
};

const panelHeader = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  justifyContent: "space-between",
  alignItems: "center"
};

const panelTitle = {
  margin: 0,
  color: "#eef2fb",
  fontSize: 18
};

const searchInput = {
  height: 38,
  minWidth: 180,
  borderRadius: 10,
  border: "1px solid #343949",
  background: "#0f1218",
  color: "#ecf1fa",
  padding: "0 12px",
  outline: 0
};

const segmentRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8
};

const segmentBtn = {
  height: 30,
  borderRadius: 999,
  border: "1px solid #36405b",
  background: "#111827",
  color: "#c8d2e8",
  fontSize: 12,
  fontWeight: 700,
  padding: "0 10px",
  cursor: "pointer"
};

const segmentBtnActive = {
  borderColor: "rgba(244,201,58,0.65)",
  background: "rgba(244,201,58,0.15)",
  color: "#f4c93a"
};

const customerList = {
  display: "grid",
  gap: 10,
  maxHeight: "72vh",
  overflowY: "auto"
};

const customerListItem = {
  border: "1px solid #2f3547",
  background: "#10141d",
  borderRadius: 12,
  padding: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  textAlign: "left",
  cursor: "pointer",
  color: "#edf2fb"
};

const customerListItemActive = {
  borderColor: "#f4c93a",
  boxShadow: "0 0 0 1px rgba(244,201,58,0.35) inset"
};

const customerName = {
  fontSize: 14,
  fontWeight: 700
};

const customerPhone = {
  color: "#96a0b8",
  fontSize: 12,
  marginTop: 4
};

const customerMetaLine = {
  color: "#808ba3",
  fontSize: 11,
  marginTop: 6
};

const customerValue = {
  color: "#f4c93a",
  fontSize: 13,
  fontWeight: 800
};

const detailHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  flexWrap: "wrap"
};

const detailTitle = {
  margin: 0,
  color: "#f2f5fb",
  fontSize: 24
};

const detailMeta = {
  color: "#96a0b8",
  marginTop: 6
};

const detailMetaSecondary = {
  color: "#78839d",
  marginTop: 4,
  fontSize: 12
};

const detailChips = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
};

const chip = {
  borderRadius: 999,
  border: "1px solid rgba(244,201,58,0.35)",
  background: "rgba(244,201,58,0.12)",
  color: "#f4c93a",
  fontSize: 12,
  fontWeight: 800,
  padding: "7px 10px"
};

const sectionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 14
};

const detailCard = {
  border: "1px solid #2f3547",
  borderRadius: 14,
  background: "#10141d",
  padding: 14,
  display: "grid",
  gap: 12
};

const cardTitle = {
  margin: 0,
  color: "#eef2fb",
  fontSize: 16
};

const fieldGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10
};

const field = {
  display: "grid",
  gap: 6
};

const locationActionRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8
};

const miniActionBtn = {
  height: 30,
  borderRadius: 8,
  border: "1px solid #3a4560",
  background: "#1a2233",
  color: "#dbe7ff",
  fontSize: 12,
  fontWeight: 700,
  padding: "0 10px",
  cursor: "pointer"
};

const locationHint = {
  border: "1px solid rgba(86,167,255,0.34)",
  background: "rgba(56,134,220,0.14)",
  borderRadius: 8,
  color: "#9ccfff",
  fontSize: 12,
  padding: "8px 10px"
};

const fieldLabel = {
  color: "#96a0b8",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.35
};

const input = {
  height: 38,
  borderRadius: 10,
  border: "1px solid #343949",
  background: "#0f1218",
  color: "#ecf1fa",
  padding: "0 12px",
  outline: 0
};

const textarea = {
  minHeight: 90,
  borderRadius: 10,
  border: "1px solid #343949",
  background: "#0f1218",
  color: "#ecf1fa",
  padding: "10px 12px",
  outline: 0,
  resize: "vertical"
};

const toggleWrap = {
  display: "grid",
  gap: 8
};

const toggleLabel = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#dbe2f3",
  fontSize: 13
};

const addressPreview = {
  border: "1px solid #2d3448",
  borderRadius: 8,
  background: "#151c2a",
  color: "#cfd9f0",
  fontSize: 12,
  padding: "8px 10px"
};

const saveBtn = {
  height: 40,
  border: 0,
  borderRadius: 10,
  background: "#38c98f",
  color: "#102519",
  fontWeight: 800,
  cursor: "pointer",
  padding: "0 14px"
};

const metricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 8
};

const metricCard = {
  border: "1px solid #293148",
  borderRadius: 10,
  background: "#141b2a",
  padding: "8px 10px",
  display: "grid",
  gap: 3
};

const metricLabel = {
  color: "#8d9dc0",
  fontSize: 11
};

const metricValue = {
  color: "#ecf2ff",
  fontSize: 14
};

const dataBlock = {
  display: "grid",
  gap: 8
};

const tagWrap = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
};

const tag = {
  borderRadius: 999,
  background: "#182030",
  color: "#dbe2f3",
  fontSize: 12,
  fontWeight: 700,
  padding: "6px 10px"
};

const referralBox = {
  display: "grid",
  gap: 8,
  color: "#edf2fb",
  fontSize: 13
};

const historyList = {
  display: "grid",
  gap: 10
};

const historyItem = {
  border: "1px solid #2f3547",
  borderRadius: 12,
  padding: 12,
  display: "grid",
  gap: 8
};

const historyHead = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start"
};

const historySerial = {
  borderRadius: 999,
  background: "rgba(244,201,58,0.14)",
  border: "1px solid rgba(244,201,58,0.35)",
  color: "#f4c93a",
  fontSize: 11,
  fontWeight: 800,
  padding: "5px 8px"
};

const historyAmount = {
  color: "#f4c93a",
  fontSize: 15,
  fontWeight: 800
};

const historyMeta = {
  color: "#96a0b8",
  fontSize: 12,
  marginTop: 4
};

const historyItems = {
  color: "#edf2fb",
  fontSize: 13
};

const historyItemsGrid = {
  display: "grid",
  gap: 6
};

const historyLineItem = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  border: "1px solid #2b3244",
  borderRadius: 8,
  background: "#121826",
  padding: "6px 8px"
};

const historyLineMeta = {
  color: "#a9b4cc",
  fontSize: 12,
  whiteSpace: "nowrap"
};

const hint = {
  margin: 0,
  color: "#99a4bc",
  fontSize: 13
};
