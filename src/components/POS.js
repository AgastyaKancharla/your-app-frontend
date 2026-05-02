import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import API_URL from "../config/api";
import PermissionGuard from "./PermissionGuard";
import { useActivityStore } from "../store/activityStore";
import { useAuthStore } from "../store/authStore";
import { useInventoryStore } from "../store/inventoryStore";
import { createOrder } from "../store/orderActions";
import { useOrderStore } from "../store/orderStore";
import { useSettingsStore } from "../store/settingsStore";
import { cloudKitchenTheme } from "../theme";
import { calculateBill } from "../utils/calculateBill";
import { hasPermission } from "../utils/permissionEngine";
import {
  DEFAULT_MENU_IMAGE,
  deriveCategories,
  formatCurrency
} from "./cloud/cloudKitchenUtils";

const PAYMENT_METHODS = ["CASH", "UPI", "CARD"];
const ORDER_TYPES = ["DELIVERY", "TAKEAWAY"];

const DEMO_MENU_ITEMS = [
  {
    _id: "demo-paneer-bowl",
    __isDemo: true,
    name: "Paneer Tikka Rice Bowl",
    category: "Bowls",
    sellingPrice: 269,
    price: 269,
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
    tags: ["bestseller", "veg"],
    variants: [
      { name: "Regular", price: 269, isDefault: true },
      { name: "Large", price: 349 }
    ],
    addOns: [
      { name: "Extra Paneer", price: 59, isAvailable: true },
      { name: "Mint Chutney", price: 19, isAvailable: true }
    ],
    isActive: true,
    isAvailable: true,
    availability: "IN_STOCK",
    expectedPrepTimeMinutes: 14
  },
  {
    _id: "demo-butter-chicken",
    __isDemo: true,
    name: "Butter Chicken Meal",
    category: "Meals",
    sellingPrice: 329,
    price: 329,
    image:
      "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=80",
    tags: ["bestseller", "non-veg"],
    variants: [
      { name: "Classic", price: 329, isDefault: true },
      { name: "Double Curry", price: 419 }
    ],
    addOns: [
      { name: "Butter Naan", price: 45, isAvailable: true },
      { name: "Jeera Rice", price: 55, isAvailable: true }
    ],
    isActive: true,
    isAvailable: true,
    availability: "IN_STOCK",
    expectedPrepTimeMinutes: 18
  },
  {
    _id: "demo-smash-burger",
    __isDemo: true,
    name: "Smash Burger Combo",
    category: "Burgers",
    sellingPrice: 299,
    price: 299,
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
    tags: ["fast", "bestseller"],
    variants: [],
    addOns: [
      { name: "Cheese Slice", price: 35, isAvailable: true },
      { name: "Loaded Fries", price: 79, isAvailable: true }
    ],
    isActive: true,
    isAvailable: true,
    availability: "LOW_STOCK",
    expectedPrepTimeMinutes: 12
  },
  {
    _id: "demo-hakka-noodles",
    __isDemo: true,
    name: "Veg Hakka Noodles",
    category: "Noodles",
    sellingPrice: 219,
    price: 219,
    image:
      "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=900&q=80",
    tags: ["veg", "quick"],
    variants: [
      { name: "Regular", price: 219, isDefault: true },
      { name: "Spicy", price: 239 }
    ],
    addOns: [{ name: "Manchurian Gravy", price: 69, isAvailable: true }],
    isActive: true,
    isAvailable: true,
    availability: "IN_STOCK",
    expectedPrepTimeMinutes: 10
  },
  {
    _id: "demo-cold-coffee",
    __isDemo: true,
    name: "Cold Coffee",
    category: "Beverages",
    sellingPrice: 149,
    price: 149,
    image:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80",
    tags: ["cold", "add-on"],
    variants: [
      { name: "Medium", price: 149, isDefault: true },
      { name: "Large", price: 189 }
    ],
    addOns: [{ name: "Chocolate Shot", price: 25, isAvailable: true }],
    isActive: true,
    isAvailable: true,
    availability: "IN_STOCK",
    expectedPrepTimeMinutes: 6
  }
];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeTags = (value = []) => {
  const source = Array.isArray(value) ? value : String(value || "").split(",");
  return source.map((tag) => String(tag || "").trim().toLowerCase()).filter(Boolean);
};

