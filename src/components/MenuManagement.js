import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

import { API_BASE_URL } from "../config";
import { cloudKitchenTheme } from "../theme";
import { DEFAULT_MENU_IMAGE, formatCurrency } from "./cloud/cloudKitchenUtils";

const AVAILABILITY_OPTIONS = [
  { value: "ALL", label: "All availability" },
  { value: "IN_STOCK", label: "In Stock" },
  { value: "LOW_STOCK", label: "Low Stock" },
  { value: "OUT_OF_STOCK", label: "Out of Stock" }
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "All status" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" }
];

const DEMO_MENU_ITEMS = [
  {
    _id: "demo-margherita",
    __isDemo: true,
    name: "Margherita Pizza",
    category: "Pizza",
    price: 299,
    sellingPrice: 299,
    cost: 118,
    costPrice: 118,
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80",
    tags: ["bestseller", "veg"],
    variants: [
      { name: "Regular", price: 299, isDefault: true },
      { name: "Large", price: 429, isDefault: false }
    ],
    addOns: [
      { name: "Extra Cheese", price: 49, isAvailable: true },
      { name: "Olives", price: 39, isAvailable: true }
    ],
    isActive: true,
    isAvailable: true,
    availability: "IN_STOCK",
    recipeLink: ""
  },
  {
    _id: "demo-korean-bowl",
    __isDemo: true,
    name: "Korean Rice Bowl",
    category: "Bowls",
    price: 349,
    sellingPrice: 349,
    cost: 152,
    costPrice: 152,
    image:
      "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80",
    tags: ["spicy", "chef special"],
    variants: [],
    addOns: [
      { name: "Fried Egg", price: 35, isAvailable: true },
      { name: "Kimchi", price: 29, isAvailable: true }
    ],
    isActive: true,
    isAvailable: true,
    availability: "LOW_STOCK",
    recipeLink: ""
  },
  {
    _id: "demo-truffle-burger",
    __isDemo: true,
    name: "Truffle Smash Burger",
    category: "Burgers",
    price: 389,
    sellingPrice: 389,
    cost: 174,
    costPrice: 174,
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
    tags: ["bestseller", "non-veg"],
    variants: [],
    addOns: [
      { name: "Loaded Fries", price: 79, isAvailable: true }
    ],
    isActive: true,
    isAvailable: true,
    availability: "IN_STOCK",
    recipeLink: ""
  },
  {
    _id: "demo-cold-brew",
    __isDemo: true,
    name: "Nitro Cold Brew",
    category: "Beverages",
    price: 159,
    sellingPrice: 159,
    cost: 48,
    costPrice: 48,
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
    tags: ["cold", "coffee"],
    variants: [
      { name: "Medium", price: 159, isDefault: true },
      { name: "Large", price: 199, isDefault: false }
    ],
    addOns: [],
    isActive: false,
    isAvailable: false,
    availability: "OUT_OF_STOCK",
    recipeLink: ""
  }
];

const createDraft = (item = null) => ({
  name: item?.name || "",
  category: item?.category || "General",
  price: String(item?.sellingPrice ?? item?.price ?? ""),
  cost: String(item?.costPrice ?? item?.cost ?? ""),
  availability: item?.availability || "IN_STOCK",
  isActive: item?.isActive !== false,
  image: item?.image || "",
  recipeLink: item?.recipeLink || "",
  tags: Array.isArray(item?.tags) ? item.tags.join(", ") : "",
  variants:
    Array.isArray(item?.variants) && item.variants.length
      ? item.variants.map((variant) => ({
          name: variant?.name || "",
          price: String(variant?.price ?? ""),
          isDefault: Boolean(variant?.isDefault)
        }))
      : [{ name: "", price: "", isDefault: true }],
  addOns:
    Array.isArray(item?.addOns) && item.addOns.length
      ? item.addOns.map((addOn) => ({
          name: addOn?.name || "",
          price: String(addOn?.price ?? ""),
          isAvailable: addOn?.isAvailable !== false
        }))
      : [{ name: "", price: "", isAvailable: true }]
});

