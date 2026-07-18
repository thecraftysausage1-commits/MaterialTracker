require("dotenv").config();

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors");

const loyverse = require("./services/loyverse");

const { askAI } = require("./services/ai");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "Database", "Materialtracker_working.db");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
    } else {
        db.run("PRAGMA journal_mode=WAL", (pragmaErr) => {
            if (pragmaErr) {
                console.warn("PRAGMA journal_mode=WAL failed:", pragmaErr.message);
            }
        });
        console.log(`✅ Connected to SQLite database at ${DB_PATH}`);
    }
});

function runWithRetry(query, params, callback, attempts = 3) {
    const tryRun = (attempt) => {
        db.run(query, params, function (err) {
            if (err && err.code === "SQLITE_BUSY" && attempt < attempts) {
                setTimeout(() => tryRun(attempt + 1), 250);
                return;
            }
            callback.call(this, err);
        });
    };
    tryRun(1);
}

function allWithRetry(query, params, callback, attempts = 3) {
    const tryRun = (attempt) => {
        db.all(query, params, (err, rows) => {
            if (err && err.code === "SQLITE_BUSY" && attempt < attempts) {
                setTimeout(() => tryRun(attempt + 1), 250);
                return;
            }
            callback(err, rows);
        });
    };
    tryRun(1);
}

function getWithRetry(query, params, callback, attempts = 3) {
    const tryRun = (attempt) => {
        db.get(query, params, (err, row) => {
            if (err && err.code === "SQLITE_BUSY" && attempt < attempts) {
                setTimeout(() => tryRun(attempt + 1), 250);
                return;
            }
            callback(err, row);
        });
    };
    tryRun(1);
}

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Material Tracker API is running!"
    });
});

// =========================
// LOYVERSE API
// =========================
app.get("/api/loyverse/items", async (req, res) => {
    try {
        const response = await loyverse.get("/items");
        res.json(response.data);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({
            success: false,
            error: err.response?.data || err.message
        });
    }
});

// =========================
// MATERIALS API
// =========================
app.get("/api/materials", (req, res) => {
});

app.post("/api/materials", (req, res) => {
    const payload = req.body || {};
    const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const material = {
        MaterialName: payload.name || payload.MaterialName || "Unnamed Material",
        Manufacturer: payload.manufacturer || payload.Manufacturer || "",
        Colour: payload.colour || payload.Colour || "",
        MaterialType: payload.type || payload.MaterialType || "Custom",
        Diameter: payload.applicationType === "Filament" ? (payload.diameter || payload.Diameter || null) : null,
        Thickness: payload.applicationType === "Laser Cutter Material" ? (payload.thickness || payload.Thickness || null) : null,
        Width: payload.applicationType === "Laser Cutter Material" ? (payload.width || payload.Width || null) : null,
        Length: payload.applicationType === "Laser Cutter Material" ? (payload.length || payload.Length || null) : null,
        Weight: payload.applicationType === "Filament" ? (payload.weight || payload.Weight || null) : null,
        Unit: payload.unit || payload.Unit || "kg",
        CurrentStock: payload.currentStock ?? payload.quantity ?? payload.CurrentStock ?? 0,
        MinimumStock: payload.minimumStock ?? payload.MinimumStock ?? 0,
        Barcode: payload.barcode || payload.Barcode || `BAR-${uniqueSuffix}`,
        QRCode: payload.qrCode || payload.QRCode || `QR-${uniqueSuffix}`,
        Notes: payload.notes || payload.Notes || "",
        Created: new Date().toISOString()
    };

    runWithRetry(
        `INSERT INTO Materials (MaterialName, Manufacturer, Colour, MaterialType, Diameter, Thickness, Width, Length, Weight, Unit, CurrentStock, MinimumStock, Barcode, QRCode, Notes, Created)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            material.MaterialName,
            material.Manufacturer,
            material.Colour,
            material.MaterialType,
            material.Diameter,
            material.Thickness,
            material.Width,
            material.Length,
            material.Weight,
            material.Unit,
            material.CurrentStock,
            material.MinimumStock,
            material.Barcode,
            material.QRCode,
            material.Notes,
            material.Created
        ],
        function (err) {
            if (err) {
                console.error("Insert material failed:", err.message);
                return res.status(500).json({ success: false, error: err.message });
            }
            res.json({ success: true, materialId: this.lastID });
        }
    );
});

app.get("/api/machines", (req, res) => {
    allWithRetry("SELECT * FROM Machines ORDER BY MachineID DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json(rows);
    });
});

app.post("/api/machines", (req, res) => {
    const payload = req.body || {};
    const machineName = payload.machineName || payload.name || `${(payload.manufacturer || "").trim()} ${(payload.model || "").trim()}`.trim() || "Unnamed Machine";
    runWithRetry(
        `INSERT INTO Machines (MachineName, MachineType, Manufacturer, Model, SerialNumber, Status, PurchaseDate, LastMaintenance, Notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            machineName,
            payload.type || payload.machineType || "3D Printer",
            payload.manufacturer || "",
            payload.model || "",
            payload.serial || payload.serialNumber || "",
            payload.status || "Online",
            payload.purchaseDate || null,
            payload.lastMaintenance || null,
            payload.notes || ""
        ],
        function (err) {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, machineId: this.lastID });
        }
    );
});

app.get("/api/projects", (req, res) => {
    allWithRetry("SELECT * FROM Projects ORDER BY ProjectID DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json(rows);
    });
});