const normalizeOptions = (options = []) =>
  Array.isArray(options)
    ? options
        .map((option) => ({
          name: String(option?.name || "").trim(),
          price: Math.max(0, toNumber(option?.price)),
          isDefault: Boolean(option?.isDefault),
          isAvailable: option?.isAvailable !== false
        }))
        .filter((option) => option.name)
    : [];

const normalizeMenuItem = (item = {}) => {
  const sellingPrice = Math.max(0, toNumber(item.sellingPrice ?? item.price));
  const availability = String(item.availability || "").trim().toUpperCase();

  return {
    ...item,
    _id: String(item._id || item.id || item.name || ""),
    name: String(item.name || "Menu item").trim(),
    category: String(item.category || "General").trim() || "General",
    sellingPrice,
    price: sellingPrice,
    image: String(item.image || "").trim() || DEFAULT_MENU_IMAGE,
    tags: normalizeTags(item.tags),
    variants: normalizeOptions(item.variants),
    addOns: normalizeOptions(item.addOns || item.addons),
    isActive: item.isActive !== false,
    isAvailable: item.isAvailable !== false && availability !== "OUT_OF_STOCK",
    availability: availability || (item.isAvailable === false ? "OUT_OF_STOCK" : "IN_STOCK"),
    expectedPrepTimeMinutes: Math.max(1, toNumber(item.expectedPrepTimeMinutes, 15))
  };
};

const getDefaultVariant = (item) => {
  if (!Array.isArray(item?.variants) || !item.variants.length) {
    return null;
  }

  return item.variants.find((variant) => variant.isDefault) || item.variants[0];
};

const buildLineKey = ({ itemId, variant, addOns }) => {
  const addOnKey = [...(addOns || [])]
    .map((addOn) => addOn.name)
    .sort()
    .join("|");
  return [itemId, variant?.name || "base", addOnKey].join("::");
};

const getUnitPrice = (item, variant, addOns = []) => {
  const basePrice = variant?.name ? toNumber(variant.price) : toNumber(item.sellingPrice ?? item.price);
  return basePrice + addOns.reduce((sum, addOn) => sum + toNumber(addOn.price), 0);
};

function useDebouncedValue(value, delay = 220) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
}