const normalizeTags = (value = []) => {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((tag) => tag.trim());

  return Array.from(
    new Set(
      source
        .map((tag) => String(tag || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeMenuItem = (item = {}) => {
  const sellingPrice = Math.max(0, toNumber(item.sellingPrice ?? item.price));
  const costPrice = Math.max(0, toNumber(item.costPrice ?? item.cost));
  const availability = ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"].includes(item.availability)
    ? item.availability
    : item.isAvailable === false
      ? "OUT_OF_STOCK"
      : "IN_STOCK";

  return {
    ...item,
    _id: String(item._id || item.id || ""),
    name: String(item.name || "").trim(),
    category: String(item.category || "General").trim() || "General",
    sellingPrice,
    price: sellingPrice,
    costPrice,
    cost: costPrice,
    image: String(item.image || "").trim() || DEFAULT_MENU_IMAGE,
    tags: normalizeTags(item.tags),
    variants: Array.isArray(item.variants)
      ? item.variants.map((variant) => ({
          name: String(variant?.name || "").trim(),
          price: Math.max(0, toNumber(variant?.price)),
          isDefault: Boolean(variant?.isDefault)
        }))
      : [],
    addOns: Array.isArray(item.addOns)
      ? item.addOns.map((addOn) => ({
          name: String(addOn?.name || "").trim(),
          price: Math.max(0, toNumber(addOn?.price)),
          isAvailable: addOn?.isAvailable !== false
        }))
      : [],
    isActive: item.isActive !== false,
    isAvailable: availability !== "OUT_OF_STOCK",
    availability,
    recipeLink: String(item.recipeLink || "").trim()
  };
};

const buildPayloadFromDraft = (draft = {}) => {
  const variants = Array.isArray(draft.variants)
    ? draft.variants
        .map((variant, index) => ({
          name: String(variant?.name || "").trim(),
          price: Math.max(0, toNumber(variant?.price)),
          isDefault: Boolean(variant?.isDefault) || index === 0
        }))
        .filter((variant) => variant.name)
    : [];

  if (variants.length && !variants.some((variant) => variant.isDefault)) {
    variants[0].isDefault = true;
  }

  const addOns = Array.isArray(draft.addOns)
    ? draft.addOns
        .map((addOn) => ({
          name: String(addOn?.name || "").trim(),
          price: Math.max(0, toNumber(addOn?.price)),
          isAvailable: addOn?.isAvailable !== false
        }))
        .filter((addOn) => addOn.name)
    : [];

  const availability = ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"].includes(draft.availability)
    ? draft.availability
    : "IN_STOCK";

  return {
    name: String(draft.name || "").trim(),
    category: String(draft.category || "General").trim() || "General",
    price: Math.max(0, toNumber(draft.price)),
    sellingPrice: Math.max(0, toNumber(draft.price)),
    cost: Math.max(0, toNumber(draft.cost)),
    costPrice: Math.max(0, toNumber(draft.cost)),
    availability,
    isActive: Boolean(draft.isActive),
    isAvailable: availability !== "OUT_OF_STOCK" && Boolean(draft.isActive),
    tags: normalizeTags(draft.tags),
    variants,
    addOns,
    image: String(draft.image || "").trim(),
    recipeLink: String(draft.recipeLink || "").trim()
  };
};

const buildRowsFromWorkbook = (rows = []) => {
  return rows
    .map((row) => {
      const name = String(row.Name || row.name || "").trim();
      if (!name) {
        return null;
      }

      const tags = normalizeTags(row.Tags || row.tags || "");
      const variants = String(row.Variants || row.variants || "")
        .split("|")
        .map((part, index) => {
          const [variantName, variantPrice] = String(part || "").split(":");
          return {
            name: String(variantName || "").trim(),
            price: Math.max(0, toNumber(variantPrice)),
            isDefault: index === 0
          };
        })
        .filter((variant) => variant.name);
      const addOns = String(row["Add-ons"] || row.addOns || row.addons || "")
        .split("|")
        .map((part) => {
          const [addOnName, addOnPrice] = String(part || "").split(":");
          return {
            name: String(addOnName || "").trim(),
            price: Math.max(0, toNumber(addOnPrice)),
            isAvailable: true
          };
        })
        .filter((addOn) => addOn.name);

      return {
        name,
        category: String(row.Category || row.category || "General").trim() || "General",
        price: Math.max(0, toNumber(row.Price || row.price)),
        sellingPrice: Math.max(0, toNumber(row.Price || row.price)),
        cost: Math.max(0, toNumber(row.Cost || row.cost)),
        costPrice: Math.max(0, toNumber(row.Cost || row.cost)),
        availability:
          String(row.Availability || row.availability || "IN_STOCK").trim().toUpperCase() ||
          "IN_STOCK",
        isActive: String(row.Status || row.status || "ACTIVE").trim().toUpperCase() !== "INACTIVE",
        isAvailable:
          String(row.Availability || row.availability || "IN_STOCK").trim().toUpperCase() !==
          "OUT_OF_STOCK",
        tags,
        variants,
        addOns,
        image: String(row.Image || row.image || "").trim(),
        recipeLink: String(row["Recipe Link"] || row.recipeLink || "").trim()
      };
    })
    .filter(Boolean);
};

const getAvailabilityTone = (availability) => {
  if (availability === "OUT_OF_STOCK") {
    return badgeDanger;
  }

  if (availability === "LOW_STOCK") {
    return badgeWarning;
  }

  return badgeSuccess;
};

export default function MenuManagement() {
  const importInputRef = useRef(null);
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 860 : false
  );
  const [menuItems, setMenuItems] = useState([]);
  const [isDemoData, setIsDemoData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [draft, setDraft] = useState(createDraft());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/menu`);
      const nextItems = Array.isArray(response.data)
        ? response.data.map(normalizeMenuItem)
        : [];

      if (nextItems.length) {
        setMenuItems(nextItems);
        setIsDemoData(false);
      } else {
        setMenuItems(DEMO_MENU_ITEMS.map(normalizeMenuItem));
        setIsDemoData(true);
      }

      setError("");
    } catch (requestError) {
      setMenuItems(DEMO_MENU_ITEMS.map(normalizeMenuItem));
      setIsDemoData(true);
      setError(requestError.response?.data?.message || "Showing sample menu while API is unavailable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuItems();
  }, []);

  useEffect(() => {
    const sync = () => setIsNarrow(window.innerWidth < 860);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(menuItems.map((item) => item.category).filter(Boolean))
    );

    return ["ALL", ...uniqueCategories];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return menuItems.filter((item) => {
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) {
        return false;
      }

      if (statusFilter === "ACTIVE" && item.isActive === false) {
        return false;
      }

      if (statusFilter === "INACTIVE" && item.isActive !== false) {
        return false;
      }

      if (availabilityFilter !== "ALL" && item.availability !== availabilityFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [item.name, item.category, item.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [availabilityFilter, menuItems, search, selectedCategory, statusFilter]);

  const countsByCategory = useMemo(() => {
    return menuItems.reduce(
      (acc, item) => {
        acc.ALL += 1;
        acc[item.category] = Number(acc[item.category] || 0) + 1;
        return acc;
      },
      { ALL: 0 }
    );
  }, [menuItems]);

  const openCreateModal = () => {
    setEditingItem(null);
    setDraft(createDraft());
    setIsModalOpen(true);
    setMessage("");
    setError("");
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setDraft(createDraft(item));
    setIsModalOpen(true);
    setMessage("");
    setError("");
  };

  const closeModal = () => {
    if (saving || uploadingImage) {
      return;
    }

    setEditingItem(null);
    setDraft(createDraft());
    setIsModalOpen(false);
  };

  const updateVariant = (index, key, value) => {
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => {
        if (variantIndex !== index) {
          return key === "isDefault" && value
            ? { ...variant, isDefault: false }
            : variant;
        }

        return {
          ...variant,
          [key]: key === "isDefault" ? Boolean(value) : value
        };
      })
    }));
  };

  const updateAddOn = (index, key, value) => {
    setDraft((current) => ({
      ...current,
      addOns: current.addOns.map((addOn, addOnIndex) =>
        addOnIndex === index
          ? {
              ...addOn,
              [key]: key === "isAvailable" ? Boolean(value) : value
            }
          : addOn
      )
    }));
  };

  const saveItem = async () => {
    const payload = buildPayloadFromDraft(draft);

    if (!payload.name) {
      setError("Menu item name is required.");
      return;
    }

    if (payload.sellingPrice <= 0) {
      setError("Base price must be greater than zero.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (editingItem && !editingItem.__isDemo && editingItem._id) {
        await axios.put(`${API_BASE_URL}/api/menu/${editingItem._id}`, payload);
        setMessage("Menu item updated.");
      } else {
        await axios.post(`${API_BASE_URL}/api/menu`, payload);
        setMessage(editingItem?.__isDemo ? "Sample item saved as a live menu item." : "Menu item created.");
      }

      await loadMenuItems();
      closeModal();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save menu item.");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) {
      return;
    }

    if (item.__isDemo || !item._id) {
      setMenuItems((current) => current.filter((entry) => entry._id !== item._id));
      setMessage("Sample item removed from this preview.");
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/menu/${item._id}`);
      setMenuItems((current) => current.filter((entry) => entry._id !== item._id));
      setMessage("Menu item deleted.");
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete menu item.");
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("image", file);
      const response = await axios.post(`${API_BASE_URL}/api/menu/upload-image`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setDraft((current) => ({
        ...current,
        image: response.data?.imageUrl || current.image
      }));
      setMessage("Image uploaded.");
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to upload image.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const exportItems = () => {
    const rows = filteredItems.map((item) => ({
      Name: item.name,
      Category: item.category,
      Price: item.sellingPrice,
      Cost: item.costPrice,
      Status: item.isActive ? "ACTIVE" : "INACTIVE",
      Availability: item.availability,
      Tags: item.tags.join(", "),
      Variants: item.variants.map((variant) => `${variant.name}:${variant.price}`).join(" | "),
      "Add-ons": item.addOns.map((addOn) => `${addOn.name}:${addOn.price}`).join(" | "),
      Image: item.image,
      "Recipe Link": item.recipeLink
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Menu");
    XLSX.writeFile(workbook, "cloud-kitchen-menu.xlsx");
  };

  const importItems = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setSaving(true);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
      const payloads = buildRowsFromWorkbook(rows);

      if (!payloads.length) {
        setError("No valid menu rows were found in the uploaded file.");
        return;
      }

      const results = await Promise.allSettled(
        payloads.map((payload) => axios.post(`${API_BASE_URL}/api/menu`, payload))
      );
      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failureCount = results.length - successCount;

      await loadMenuItems();
      setMessage(
        failureCount
          ? `${successCount} items imported, ${failureCount} skipped.`
          : `${successCount} items imported successfully.`
      );
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to import menu items.");
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  };

  return (
    <div style={page}>
      <div style={pageHeader}>
        <div>
          <h1 style={pageTitle}>Menu Management</h1>
          <p style={pageSubtitle}>
            Manage categories, pricing, variants, add-ons, and availability for the cloud kitchen menu.
          </p>
        </div>

        <div style={headerActions}>
          <button type="button" style={ghostButton} onClick={() => importInputRef.current?.click()}>
            Import
          </button>
          <button type="button" style={ghostButton} onClick={exportItems}>
            Export
          </button>
          <button type="button" style={primaryButton} onClick={openCreateModal}>
            Add Item
          </button>
        </div>
      </div>

      {isDemoData ? (
        <div style={infoBanner}>
          API returned no menu items, so sample data is shown to keep the workspace usable immediately.
        </div>
      ) : null}

      {message ? <div style={successBanner}>{message}</div> : null}
      {error ? <div style={errorBanner}>{error}</div> : null}

      <div style={{ ...layout, ...(isNarrow ? layoutNarrow : null) }}>
        <aside style={{ ...categoriesRail, ...(isNarrow ? categoriesRailNarrow : null) }}>
          <div style={railTitle}>Categories</div>
          {categories.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                style={{
                  ...categoryButton,
                  ...(active ? categoryButtonActive : null)
                }}
                onClick={() => setSelectedCategory(category)}
              >
                <span>{category === "ALL" ? "All Items" : category}</span>
                <span style={categoryCount}>{countsByCategory[category] || 0}</span>
              </button>
            );
          })}
        </aside>

        <section style={tableShell}>
          <div style={{ ...toolbar, ...(isNarrow ? toolbarNarrow : null) }}>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by item, category, or tag"
              style={searchInput}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={toolbarSelect}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={availabilityFilter}
              onChange={(event) => setAvailabilityFilter(event.target.value)}
              style={toolbarSelect}
            >
              {AVAILABILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={tableHead}>Image</th>
                  <th style={tableHead}>Name</th>
                  <th style={tableHead}>Category</th>
                  <th style={tableHead}>Price</th>
                  <th style={tableHead}>Cost</th>
                  <th style={tableHead}>Status</th>
                  <th style={tableHead}>Availability</th>
                  <th style={tableHead}>Tags</th>
                  <th style={tableHead}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={emptyCell}>
                      Loading menu...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={emptyCell}>
                      No menu items match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item._id} style={tableRow}>
                      <td style={tableCell}>
                        <img src={item.image} alt={item.name} style={tableImage} />
                      </td>
                      <td style={tableCell}>
                        <div style={itemName}>{item.name}</div>
                        {item.recipeLink ? (
                          <a
                            href={item.recipeLink}
                            target="_blank"
                            rel="noreferrer"
                            style={recipeLink}
                          >
                            Recipe link
                          </a>
                        ) : null}
                      </td>
                      <td style={tableCell}>{item.category}</td>
                      <td style={tableCell}>{formatCurrency(item.sellingPrice)}</td>
                      <td style={tableCell}>{formatCurrency(item.costPrice)}</td>
                      <td style={tableCell}>
                        <span style={item.isActive ? pillPositive : pillMuted}>
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={tableCell}>
                        <span style={{ ...pillNeutral, ...getAvailabilityTone(item.availability) }}>
                          {item.availability.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={tableCell}>
                        <div style={tagsWrap}>
                          {item.tags.length ? (
                            item.tags.map((tag) => (
                              <span key={`${item._id}-${tag}`} style={tagPill}>
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span style={mutedText}>No tags</span>
                          )}
                        </div>
                      </td>
                      <td style={tableCell}>
                        <div style={rowActions}>
                          <button type="button" style={rowButton} onClick={() => openEditModal(item)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            style={rowDangerButton}
                            onClick={() => deleteItem(item)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isModalOpen ? (
        <div style={modalBackdrop} onClick={closeModal}>
          <div style={modalCard} onClick={(event) => event.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <h2 style={modalTitle}>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</h2>
                <p style={modalSubtitle}>Capture pricing, availability, variants, and add-ons in one place.</p>
              </div>
              <button type="button" style={closeButton} onClick={closeModal}>
                Close
              </button>
            </div>

            <div style={{ ...modalGrid, ...(isNarrow ? modalGridNarrow : null) }}>
              <label style={field}>
                <span style={fieldLabel}>Name</span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  style={fieldInput}
                  placeholder="Item name"
                />
              </label>

              <label style={field}>
                <span style={fieldLabel}>Category</span>
                <input
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, category: event.target.value }))
                  }
                  style={fieldInput}
                  placeholder="Category"
                />
              </label>

              <label style={field}>
                <span style={fieldLabel}>Base Price</span>
                <input
                  value={draft.price}
                  onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
                  style={fieldInput}
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </label>

              <label style={field}>
                <span style={fieldLabel}>Cost</span>
                <input
                  value={draft.cost}
                  onChange={(event) => setDraft((current) => ({ ...current, cost: event.target.value }))}
                  style={fieldInput}
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </label>

              <label style={field}>
                <span style={fieldLabel}>Availability</span>
                <select
                  value={draft.availability}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, availability: event.target.value }))
                  }
                  style={fieldInput}
                >
                  {AVAILABILITY_OPTIONS.filter((option) => option.value !== "ALL").map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldCheckbox}>
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                <span style={fieldLabel}>Item is active</span>
              </label>

              <label style={{ ...field, gridColumn: "1 / -1" }}>
                <span style={fieldLabel}>Tags</span>
                <input
                  value={draft.tags}
                  onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
                  style={fieldInput}
                  placeholder="bestseller, spicy, vegan"
                />
              </label>

              <label style={{ ...field, gridColumn: "1 / -1" }}>
                <span style={fieldLabel}>Recipe Link</span>
                <input
                  value={draft.recipeLink}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, recipeLink: event.target.value }))
                  }
                  style={fieldInput}
                  placeholder="https://..."
                />
              </label>

              <div style={{ ...field, gridColumn: "1 / -1" }}>
                <span style={fieldLabel}>Image</span>
                <div style={{ ...imageUploader, ...(isNarrow ? imageUploaderNarrow : null) }}>
                  <img src={draft.image || DEFAULT_MENU_IMAGE} alt={draft.name || "Preview"} style={previewImage} />
                  <div style={imageUploaderActions}>
                    <input
                      value={draft.image}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, image: event.target.value }))
                      }
                      style={fieldInput}
                      placeholder="Paste image URL or upload below"
                    />
                    <label style={uploadButton}>
                      {uploadingImage ? "Uploading..." : "Upload Image"}
                      <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ ...stackSection, gridColumn: "1 / -1" }}>
                <div style={sectionHeader}>
                  <div style={sectionTitle}>Variants</div>
                  <button
                    type="button"
                    style={tinyButton}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        variants: [...current.variants, { name: "", price: "", isDefault: false }]
                      }))
                    }
                  >
                    Add Variant
                  </button>
                </div>

                {draft.variants.map((variant, index) => (
                  <div key={`variant-${index}`} style={{ ...stackRow, ...(isNarrow ? stackRowNarrow : null) }}>
                    <input
                      value={variant.name}
                      onChange={(event) => updateVariant(index, "name", event.target.value)}
                      style={fieldInput}
                      placeholder="Variant name"
                    />
                    <input
                      value={variant.price}
                      onChange={(event) => updateVariant(index, "price", event.target.value)}
                      style={fieldInput}
                      inputMode="decimal"
                      placeholder="Price"
                    />
                    <label style={stackCheckbox}>
                      <input
                        type="checkbox"
                        checked={variant.isDefault}
                        onChange={(event) => updateVariant(index, "isDefault", event.target.checked)}
                      />
                      Default
                    </label>
                    <button
                      type="button"
                      style={tinyDangerButton}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          variants:
                            current.variants.length === 1
                              ? [{ name: "", price: "", isDefault: true }]
                              : current.variants.filter((_, variantIndex) => variantIndex !== index)
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ ...stackSection, gridColumn: "1 / -1" }}>
                <div style={sectionHeader}>
                  <div style={sectionTitle}>Add-ons</div>
                  <button
                    type="button"
                    style={tinyButton}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        addOns: [...current.addOns, { name: "", price: "", isAvailable: true }]
                      }))
                    }
                  >
                    Add Add-on
                  </button>
                </div>

                {draft.addOns.map((addOn, index) => (
                  <div key={`addon-${index}`} style={{ ...stackRow, ...(isNarrow ? stackRowNarrow : null) }}>
                    <input
                      value={addOn.name}
                      onChange={(event) => updateAddOn(index, "name", event.target.value)}
                      style={fieldInput}
                      placeholder="Add-on name"
                    />
                    <input
                      value={addOn.price}
                      onChange={(event) => updateAddOn(index, "price", event.target.value)}
                      style={fieldInput}
                      inputMode="decimal"
                      placeholder="Price"
                    />
                    <label style={stackCheckbox}>
                      <input
                        type="checkbox"
                        checked={addOn.isAvailable}
                        onChange={(event) => updateAddOn(index, "isAvailable", event.target.checked)}
                      />
                      Available
                    </label>
                    <button
                      type="button"
                      style={tinyDangerButton}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          addOns:
                            current.addOns.length === 1
                              ? [{ name: "", price: "", isAvailable: true }]
                              : current.addOns.filter((_, addOnIndex) => addOnIndex !== index)
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={modalActions}>
              <button type="button" style={ghostButton} onClick={closeModal}>
                Cancel
              </button>
              <button type="button" style={primaryButton} onClick={saveItem} disabled={saving || uploadingImage}>
                {saving ? "Saving..." : editingItem ? "Save Changes" : "Create Item"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={importItems}
      />
    </div>
  );
}

const page = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
  color: cloudKitchenTheme.textPrimary
};

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap"
};

