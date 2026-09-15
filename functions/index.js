const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

admin.initializeApp();

const db = admin.firestore();
const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "700kb" }));

const ROOM_COLLECTION = "room";

/* =========================
   TEST API
========================= */
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Dream House Rental API is working",
    collection: ROOM_COLLECTION
  });
});

/* =========================
   GET ALL ROOMS
========================= */
app.get("/rooms", async (req, res) => {
  try {
    const snapshot = await db
      .collection(ROOM_COLLECTION)
      .orderBy("createdAt", "desc")
      .get();

    const rooms = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({
      ok: true,
      rooms: rooms
    });

  } catch (error) {
    console.error("GET ROOMS ERROR:", error);

    // Fallback without orderBy
    try {
      const snapshot = await db
        .collection(ROOM_COLLECTION)
        .get();

      const rooms = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      res.status(200).json({
        ok: true,
        rooms: rooms
      });

    } catch (error2) {
      console.error("GET ROOMS FALLBACK ERROR:", error2);

      res.status(500).json({
        ok: false,
        error: error2.message
      });
    }
  }
});

/* =========================
   GET ONE ROOM
========================= */
app.get("/rooms/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const snapshot = await db
      .collection(ROOM_COLLECTION)
      .doc(id)
      .get();

    if (!snapshot.exists) {
      return res.status(404).json({
        ok: false,
        error: "Room not found"
      });
    }

    res.status(200).json({
      ok: true,
      room: {
        id: snapshot.id,
        ...snapshot.data()
      }
    });

  } catch (error) {
    console.error("GET ONE ROOM ERROR:", error);

    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/* =========================
   ADD ROOM
========================= */
app.post("/rooms", async (req, res) => {
  try {
    const data = req.body || {};

    if (!data.name || !data.mobile || !data.city || !data.address) {
      return res.status(400).json({
        ok: false,
        error: "Name, mobile, city and address are required"
      });
    }

    const roomData = {
      name: String(data.name).trim(),
      mobile: String(data.mobile).trim(),
      city: String(data.city).trim(),
      address: String(data.address).trim(),
      type: String(data.type || ""),
      propertyType: String(data.propertyType || data.type || ""),
      furnishing: String(data.furnishing || ""),
      rent: Number(data.rent || 0),
      description: String(data.description || ""),
      image: String(data.image || ""),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db
      .collection(ROOM_COLLECTION)
      .add(roomData);

    const saved = await docRef.get();

    res.status(201).json({
      ok: true,
      message: "Room saved successfully",
      room: {
        id: saved.id,
        ...saved.data()
      }
    });

  } catch (error) {
    console.error("ADD ROOM ERROR:", error);

    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/* =========================
   UPDATE ROOM
========================= */
app.put("/rooms/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body || {};

    const roomRef = db
      .collection(ROOM_COLLECTION)
      .doc(id);

    const existing = await roomRef.get();

    if (!existing.exists) {
      return res.status(404).json({
        ok: false,
        error: "Room not found"
      });
    }

    const updateData = {
      name: String(data.name || "").trim(),
      mobile: String(data.mobile || "").trim(),
      city: String(data.city || "").trim(),
      address: String(data.address || "").trim(),
      type: String(data.type || ""),
      propertyType: String(data.propertyType || data.type || ""),
      furnishing: String(data.furnishing || ""),
      rent: Number(data.rent || 0),
      description: String(data.description || ""),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Photo only changes when a new photo is supplied.
    if (data.image && String(data.image).length > 0) {
      updateData.image = String(data.image);
    }

    await roomRef.update(updateData);

    const updated = await roomRef.get();

    res.status(200).json({
      ok: true,
      message: "Room updated successfully",
      room: {
        id: updated.id,
        ...updated.data()
      }
    });

  } catch (error) {
    console.error("UPDATE ROOM ERROR:", error);

    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/* =========================
   DELETE ROOM
========================= */
app.delete("/rooms/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const roomRef = db
      .collection(ROOM_COLLECTION)
      .doc(id);

    const existing = await roomRef.get();

    if (!existing.exists) {
      return res.status(404).json({
        ok: false,
        error: "Room not found"
      });
    }

    await roomRef.delete();

    res.status(200).json({
      ok: true,
      message: "Room deleted successfully",
      id: id
    });

  } catch (error) {
    console.error("DELETE ROOM ERROR:", error);

    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/health", async (req, res) => {
  try {
    await db.collection(ROOM_COLLECTION).limit(1).get();

    res.status(200).json({
      ok: true,
      firestore: "connected",
      collection: ROOM_COLLECTION
    });

  } catch (error) {
    console.error("HEALTH ERROR:", error);

    res.status(500).json({
      ok: false,
      firestore: "error",
      error: error.message
    });
  }
});

/* =========================
   FIREBASE FUNCTION
========================= */
exports.api = onRequest(
  {
    region: "asia-south1",
    maxInstances: 5
  },
  app
);