function useIsNarrow() {
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1120 : false
  );

  useEffect(() => {
    const sync = () => {
      setIsNarrow(window.innerWidth < 1120);
    };

    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return isNarrow;
}

export default function POS() {
  const isNarrow = useIsNarrow();
  const orders = useOrderStore((state) => state.orders);
  const addOrder = useOrderStore((state) => state.addOrder);
  const { reduceStock } = useInventoryStore();
  const { taxConfig } = useSettingsStore();
  const user = useAuthStore((state) => state.user);
  const rolePermissions = useAuthStore((state) => state.rolePermissions);
  const addLog = useActivityStore((state) => state.addLog);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiMessage, setApiMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [cart, setCart] = useState([]);
  const [isQuickOrder, setIsQuickOrder] = useState(true);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [orderType, setOrderType] = useState("DELIVERY");
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedVariantName, setSelectedVariantName] = useState("");
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const toggleQuickOrder = useCallback(() => {
    setIsQuickOrder((current) => !current);
  }, []);

  useEffect(() => {
    console.log("Orders:", orders);
  }, [orders]);

  const loadMenu = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/menu`);
      const nextItems = Array.isArray(response.data)
        ? response.data.map(normalizeMenuItem)
        : [];

      if (nextItems.length) {
        setMenuItems(nextItems);
        setApiMessage("");
      } else {
        setMenuItems(DEMO_MENU_ITEMS.map(normalizeMenuItem));
        setApiMessage("Sample menu is shown because the API returned no items.");
      }
    } catch (requestError) {
      setMenuItems(DEMO_MENU_ITEMS.map(normalizeMenuItem));
      setApiMessage(
        requestError.response?.data?.message || "Sample menu is shown while the API is unavailable."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const categories = useMemo(() => deriveCategories(menuItems), [menuItems]);

  const availableItems = useMemo(
    () => menuItems.filter((item) => item.isActive !== false),
    [menuItems]
  );

  const filteredItems = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    return availableItems.filter((item) => {
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) {
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
  }, [availableItems, debouncedSearch, selectedCategory]);

  const bestsellerItems = useMemo(() => {
    const tagged = availableItems.filter((item) => item.tags.includes("bestseller"));
    return (tagged.length ? tagged : availableItems).slice(0, 4);
  }, [availableItems]);

  const selectedVariant = useMemo(() => {
    if (!selectedItem?.variants?.length) {
      return null;
    }

    return (
      selectedItem.variants.find((variant) => variant.name === selectedVariantName) ||
      getDefaultVariant(selectedItem)
    );
  }, [selectedItem, selectedVariantName]);

  const selectedAddOnObjects = useMemo(() => {
    const selectedNames = new Set(selectedAddOns);
    return (selectedItem?.addOns || []).filter(
      (addOn) => addOn.isAvailable !== false && selectedNames.has(addOn.name)
    );
  }, [selectedAddOns, selectedItem?.addOns]);

  const cartTotals = useMemo(() => {
    const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
    const billItems = cart.map((line) => ({
      qty: line.quantity,
      price: line.unitPrice,
      gst: line.gst
    }));
    const { subtotal, tax, total } = calculateBill(billItems, taxConfig);

    return {
      subtotal,
      itemCount,
      tax,
      total
    };
  }, [cart, taxConfig]);

  const liveQueueOrders = useMemo(
    () => orders.filter((order) => order.status !== "completed").slice(0, 6),
    [orders]
  );

  const formatQueueStatus = (status = "") => {
    const normalized = String(status || "").trim().toLowerCase();
    if (!normalized) {
      return "new";
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const addConfiguredItem = useCallback((item, variant = null, addOns = []) => {
    if (!item?.isAvailable) {
      setError(`${item?.name || "Item"} is not available.`);
      return;
    }

    const unitPrice = getUnitPrice(item, variant, addOns);
    const itemTaxRate = toNumber(item.gst, Number.NaN);
    const key = buildLineKey({
      itemId: item._id,
      variant,
      addOns
    });

    setCart((current) => {
      const existing = current.find((line) => line.key === key);

      if (existing) {
        return current.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line
        );
      }

      return [
        ...current,
        {
          key,
          itemId: item._id,
          item,
          name: item.name,
          image: item.image,
          variant,
          addOns,
          unitPrice,
          gst: Number.isFinite(itemTaxRate) ? Math.max(0, itemTaxRate) : undefined,
          quantity: 1
        }
      ];
    });

    setNotice(`${item.name} added to cart.`);
    setError("");
  }, []);

  const handleItemClick = (item) => {
    if (!item.isAvailable) {
      setError(`${item.name} is currently unavailable.`);
      return;
    }

    const hasOptions = item.variants.length > 0 || item.addOns.some((addOn) => addOn.isAvailable);
    if (!hasOptions) {
      addConfiguredItem(item, null, []);
      return;
    }

    const defaultVariant = getDefaultVariant(item);
    setSelectedItem(item);
    setSelectedVariantName(defaultVariant?.name || "");
    setSelectedAddOns([]);
    setError("");
  };

  const updateQuantity = (key, delta) => {
    setCart((current) =>
      current
        .map((line) =>
          line.key === key
            ? {
                ...line,
                quantity: Math.max(0, line.quantity + delta)
              }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
    setCustomer({ name: "", phone: "" });
    setIsQuickOrder(true);
    setError("");
  };

  const handlePlaceOrder = async () => {
    if (!hasPermission(user, "pos.create", rolePermissions)) {
      setError("You do not have permission to create orders.");
      return;
    }

    if (!cart.length) {
      setError("Add at least one item to create an order.");
      return;
    }

    if (!isQuickOrder && !customer.name.trim() && !customer.phone.trim()) {
      setError("Add a customer name or phone, or use Quick Order.");
      return;
    }

    const order = createOrder(
      cart.map((line) => ({
        id: line.key,
        itemId: line.itemId,
        name: line.name,
        qty: line.quantity,
        price: line.unitPrice,
        gst: line.gst,
        image: line.image,
        variant: line.variant
          ? {
              name: line.variant.name,
              price: line.variant.price
            }
          : null,
        addOns: line.addOns.map((addOn) => ({
          name: addOn.name,
          price: addOn.price
        }))
      })),
      isQuickOrder
        ? {
            name: "",
            phone: ""
          }
        : {
            name: customer.name.trim(),
            phone: customer.phone.trim()
          },
      {
        payment: paymentMethod,
        type: orderType
      }
    );

    const orderPayload = {
      businessType: "CLOUD_KITCHEN",
      orderType,
      serviceType: orderType,
      paymentMode: paymentMethod,
      paymentMethod,
      customer: order.customer,
      taxAmount: order.tax,
      gstTotal: order.gst,
      discount: 0,
      orderChannel: orderType === "TAKEAWAY" ? "WALK_IN" : "DIRECT",
      platform: "POS",
      items: cart.map((line) => ({
        menuItemId: line.itemId,
        menuId: line.itemId,
        name: line.name,
        displayName: line.variant?.name ? `${line.name} (${line.variant.name})` : line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        price: line.unitPrice,
        gstPercentage: line.gst,
        image: line.image,
        variant: line.variant
          ? {
              name: line.variant.name,
              price: line.variant.price
            }
          : null,
        addOns: line.addOns.map((addOn) => ({
          name: addOn.name,
          price: addOn.price
        }))
      }))
    };

    try {
      setPlacingOrder(true);
      setError("");
      const response = await axios.post(`${API_URL}/api/orders`, orderPayload);
      const savedOrder = response.data || order;
      addOrder(savedOrder);
      cart.forEach((line) => {
        reduceStock(line.itemId, line.quantity);
      });
      addLog({
        userId: user?.id || user?._id || "",
        userName: user?.name || "User",
        action: "Order created",
        module: "POS",
        metadata: {
          orderId: savedOrder.invoiceNumber || savedOrder.orderId || order.orderId,
          total: savedOrder.totalAmount || savedOrder.grandTotal || order.total
        }
      });
      setNotice(`Order ${savedOrder.invoiceNumber || savedOrder.orderId || order.orderId} created.`);
      clearCart();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const pageStyle = {
    ...page,
    gridTemplateColumns: isNarrow ? "1fr" : "minmax(0, 1fr) 390px"
  };
  const filterBarStyle = {
    ...filterBar,
    gridTemplateColumns: isNarrow ? "1fr" : filterBar.gridTemplateColumns
  };
  const cartPanelStyle = {
    ...cartPanel,
    position: isNarrow ? "static" : "sticky",
    top: isNarrow ? "auto" : 12
  };

  return (
    <div style={pageStyle}>
      <section style={menuSection}>
        <div style={header}>
          <div>
            <h1 style={title}>New Order</h1>
            <p style={subtitle}>Cloud kitchen POS</p>
          </div>
          <div style={livePill}>{liveQueueOrders.length} live</div>
        </div>

        {apiMessage ? <div style={infoBanner}>{apiMessage}</div> : null}
        {notice ? <div style={successBanner}>{notice}</div> : null}
        {error ? <div style={errorBanner}>{error}</div> : null}

        <div style={filterBarStyle}>
          <div style={categoryTabs}>
            {categories.map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  style={{
                    ...tabButton,
                    ...(active ? activeTabButton : null)
                  }}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category === "ALL" ? "All" : category}
                </button>
              );
            })}
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search menu"
            style={searchInput}
          />
        </div>

        <section style={bestsellerSection}>
          <div style={sectionHeader}>
            <h2 style={sectionTitle}>Bestsellers</h2>
            <span style={mutedText}>{bestsellerItems.length} items</span>
          </div>
          <div style={bestsellerGrid}>
            {bestsellerItems.map((item) => (
              <button
                key={`best-${item._id}`}
                type="button"
                style={bestsellerCard}
                onClick={() => handleItemClick(item)}
                disabled={!item.isAvailable}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  style={bestsellerImage}
                  onError={(event) => {
                    event.currentTarget.src = DEFAULT_MENU_IMAGE;
                  }}
                />
                <span style={bestsellerName}>{item.name}</span>
                <span style={bestsellerPrice}>{formatCurrency(item.sellingPrice)}</span>
              </button>
            ))}
          </div>
        </section>

        <section style={itemsSection}>
          <div style={sectionHeader}>
            <h2 style={sectionTitle}>Menu Items</h2>
            <span style={mutedText}>
              {loading ? "Loading" : `${filteredItems.length} available`}
            </span>
          </div>

          <div style={itemGrid}>
            {loading ? (
              <div style={emptyState}>Loading menu...</div>
            ) : filteredItems.length ? (
              filteredItems.map((item) => (
                <MenuCard key={item._id} item={item} onClick={() => handleItemClick(item)} />
              ))
            ) : (
              <div style={emptyState}>No menu items match the current filters.</div>
            )}
          </div>
        </section>
      </section>

      <aside style={cartPanelStyle} className="cart-container">
        <div style={cartHeader}>
          <div>
            <h2 style={cartTitle}>Cart</h2>
            <p style={cartSubtitle}>{cartTotals.itemCount} items</p>
          </div>
          <button type="button" style={clearButton} onClick={clearCart} disabled={!cart.length}>
            Clear
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Quick Order (No Customer)</p>
            <Checkbox checked={isQuickOrder} onChange={toggleQuickOrder} />
          </div>

          {!isQuickOrder ? (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Customer name"
                value={customer.name}
                onChange={(event) =>
                  setCustomer((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full p-2 border rounded-md"
              />
              <input
                type="text"
                placeholder="Phone"
                value={customer.phone}
                onChange={(event) =>
                  setCustomer((current) => ({ ...current, phone: event.target.value }))
                }
                className="w-full p-2 border rounded-md"
                inputMode="tel"
              />
            </div>
          ) : null}
        </div>

        <div style={cartItems} className="cart-body">
          {cart.length ? (
            cart.map((line) => (
              <CartLine
                key={line.key}
                line={line}
                onDecrease={() => updateQuantity(line.key, -1)}
                onIncrease={() => updateQuantity(line.key, 1)}
              />
            ))
          ) : (
            <div style={cartEmpty}>Click menu items to build the order.</div>
          )}
        </div>

        <div style={pricingBox}>
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{cartTotals.subtotal.toFixed(2)}</span>
          </div>

          {taxConfig.taxMode !== "disabled" && taxConfig.showTaxBreakdown ? (
            <div className="flex justify-between">
              <span>{taxConfig.taxName}</span>
              <span>₹{cartTotals.tax.toFixed(2)}</span>
            </div>
          ) : null}

          <div style={totalRow}>
            <span>Total</span>
            <strong>₹{cartTotals.total.toFixed(2)}</strong>
          </div>
        </div>

        <div style={checkoutControls}>
          <SegmentedControl
            label="Payment"
            options={PAYMENT_METHODS}
            value={paymentMethod}
            onChange={setPaymentMethod}
          />
          <SegmentedControl
            label="Order Type"
            options={ORDER_TYPES}
            value={orderType}
            onChange={setOrderType}
          />
          <PermissionGuard permission="pos.create">
            <button
              type="button"
              style={{
                ...placeOrderButton,
                ...(!cart.length || placingOrder ? disabledButton : null)
              }}
              onClick={handlePlaceOrder}
              disabled={!cart.length || placingOrder}
            >
              {placingOrder ? "Placing..." : "Place Order"}
            </button>
          </PermissionGuard>
        </div>

        <div style={recentBox}>
          <div style={recentHeader}>Live Queue</div>
          {liveQueueOrders.length ? (
            liveQueueOrders.map((order) => (
              <div key={order.id} className="p-2 border rounded-md" style={recentOrderRow}>
                <div className="flex justify-between">
                  <p className="font-medium">{order.orderId}</p>
                  <span className={`status ${order.status}`}>{formatQueueStatus(order.status)}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {(Array.isArray(order.items) ? order.items.length : 0)} items • ₹
                  {toNumber(order.total).toFixed(2)}
                </p>
              </div>
            ))
          ) : (
            <div style={recentEmpty}>No live orders yet.</div>
          )}
        </div>
      </aside>

      {selectedItem ? (
        <div style={modalBackdrop} onClick={() => setSelectedItem(null)}>
          <div style={optionModal} onClick={(event) => event.stopPropagation()}>
            <div style={modalTop}>
              <div>
                <h2 style={modalTitle}>{selectedItem.name}</h2>
                <p style={modalSubtitle}>{formatCurrency(getUnitPrice(selectedItem, selectedVariant, selectedAddOnObjects))}</p>
              </div>
              <button type="button" style={clearButton} onClick={() => setSelectedItem(null)}>
                Close
              </button>
            </div>

            {selectedItem.variants.length ? (
              <div style={optionGroup}>
                <div style={optionLabel}>Variant</div>
                <div style={optionGrid}>
                  {selectedItem.variants.map((variant) => {
                    const active = selectedVariant?.name === variant.name;
                    return (
                      <button
                        key={variant.name}
                        type="button"
                        style={{
                          ...optionButton,
                          ...(active ? activeOptionButton : null)
                        }}
                        onClick={() => setSelectedVariantName(variant.name)}
                      >
                        <span>{variant.name}</span>
                        <strong>{formatCurrency(variant.price)}</strong>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {selectedItem.addOns.some((addOn) => addOn.isAvailable) ? (
              <div style={optionGroup}>
                <div style={optionLabel}>Add-ons</div>
                <div style={optionGrid}>
                  {selectedItem.addOns
                    .filter((addOn) => addOn.isAvailable)
                    .map((addOn) => {
                      const active = selectedAddOns.includes(addOn.name);
                      return (
                        <button
                          key={addOn.name}
                          type="button"
                          style={{
                            ...optionButton,
                            ...(active ? activeOptionButton : null)
                          }}
                          onClick={() =>
                            setSelectedAddOns((current) =>
                              current.includes(addOn.name)
                                ? current.filter((name) => name !== addOn.name)
                                : [...current, addOn.name]
                            )
                          }
                        >
                          <span>{addOn.name}</span>
                          <strong>{formatCurrency(addOn.price)}</strong>
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              style={placeOrderButton}
              onClick={() => {
                addConfiguredItem(selectedItem, selectedVariant, selectedAddOnObjects);
                setSelectedItem(null);
              }}
            >
              Add to Cart
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuCard({ item, onClick }) {
  const disabled = !item.isAvailable;

  return (
    <button
      type="button"
      style={{
        ...itemCard,
        ...(disabled ? disabledCard : null)
      }}
      onClick={onClick}
      disabled={disabled}
    >
      <img
        src={item.image}
        alt={item.name}
        style={itemImage}
        onError={(event) => {
          event.currentTarget.src = DEFAULT_MENU_IMAGE;
        }}
      />
      <span style={itemCardBody}>
        <span style={itemCardTop}>
          <span style={itemCardName}>{item.name}</span>
          <strong style={itemCardPrice}>{formatCurrency(item.sellingPrice)}</strong>
        </span>
        <span style={tagRow}>
          {item.tags.slice(0, 3).map((tag) => (
            <span key={`${item._id}-${tag}`} style={tagPill}>
              {tag}
            </span>
          ))}
          {item.variants.length ? <span style={tagPill}>{item.variants.length} variants</span> : null}
        </span>
      </span>
    </button>
  );
}

function CartLine({ line, onDecrease, onIncrease }) {
  return (
    <div style={cartLine}>
      <img
        src={line.image || DEFAULT_MENU_IMAGE}
        alt={line.name}
        style={cartImage}
        onError={(event) => {
          event.currentTarget.src = DEFAULT_MENU_IMAGE;
        }}
      />
      <div style={cartLineBody}>
        <div style={cartLineTop}>
          <strong style={cartLineName}>{line.name}</strong>
          <span style={cartLinePrice}>{formatCurrency(line.unitPrice * line.quantity)}</span>
        </div>
        <div style={lineMeta}>
          {line.variant?.name ? <span>{line.variant.name}</span> : <span>Base</span>}
          {line.addOns.length ? <span>{line.addOns.map((addOn) => addOn.name).join(", ")}</span> : null}
        </div>
        <div style={qtyControls}>
          <button type="button" style={qtyButton} onClick={onDecrease}>
            -
          </button>
          <span style={qtyValue}>{line.quantity}</span>
          <button type="button" style={qtyButton} onClick={onIncrease}>
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
    />
  );
}

function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div style={segmentBlock}>
      <div style={segmentLabel}>{label}</div>
      <div
        style={{
          ...segmentGroup,
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`
        }}
      >
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              style={{
                ...segmentButton,
                ...(active ? activeSegmentButton : null)
              }}
              onClick={() => onChange(option)}
            >
              {option.charAt(0) + option.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const page = {
  display: "grid",
  gap: 18,
  alignItems: "start",
  color: cloudKitchenTheme.textPrimary,
  background: "#FFFFFF"
};

const menuSection = {
  display: "grid",
  gap: 16,
  minWidth: 0
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "center",
  flexWrap: "wrap"
};

const title = {
  margin: 0,
  fontSize: 30,
  lineHeight: 1.15,
  fontWeight: 800,
  letterSpacing: 0
};

const subtitle = {
  margin: "6px 0 0",
  color: cloudKitchenTheme.textSecondary,
  fontSize: 14
};

const livePill = {
  height: 36,
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 8,
  padding: "0 12px",
  background: "#F3F4F6",
  border: `1px solid ${cloudKitchenTheme.border}`,
  fontSize: 13,
  fontWeight: 700
};

const filterBar = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 320px)",
  gap: 12,
  alignItems: "center"
};