const pageTitle = {
  margin: 0,
  fontSize: 30,
  fontWeight: 800,
  letterSpacing: "-0.03em"
};

const pageSubtitle = {
  margin: "6px 0 0",
  color: cloudKitchenTheme.textSecondary,
  fontSize: 14,
  lineHeight: 1.6
};

const headerActions = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap"
};

const layout = {
  display: "grid",
  gridTemplateColumns: "260px minmax(0, 1fr)",
  gap: 18
};

const layoutNarrow = {
  gridTemplateColumns: "1fr",
  gap: 12
};

const categoriesRail = {
  background: "#FFFFFF",
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 22,
  boxShadow: cloudKitchenTheme.shadow,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  alignSelf: "start",
  position: "sticky",
  top: 96
};

const categoriesRailNarrow = {
  position: "relative",
  top: "auto",
  padding: 12,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 130px), 1fr))"
};

const railTitle = {
  fontSize: 13,
  fontWeight: 700,
  color: cloudKitchenTheme.textSecondary,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 2
};

const categoryButton = {
  width: "100%",
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  borderRadius: 16,
  padding: "12px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  color: cloudKitchenTheme.textPrimary,
  fontWeight: 600,
  cursor: "pointer"
};

const categoryButtonActive = {
  background: cloudKitchenTheme.panelSoft,
  borderColor: "#D1D5DB"
};

