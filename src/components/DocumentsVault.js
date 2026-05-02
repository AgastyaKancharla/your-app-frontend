import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PageContainer from "./ui/PageContainer";
import API_URL from "../config/api";

const readableSize = (size) => {
  const value = Number(size || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export default function DocumentsVault() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/documents`);
      setDocuments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please choose a file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("title", title.trim());

    try {
      setUploading(true);
      await axios.post(`${API_URL}/api/documents`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setTitle("");
      setSelectedFile(null);
      setFileInputKey((prev) => prev + 1);
      await loadDocuments();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await axios.get(`${API_URL}/api/documents/${doc._id}/download`, {
        responseType: "blob"
      });

      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = doc.originalName || `${doc.title || "document"}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to download document");
    }
  };

  const handleDelete = async (doc) => {
    const confirmed = window.confirm(`Delete "${doc.title}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/documents/${doc._id}`);
      await loadDocuments();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to delete document");
    }
  };

  const stats = useMemo(() => {
    const totalFiles = documents.length;
    const totalSize = documents.reduce((sum, doc) => sum + Number(doc.size || 0), 0);
    return {
      totalFiles,
      totalSize
    };
  }, [documents]);

  return (
    <PageContainer>
      <div style={header}>
        <div>
          <h2 style={titleStyle}>Documents Vault</h2>
          <p style={subtitle}>
            Store restaurant docs, Excel sheets, POS files and keep everything in one place.
          </p>
        </div>
      </div>

      <section style={panel}>
        <h3 style={panelTitle}>Upload New Document</h3>
        <div style={uploadGrid}>
          <input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={input}
          />
          <input
            key={fileInputKey}
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            style={fileInput}
          />
          <button style={uploadBtn} onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload File"}
          </button>
        </div>
        <p style={hintText}>
          Allowed: PDF, DOC, XLS, CSV, TXT, PNG, JPG, WEBP. Max file size: 20MB.
        </p>
      </section>

      <section style={statsRow}>
        <div style={statCard}>
          <div style={statLabel}>Total Files</div>
          <div style={statValue}>{stats.totalFiles}</div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>Storage Used</div>
          <div style={statValue}>{readableSize(stats.totalSize)}</div>
        </div>
      </section>

      <section style={panel}>
        <div style={listHeader}>
          <h3 style={panelTitle}>Saved Documents</h3>
          {loading ? <span style={loadingText}>Loading...</span> : null}
        </div>

        {!documents.length ? (
          <p style={emptyText}>No documents yet. Upload your first file.</p>
        ) : (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Title</th>
                  <th style={th}>Original File</th>
                  <th style={th}>Size</th>
                  <th style={th}>Uploaded</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc._id}>
                    <td style={td}>{doc.title || "-"}</td>
                    <td style={td}>{doc.originalName || "-"}</td>
                    <td style={td}>{readableSize(doc.size)}</td>
                    <td style={td}>{formatDate(doc.createdAt)}</td>
                    <td style={td}>
                      <div style={actionRow}>
                        <button style={actionBtn} onClick={() => handleDownload(doc)}>
                          Download
                        </button>
                        <button
                          style={{ ...actionBtn, ...deleteBtn }}
                          onClick={() => handleDelete(doc)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageContainer>
  );
}

const header = {
  marginBottom: 12
};

const titleStyle = {
  margin: 0,
  color: "#f2f6fd",
  fontSize: 30
};

const subtitle = {
  margin: "6px 0 0",
  color: "#9da7bf",
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
  color: "#edf1fa",
  fontSize: 18
};

const uploadGrid = {
  marginTop: 10,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  alignItems: "center"
};

const input = {
  height: 38,
  borderRadius: 8,
  border: "1px solid #343949",
  background: "#0f1219",
  color: "#eef2fb",
  padding: "0 10px",
  outline: 0
};

const fileInput = {
  ...input,
  padding: "7px 10px"
};

const uploadBtn = {
  height: 38,
  border: 0,
  borderRadius: 8,
  background: "#38c98f",
  color: "#13281d",
  fontWeight: 800,
  cursor: "pointer"
};

const hintText = {
  margin: "10px 0 0",
  color: "#97a1b8",
  fontSize: 12
};

const statsRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  marginBottom: 12
};

const statCard = {
  border: "1px solid #2e3240",
  background: "#171b24",
  borderRadius: 12,
  padding: 12
};

const statLabel = {
  color: "#97a2bb",
  fontSize: 12
};

const statValue = {
  marginTop: 6,
  color: "#f1f5fc",
  fontSize: 24,
  fontWeight: 800
};

const listHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: 8
};

const loadingText = {
  color: "#98a3be",
  fontSize: 12
};

const emptyText = {
  color: "#9ba5be",
  margin: 0
};

const tableWrap = {
  width: "100%",
  overflowX: "auto"
};

const table = {
  width: "100%",
  minWidth: 680,
  borderCollapse: "collapse"
};

const th = {
  textAlign: "left",
  color: "#98a4bf",
  fontSize: 12,
  borderBottom: "1px solid #313648",
  padding: "10px 8px"
};

const td = {
  color: "#edf1f9",
  fontSize: 13,
  borderBottom: "1px solid #272b39",
  padding: "10px 8px"
};

const actionRow = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
};

const actionBtn = {
  height: 28,
  borderRadius: 6,
  border: "1px solid #3a4257",
  background: "#232838",
  color: "#dce3f4",
  fontSize: 12,
  fontWeight: 700,
  padding: "0 10px",
  cursor: "pointer"
};

const deleteBtn = {
  borderColor: "#644550",
  background: "#39242c",
  color: "#ffd4dc"
};