const categoryTabs = {
  display: "flex",
  gap: 8,
  overflowX: "auto",
  paddingBottom: 2
};

const tabButton = {
  height: 40,
  borderRadius: 8,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  color: "#111111",
  padding: "0 14px",
  fontWeight: 700,
  whiteSpace: "nowrap",
  cursor: "pointer"
};

const activeTabButton = {
  background: "#111111",
  color: "#FFFFFF",
  borderColor: "#111111"
};

const searchInput = {
  height: 44,
  borderRadius: 8,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  padding: "0 14px",
  fontSize: 14,
  outline: "none"
};

const bestsellerSection = {
  display: "grid",
  gap: 10
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center"
};

const sectionTitle = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800
};

const mutedText = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 13,
  fontWeight: 600
};

const bestsellerGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12
};

const bestsellerCard = {
  minHeight: 104,
  display: "grid",
  gridTemplateColumns: "72px minmax(0, 1fr)",
  gridTemplateRows: "1fr auto",
  gap: "6px 10px",
  alignItems: "center",
  textAlign: "left",
  borderRadius: 8,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  padding: 10,
  cursor: "pointer"
};

const bestsellerImage = {
  gridRow: "1 / 3",
  width: 72,
  height: 72,
  borderRadius: 8,
  objectFit: "cover"
};