const categoryCount = {
  minWidth: 28,
  height: 28,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  background: "#111111",
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 700
};

const tableShell = {
  background: "#FFFFFF",
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 22,
  boxShadow: cloudKitchenTheme.shadow,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0
};

const toolbar = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1fr) 180px 180px",
  gap: 10
};

const toolbarNarrow = {
  gridTemplateColumns: "1fr"
};

const searchInput = {
  height: 44,
  borderRadius: 14,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  padding: "0 14px",
  fontSize: 14,
  outline: "none"
};

const toolbarSelect = {
  height: 44,
  borderRadius: 14,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  padding: "0 14px",
  fontSize: 14,
  outline: "none"
};

const tableWrap = {
  overflowX: "auto"
};

const table = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0
};

const tableHead = {
  textAlign: "left",
  padding: "0 12px 12px",
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  whiteSpace: "nowrap"
};

const tableRow = {
  background: "#FFFFFF"
};

const tableCell = {
  borderTop: `1px solid ${cloudKitchenTheme.border}`,
  padding: "14px 12px",
  verticalAlign: "top",
  fontSize: 14
};

const tableImage = {
  width: 64,
  height: 64,
  borderRadius: 16,
  objectFit: "cover",
  display: "block"
};

const itemName = {
  fontWeight: 700,
  fontSize: 15
};

