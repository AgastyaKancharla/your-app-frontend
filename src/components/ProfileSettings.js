import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import PageContainer from "./ui/PageContainer";
import { STAFF_ROLE_OPTIONS, formatRoleLabel } from "../access";
import API_URL from "../config/api";
import { useAuthStore } from "../store/authStore";
import { hasPermission } from "../utils/permissionEngine";

const initialRestaurantForm = {
  name: "",
  ownerName: "",
  email: "",
  phone: "",
  gstNumber: "",
  address: ""
};

const initialUserForm = {
  name: "",
  phone: ""
};

const initialNewUserForm = {
  name: "",
  email: "",
  phone: "",
  role: "CASHIER",
  password: ""
};

export default function ProfileSettings({
  user,
  restaurant,
  onRestaurantUpdated,
  onUserUpdated
}) {
  const rolePermissions = useAuthStore((state) => state.rolePermissions);
  const canManageSettings = hasPermission(user, "settings.manage", rolePermissions);
  const canManageStaff = hasPermission(user, "staff.update", rolePermissions);

  const [loading, setLoading] = useState(false);
  const [savingMyProfile, setSavingMyProfile] = useState(false);
  const [savingRestaurant, setSavingRestaurant] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState("");

  const [myProfileForm, setMyProfileForm] = useState(initialUserForm);
  const [restaurantForm, setRestaurantForm] = useState(initialRestaurantForm);
  const [users, setUsers] = useState([]);
  const [userEdits, setUserEdits] = useState({});
  const [newUserForm, setNewUserForm] = useState(initialNewUserForm);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (a.role === "OWNER" && b.role !== "OWNER") return -1;
      if (a.role !== "OWNER" && b.role === "OWNER") return 1;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [users]);

  const hydrateForms = useCallback((payload = {}) => {
    const nextProfile = payload.profile || user || {};
    const nextRestaurant = payload.restaurant || restaurant || {};
    const nextUsers = Array.isArray(payload.users) ? payload.users : [];

    setMyProfileForm({
      name: nextProfile.name || "",
      phone: nextProfile.phone || ""
    });

    setRestaurantForm({
      name: nextRestaurant.name || "",
      ownerName: nextRestaurant.ownerName || "",
      email: nextRestaurant.email || "",
      phone: nextRestaurant.phone || "",
      gstNumber: nextRestaurant.gstNumber || "",
      address: nextRestaurant.address || ""
    });

    setUsers(nextUsers);
    setUserEdits(
      nextUsers.reduce((acc, member) => {
        acc[member.id] = {
          role: member.role,
          isActive: member.isActive !== false,
          password: ""
        };
        return acc;
      }, {})
    );
  }, [restaurant, user]);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/profile`);
      hydrateForms(res.data || {});
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to load profile");
    } finally {
      setLoading(false);
    }
  }, [hydrateForms]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateMyProfileField = (event) => {
    const { name, value } = event.target;
    setMyProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateRestaurantField = (event) => {
    const { name, value } = event.target;
    setRestaurantForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateNewUserField = (event) => {
    const { name, value } = event.target;
    setNewUserForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateUserEditField = (userId, key, value) => {
    setUserEdits((prev) => ({
      ...prev,
      [userId]: {
        role: prev[userId]?.role || "CASHIER",
        isActive: prev[userId]?.isActive !== false,
        password: prev[userId]?.password || "",
        ...prev[userId],
        [key]: value
      }
    }));
  };

  const saveMyProfile = async () => {
    const name = myProfileForm.name.trim();
    const phone = myProfileForm.phone.trim();

    if (!name) {
      alert("Name is required");
      return;
    }

    try {
      setSavingMyProfile(true);
      const res = await axios.put(`${API_URL}/api/profile/me`, {
        name,
        phone
      });

      const nextProfile = res.data?.profile;
      if (nextProfile) {
        onUserUpdated?.(nextProfile);
      }

      alert(res.data?.message || "Profile updated");
      await loadProfile();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to update profile");
    } finally {
      setSavingMyProfile(false);
    }
  };

  const saveRestaurantProfile = async () => {
    const payload = {
      name: restaurantForm.name.trim(),
      ownerName: restaurantForm.ownerName.trim(),
      email: restaurantForm.email.trim().toLowerCase(),
      phone: restaurantForm.phone.trim(),
      gstNumber: restaurantForm.gstNumber.trim(),
      address: restaurantForm.address.trim()
    };

    if (!payload.name) {
      alert("Restaurant name is required");
      return;
    }

    try {
      setSavingRestaurant(true);
      const res = await axios.put(`${API_URL}/api/profile/restaurant`, payload);
      const nextRestaurant = res.data?.restaurant;
      if (nextRestaurant) {
        onRestaurantUpdated?.(nextRestaurant);
      }

      alert(res.data?.message || "Restaurant profile updated");
      await loadProfile();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to update restaurant profile");
    } finally {
      setSavingRestaurant(false);
    }
  };

  const createUser = async () => {
    const payload = {
      name: newUserForm.name.trim(),
      email: newUserForm.email.trim().toLowerCase(),
      phone: newUserForm.phone.trim(),
      role: newUserForm.role,
      password: newUserForm.password
    };

    if (!payload.name || !payload.email || !payload.password) {
      alert("Name, email and password are required");
      return;
    }

    try {
      setCreatingUser(true);
      const res = await axios.post(`${API_URL}/api/profile/users`, payload);
      alert(res.data?.message || "User created");
      setNewUserForm(initialNewUserForm);
      await loadProfile();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to create user");
    } finally {
      setCreatingUser(false);
    }
  };

  const saveUserAccess = async (member) => {
    const edits = userEdits[member.id] || {};

    try {
      setUpdatingUserId(member.id);
      const res = await axios.put(`${API_URL}/api/profile/users/${member.id}/access`, {
        role: edits.role,
        isActive: edits.isActive,
        password: edits.password || undefined
      });
      alert(res.data?.message || "User updated");
      await loadProfile();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to update user");
    } finally {
      setUpdatingUserId("");
    }
  };

  return (
    <PageContainer>
      <div style={header}>
        <h2 style={title}>Profile & Access</h2>
        <p style={subtitle}>
          Update account, restaurant details, and platform access for your team.
        </p>
      </div>

      {loading ? <p style={hint}>Loading profile...</p> : null}

      <section style={panel}>
        <h3 style={panelTitle}>My Profile</h3>
        <div style={formGrid}>
          <input
            name="name"
            placeholder="Your Name"
            value={myProfileForm.name}
            onChange={updateMyProfileField}
            style={input}
          />
          <input
            name="phone"
            placeholder="Phone"
            value={myProfileForm.phone}
            onChange={updateMyProfileField}
            style={input}
          />
          <button style={saveBtn} onClick={saveMyProfile} disabled={savingMyProfile}>
            {savingMyProfile ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </section>

      {canManageSettings ? (
        <section style={panel}>
          <h3 style={panelTitle}>Restaurant / Company Profile</h3>
          <div style={formGrid}>
            <input
              name="name"
              placeholder="Restaurant Name"
              value={restaurantForm.name}
              onChange={updateRestaurantField}
              style={input}
            />
            <input
              name="ownerName"
              placeholder="Owner / Company Contact Name"
              value={restaurantForm.ownerName}
              onChange={updateRestaurantField}
              style={input}
            />
            <input
              name="email"
              placeholder="Business Email"
              value={restaurantForm.email}
              onChange={updateRestaurantField}
              style={input}
            />
            <input
              name="phone"
              placeholder="Business Phone"
              value={restaurantForm.phone}
              onChange={updateRestaurantField}
              style={input}
            />
            <input
              name="gstNumber"
              placeholder="GST Number"
              value={restaurantForm.gstNumber}
              onChange={updateRestaurantField}
              style={input}
            />
            <input
              name="address"
              placeholder="Address"
              value={restaurantForm.address}
              onChange={updateRestaurantField}
              style={input}
            />
            <button style={saveBtn} onClick={saveRestaurantProfile} disabled={savingRestaurant}>
              {savingRestaurant ? "Saving..." : "Save Restaurant Profile"}
            </button>
          </div>
        </section>
      ) : null}

      {canManageStaff ? (
        <section style={panel}>
          <h3 style={panelTitle}>Create Team User</h3>
          <div style={formGrid}>
            <input
              name="name"
              placeholder="Name"
              value={newUserForm.name}
              onChange={updateNewUserField}
              style={input}
            />
            <input
              name="email"
              placeholder="Email"
              value={newUserForm.email}
              onChange={updateNewUserField}
              style={input}
            />
            <input
              name="phone"
              placeholder="Phone"
              value={newUserForm.phone}
              onChange={updateNewUserField}
              style={input}
            />
            <select
              name="role"
              value={newUserForm.role}
              onChange={updateNewUserField}
              style={input}
            >
              {STAFF_ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={newUserForm.password}
              onChange={updateNewUserField}
              style={input}
            />
            <button style={saveBtn} onClick={createUser} disabled={creatingUser}>
              {creatingUser ? "Creating..." : "Create User"}
            </button>
          </div>
        </section>
      ) : null}

      {canManageStaff ? (
        <section style={panel}>
          <h3 style={panelTitle}>Access Control</h3>
          {!sortedUsers.length ? (
            <p style={hint}>No users available.</p>
          ) : (
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Name</th>
                    <th style={th}>Email</th>
                    <th style={th}>Role</th>
                    <th style={th}>Status</th>
                    <th style={th}>Reset Password</th>
                    <th style={th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((member) => {
                    const edit = userEdits[member.id] || {
                      role: member.role,
                      isActive: member.isActive !== false,
                      password: ""
                    };

                    const isOwnerRow = member.role === "OWNER";

                    return (
                      <tr key={member.id}>
                        <td style={td}>{member.name}</td>
                        <td style={td}>{member.email}</td>
                        <td style={td}>
                          {isOwnerRow ? (
                            formatRoleLabel(member.role)
                          ) : (
                            <select
                              value={edit.role}
                              onChange={(event) =>
                                updateUserEditField(member.id, "role", event.target.value)
                              }
                              style={miniInput}
                            >
                              {STAFF_ROLE_OPTIONS.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td style={td}>
                          {isOwnerRow ? (
                            "Active"
                          ) : (
                            <button
                              style={toggleBtn}
                              onClick={() =>
                                updateUserEditField(member.id, "isActive", !edit.isActive)
                              }
                            >
                              {edit.isActive ? "Active" : "Inactive"}
                            </button>
                          )}
                        </td>
                        <td style={td}>
                          {isOwnerRow ? (
                            "-"
                          ) : (
                            <input
                              type="password"
                              placeholder="Optional"
                              value={edit.password}
                              onChange={(event) =>
                                updateUserEditField(member.id, "password", event.target.value)
                              }
                              style={miniInput}
                            />
                          )}
                        </td>
                        <td style={td}>
                          {isOwnerRow ? (
                            <span style={hint}>Owner</span>
                          ) : (
                            <button
                              style={saveRowBtn}
                              onClick={() => saveUserAccess(member)}
                              disabled={updatingUserId === member.id}
                            >
                              {updatingUserId === member.id ? "Saving..." : "Save"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </PageContainer>
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

const formGrid = {
  marginTop: 10,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 10
};

const input = {
  height: 38,
  borderRadius: 8,
  border: "1px solid #343949",
  background: "#0f1218",
  color: "#ecf1fa",
  padding: "0 10px",
  outline: 0
};

const saveBtn = {
  height: 38,
  border: 0,
  borderRadius: 8,
  background: "#38c98f",
  color: "#102519",
  fontWeight: 800,
  cursor: "pointer"
};

const tableWrap = {
  marginTop: 10,
  width: "100%",
  overflowX: "auto"
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 780
};

const th = {
  textAlign: "left",
  color: "#97a2bc",
  fontSize: 12,
  borderBottom: "1px solid #303547",
  padding: "10px 8px"
};

const td = {
  color: "#edf2fb",
  fontSize: 13,
  borderBottom: "1px solid #262b39",
  padding: "10px 8px"
};

const miniInput = {
  height: 30,
  borderRadius: 6,
  border: "1px solid #3c4256",
  background: "#0f1218",
  color: "#ecf1fa",
  padding: "0 8px",
  outline: 0
};

const toggleBtn = {
  height: 30,
  borderRadius: 6,
  border: "1px solid #3b4155",
  background: "#232838",
  color: "#d9e1f1",
  fontSize: 12,
  fontWeight: 700,
  padding: "0 10px",
  cursor: "pointer"
};

const saveRowBtn = {
  height: 30,
  borderRadius: 6,
  border: 0,
  background: "#f3c94f",
  color: "#2b2000",
  fontSize: 12,
  fontWeight: 700,
  padding: "0 12px",
  cursor: "pointer"
};

const hint = {
  margin: "10px 0 0",
  color: "#99a4bc",
  fontSize: 13
};