const bestsellerName = {
  minWidth: 0,
  color: "#111111",
  fontSize: 14,
  fontWeight: 800,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

const bestsellerPrice = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 13,
  fontWeight: 700
};

const itemsSection = {
  display: "grid",
  gap: 12
};

const itemGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14
};

const itemCard = {
  minHeight: 288,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  borderRadius: 8,
  overflow: "hidden",
  textAlign: "left",
  padding: 0,
  cursor: "pointer",
  display: "flex",
  flexDirection: "column"
};

const disabledCard = {
  opacity: 0.55,
  cursor: "not-allowed"
};

const itemImage = {
  width: "100%",
  aspectRatio: "4 / 3",
  objectFit: "cover",
  display: "block",
  background: "#F3F4F6"
};

const itemCardBody = {
  display: "grid",
  gap: 12,
  padding: 12
};

const itemCardTop = {
  display: "grid",
  gap: 8
};

const itemCardName = {
  color: "#111111",
  fontSize: 15,
  fontWeight: 800,
  lineHeight: 1.3
};

const itemCardPrice = {
  color: "#111111",
  fontSize: 14
};

const tagRow = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap"
};

const tagPill = {
  borderRadius: 8,
  background: "#F3F4F6",
  color: "#111111",
  padding: "5px 8px",
  fontSize: 11,
  fontWeight: 700
};