const recipeLink = {
  color: "#111111",
  fontSize: 12,
  marginTop: 6,
  display: "inline-block"
};

const tagsWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6
};

const tagPill = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "#F3F4F6",
  color: "#111111",
  fontSize: 12,
  fontWeight: 600
};

const rowActions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
};

const rowButton = {
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  color: "#111111",
  borderRadius: 12,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer"
};

const rowDangerButton = {
  ...rowButton,
  borderColor: "#FECACA",
  color: "#B91C1C",
  background: "#FEF2F2"
};

const emptyCell = {
  padding: "36px 16px",
  textAlign: "center",
  color: cloudKitchenTheme.textSecondary
};

const primaryButton = {
  height: 44,
  border: 0,
  borderRadius: 14,
  padding: "0 16px",
  background: "#111111",
  color: "#FFFFFF",
  fontWeight: 700,
  cursor: "pointer"
};

const ghostButton = {
  height: 44,
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 14,
  padding: "0 16px",
  background: "#FFFFFF",
  color: "#111111",
  fontWeight: 700,
  cursor: "pointer"
};

const infoBanner = {
  borderRadius: 16,
  padding: "12px 14px",
  background: "#F8FAFC",
  border: `1px solid ${cloudKitchenTheme.border}`,
  color: cloudKitchenTheme.textSecondary,
  fontSize: 13
};