app.post("/api/projects", (req, res) => {
    const payload = req.body || {};
    runWithRetry(
        `INSERT INTO Projects (ProjectName, Description, StartDate, EndDate, Status) VALUES (?, ?, ?, ?, ?)`,
        [
            payload.name || payload.projectName || "Unnamed Project",
            payload.description || `${payload.owner || ""} | ${payload.materials || ""}`.trim(),
            payload.startDate || null,
            payload.endDate || null,
            payload.status || "Active"
        ],
        function (err) {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, projectId: this.lastID });
        }
    );
});

app.get("/api/categories", (req, res) => {
    allWithRetry("SELECT * FROM Categories ORDER BY CategoryID DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json(rows);
    });
});

app.post("/api/categories", (req, res) => {
    const payload = req.body || {};
    runWithRetry("INSERT INTO Categories (CategoryName) VALUES (?)", [payload.name || payload.categoryName || "Unnamed Category"], function (err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, categoryId: this.lastID });
    });
});

app.get("/api/suppliers", (req, res) => {
    allWithRetry("SELECT * FROM Suppliers ORDER BY SupplierID DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json(rows);
    });
});

app.post("/api/suppliers", (req, res) => {
    const payload = req.body || {};
    runWithRetry(
        `INSERT INTO Suppliers (SupplierName, ContactName, Phone, Email, Website, Address) VALUES (?, ?, ?, ?, ?, ?)`,
        [payload.name || payload.supplierName || "", payload.contact || payload.contactName || "", payload.phone || "", payload.email || "", payload.website || "", payload.address || ""],
        function (err) {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, supplierId: this.lastID });
        }
    );
});

app.get("/api/locations", (req, res) => {
    allWithRetry("SELECT * FROM Locations ORDER BY LocationID DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json(rows);
    });
});

app.post("/api/locations", (req, res) => {
    const payload = req.body || {};
    runWithRetry(
        `INSERT INTO Locations (Building, Room, Shelf, Bin) VALUES (?, ?, ?, ?)`,
        [payload.name || payload.building || "", payload.room || "", payload.shelf || "", payload.bin || ""],
        function (err) {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, locationId: this.lastID });
        }
    );
});

app.get("/api/inventory", (req, res) => {
    allWithRetry("SELECT * FROM InventoryTransactions ORDER BY TransactionID DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json(rows);
    });
});

app.post("/api/inventory", (req, res) => {
    const payload = req.body || {};
    runWithRetry(
        `INSERT INTO InventoryTransactions (MaterialID, UserID, MachineID, TransactionType, Quantity, Notes) VALUES (?, ?, ?, ?, ?, ?)`,
        [payload.materialId || null, payload.userId || null, payload.machineId || null, payload.type || "Stock In", payload.quantity || 0, payload.notes || ""],
        function (err) {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, transactionId: this.lastID });
        }
    );
});

app.get("/api/notifications", (req, res) => {
    allWithRetry("SELECT * FROM Notifications ORDER BY NotificationID DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json(rows);
    });
});

app.post("/api/notifications", (req, res) => {
    const payload = req.body || {};
    runWithRetry(
        `INSERT INTO Notifications (UserID, Message, ReadStatus, Created) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [payload.userId || null, payload.message || `${payload.title || "Alert"}: ${payload.detail || ""}`.trim(), payload.readStatus || 0],
        function (err) {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, notificationId: this.lastID });
        }
    );
});

app.post("/api/users", (req, res) => {
    const payload = req.body || {};
    const username = payload.username || payload.email || payload.Username || payload.Email;
    const passwordHash = payload.passwordHash || payload.password || "";
    const fullName = payload.name || payload.fullName || payload.FullName || "";
    const email = payload.email || payload.Email || "";
    const role = payload.role || payload.Role || "User";

    if (!username || !passwordHash) {
        return res.status(400).json({ success: false, error: "Username and password are required" });
    }

    getWithRetry("SELECT UserID FROM Users WHERE Email = ? OR Username = ?", [email, username], (err, existing) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        if (existing) {
            return res.status(409).json({ success: false, error: "User already exists" });
        }

        runWithRetry(
            `INSERT INTO Users (Username, PasswordHash, FullName, Email, Role, CreatedDate, LastLogin, Active)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)`,
            [username, passwordHash, fullName, email, role],
            function (insertErr) {
                if (insertErr) {
                    return res.status(500).json({ success: false, error: insertErr.message });
                }
                res.json({ success: true, userId: this.lastID, user: { id: this.lastID, name: fullName, email, username, role } });
            }
        );
    });
});

app.post("/api/login", (req, res) => {
    const payload = req.body || {};
    const identifier = payload.username || payload.email || payload.identifier || "";
    const password = payload.password || payload.passwordHash || "";

    if (!identifier || !password) {
        return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    getWithRetry(
        `SELECT UserID, Username, PasswordHash, FullName, Email, Role FROM Users WHERE (Email = ? OR Username = ?) AND Active = 1`,
        [identifier, identifier],
        (err, user) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            if (!user || user.PasswordHash !== password) {
                return res.status(401).json({ success: false, error: "Invalid login details" });
            }

            runWithRetry("UPDATE Users SET LastLogin = CURRENT_TIMESTAMP WHERE UserID = ?", [user.UserID], () => {
                res.json({
                    success: true,
                    user: {
                        id: user.UserID,
                        name: user.FullName || user.Username,
                        email: user.Email,
                        username: user.Username,
                        role: user.Role || "User"
                    }
                });
            });
        }
    );
});

// =========================
// AI CHAT API
// =========================
app.post("/api/ai/chat", async (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({
                success: false,
                error: "Question is required."
            });
        }

        const answer = await askAI(question);

        res.json({
            success: true,
            answer
        });

    } catch (err) {
        console.error("AI Error:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

if (require.main === module) {
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = { app, db };