const cartPanel = {
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 8,
  background: "#FFFFFF",
  boxShadow: cloudKitchenTheme.shadow,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12
};

const cartHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12
};

const cartTitle = {
  margin: 0,
  fontSize: 22,
  fontWeight: 800
};

const cartSubtitle = {
  margin: "4px 0 0",
  color: cloudKitchenTheme.textSecondary,
  fontSize: 13
};

const clearButton = {
  height: 36,
  borderRadius: 8,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  color: "#111111",
  padding: "0 12px",
  fontWeight: 700,
  cursor: "pointer"
};

const cartItems = {
  display: "grid",
  gap: 10,
  minHeight: 280,
  maxHeight: 360,
  overflowY: "auto",
  paddingRight: 2
};

const cartLine = {
  display: "grid",
  gridTemplateColumns: "56px minmax(0, 1fr)",
  gap: 10,
  padding: 10,
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 8
};

const cartImage = {
  width: 56,
  height: 56,
  borderRadius: 8,
  objectFit: "cover"
};

const cartLineBody = {
  minWidth: 0,
  display: "grid",
  gap: 8
};

const cartLineTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8
};

const cartLineName = {
  minWidth: 0,
  fontSize: 13,
  color: "#111111"
};

const cartLinePrice = {
  flex: "0 0 auto",
  color: "#111111",
  fontSize: 13,
  fontWeight: 800
};