const successBanner = {
  borderRadius: 16,
  padding: "12px 14px",
  background: "#ECFDF5",
  border: "1px solid #BBF7D0",
  color: "#166534",
  fontSize: 13
};

const errorBanner = {
  borderRadius: 16,
  padding: "12px 14px",
  background: "#FEF2F2",
  border: "1px solid #FECACA",
  color: "#B91C1C",
  fontSize: 13
};

const pillBase = {
  display: "inline-flex",
  alignItems: "center",
  height: 30,
  padding: "0 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  border: "1px solid transparent"
};

const pillPositive = {
  ...pillBase,
  background: "#ECFDF5",
  borderColor: "#BBF7D0",
  color: "#166534"
};

const pillMuted = {
  ...pillBase,
  background: "#F3F4F6",
  borderColor: "#E5E7EB",
  color: "#6B7280"
};

const pillNeutral = {
  ...pillBase,
  background: "#F8FAFC",
  color: "#111111"
};

const badgeSuccess = {
  background: "#ECFDF5",
  borderColor: "#BBF7D0",
  color: "#166534"
};

const badgeWarning = {
  background: "#FFFBEB",
  borderColor: "#FDE68A",
  color: "#92400E"
};

const badgeDanger = {
  background: "#FEF2F2",
  borderColor: "#FECACA",
  color: "#B91C1C"
};