const lineMeta = {
  display: "grid",
  gap: 2,
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12
};

const qtyControls = {
  display: "inline-grid",
  gridTemplateColumns: "30px 34px 30px",
  alignItems: "center",
  justifySelf: "start",
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 8,
  overflow: "hidden"
};

const qtyButton = {
  width: 30,
  height: 30,
  border: 0,
  background: "#FFFFFF",
  color: "#111111",
  fontSize: 17,
  cursor: "pointer"
};

const qtyValue = {
  height: 30,
  display: "grid",
  placeItems: "center",
  borderLeft: `1px solid ${cloudKitchenTheme.border}`,
  borderRight: `1px solid ${cloudKitchenTheme.border}`,
  fontSize: 13,
  fontWeight: 800
};

const cartEmpty = {
  border: `1px dashed ${cloudKitchenTheme.border}`,
  borderRadius: 8,
  padding: 18,
  textAlign: "center",
  color: cloudKitchenTheme.textSecondary,
  fontSize: 13
};

const pricingBox = {
  display: "grid",
  gap: 8,
  borderTop: `1px solid ${cloudKitchenTheme.border}`,
  paddingTop: 12
};

const totalRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  color: "#111111",
  fontSize: 18,
  fontWeight: 800,
  paddingTop: 8,
  borderTop: `1px solid ${cloudKitchenTheme.border}`
};

const checkoutControls = {
  display: "grid",
  gap: 12
};

const segmentBlock = {
  display: "grid",
  gap: 8
};

const segmentLabel = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 0
};

const segmentGroup = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 8
};

const segmentButton = {
  minHeight: 40,
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 8,
  background: "#FFFFFF",
  color: "#111111",
  fontWeight: 800,
  cursor: "pointer"
};

const activeSegmentButton = {
  background: "#111111",
  color: "#FFFFFF",
  borderColor: "#111111"
};

const placeOrderButton = {
  minHeight: 46,
  border: 0,
  borderRadius: 8,
  background: "#111111",
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: 800,
  cursor: "pointer"
};

const disabledButton = {
  opacity: 0.5,
  cursor: "not-allowed"
};

const recentBox = {
  display: "grid",
  gap: 8,
  borderTop: `1px solid ${cloudKitchenTheme.border}`,
  paddingTop: 12
};

const recentHeader = {
  color: "#111111",
  fontSize: 13,
  fontWeight: 800
};

const recentOrderRow = {
  display: "grid",
  gap: 6,
  borderRadius: 8,
  background: "#F9FAFB",
  padding: "9px 10px",
  fontSize: 12
};

const recentEmpty = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12
};

const infoBanner = {
  borderRadius: 8,
  padding: "10px 12px",
  background: "#F9FAFB",
  border: `1px solid ${cloudKitchenTheme.border}`,
  color: cloudKitchenTheme.textSecondary,
  fontSize: 13
};

const successBanner = {
  borderRadius: 8,
  padding: "10px 12px",
  background: "#ECFDF5",
  border: "1px solid #BBF7D0",
  color: "#166534",
  fontSize: 13
};

const errorBanner = {
  borderRadius: 8,
  padding: "10px 12px",
  background: "#FEF2F2",
  border: "1px solid #FECACA",
  color: "#991B1B",
  fontSize: 13
};

const emptyState = {
  gridColumn: "1 / -1",
  border: `1px dashed ${cloudKitchenTheme.border}`,
  borderRadius: 8,
  padding: 24,
  color: cloudKitchenTheme.textSecondary,
  textAlign: "center"
};

const modalBackdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(17, 24, 39, 0.35)",
  display: "grid",
  placeItems: "center",
  padding: 18,
  zIndex: 50
};

const optionModal = {
  width: "min(620px, 100%)",
  maxHeight: "92vh",
  overflowY: "auto",
  background: "#FFFFFF",
  borderRadius: 8,
  border: `1px solid ${cloudKitchenTheme.border}`,
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.22)",
  padding: 18,
  display: "grid",
  gap: 16
};

const modalTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start"
};

const modalTitle = {
  margin: 0,
  fontSize: 22,
  fontWeight: 800
};

const modalSubtitle = {
  margin: "6px 0 0",
  color: cloudKitchenTheme.textSecondary,
  fontSize: 14,
  fontWeight: 700
};

const optionGroup = {
  display: "grid",
  gap: 10
};

const optionLabel = {
  fontSize: 12,
  fontWeight: 800,
  color: cloudKitchenTheme.textSecondary,
  textTransform: "uppercase",
  letterSpacing: 0
};

const optionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10
};

const optionButton = {
  minHeight: 56,
  borderRadius: 8,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  color: "#111111",
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  padding: "0 12px",
  cursor: "pointer",
  fontWeight: 700,
  textAlign: "left"
};

const activeOptionButton = {
  background: "#111111",
  color: "#FFFFFF",
  borderColor: "#111111"
};