const mutedText = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12
};

const modalBackdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.16)",
  display: "grid",
  placeItems: "center",
  padding: 20,
  zIndex: 30
};

const modalCard = {
  width: "min(960px, 100%)",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#FFFFFF",
  borderRadius: 24,
  border: `1px solid ${cloudKitchenTheme.border}`,
  boxShadow: cloudKitchenTheme.shadow,
  padding: 22,
  display: "flex",
  flexDirection: "column",
  gap: 18
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start"
};

const modalTitle = {
  margin: 0,
  fontSize: 24,
  fontWeight: 800
};

const modalSubtitle = {
  margin: "6px 0 0",
  color: cloudKitchenTheme.textSecondary,
  fontSize: 13,
  lineHeight: 1.6
};

const closeButton = {
  ...ghostButton,
  height: 40
};

const modalGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14
};

const modalGridNarrow = {
  gridTemplateColumns: "1fr"
};

const field = {
  display: "flex",
  flexDirection: "column",
  gap: 8
};

const fieldCheckbox = {
  ...field,
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "end",
  gap: 10,
  minHeight: 44
};

const fieldLabel = {
  fontSize: 12,
  fontWeight: 700,
  color: cloudKitchenTheme.textSecondary,
  textTransform: "uppercase",
  letterSpacing: "0.08em"
};

const fieldInput = {
  minHeight: 44,
  borderRadius: 14,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  padding: "0 14px",
  fontSize: 14,
  outline: "none"
};

const imageUploader = {
  display: "grid",
  gridTemplateColumns: "120px minmax(0, 1fr)",
  gap: 14,
  alignItems: "start"
};

const imageUploaderNarrow = {
  gridTemplateColumns: "1fr"
};

const previewImage = {
  width: 120,
  height: 120,
  borderRadius: 18,
  objectFit: "cover"
};

const imageUploaderActions = {
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const uploadButton = {
  ...ghostButton,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "fit-content"
};

const stackSection = {
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 18,
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 12
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12
};

const sectionTitle = {
  fontSize: 15,
  fontWeight: 700
};

const stackRow = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 140px 110px auto",
  gap: 10,
  alignItems: "center"
};

const stackRowNarrow = {
  gridTemplateColumns: "1fr"
};

const stackCheckbox = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  color: cloudKitchenTheme.textSecondary,
  fontSize: 13
};

const tinyButton = {
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  color: "#111111",
  borderRadius: 12,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer"
};

const tinyDangerButton = {
  ...tinyButton,
  borderColor: "#FECACA",
  background: "#FEF2F2",
  color: "#B91C1C"
};

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10
};
