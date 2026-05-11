const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { loadDataStore, saveDataStore } = require("./dataStore");

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// =======================
// Chat with driver
// =======================

function getSmartReply(text) {
  text = String(text || "").toLowerCase();

  if (text.includes("hello") || text.includes("hi")) {
    return "Hello! How can I help you?";
  }

  if (
    text.includes("where are you") ||
    text.includes("location") ||
    text.includes("you close")
  ) {
    return "I'm on my way, about 2 minutes away!";
  }

  if (text.includes("are you here") || text.includes("arrived")) {
    return "Yes, I just arrived. I'm outside!";
  }

  if (
    text.includes("wait") ||
    text.includes("one minute") ||
    text.includes("hold on")
  ) {
    return "No problem, take your time!";
  }

  if (text.includes("thank")) {
    return "You're welcome!";
  }

  return "Got it! 👍";
}

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("send_message", (msg) => {
    console.log("Received:", msg.text);

    const reply = getSmartReply(msg.text);

    setTimeout(() => {
      socket.emit("receive_message", {
        text: reply,
        sender: "driver",
        time: new Date().toISOString()
      });
    }, 800);
  });
});

// =======================
// Reviews API
// =======================

app.get("/api/reviews", async (req, res) => {
  try {
    const db = await loadDataStore();
    res.json(db.reviews || []);
  } catch (err) {
    console.error("Error loading reviews:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/reviews", async (req, res) => {
  try {
    const { text, rating, name } = req.body;

    if (!text || !rating) {
      return res.status(400).json({
        message: "Text and rating are required"
      });
    }

    const numericRating = Number(rating);

    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5"
      });
    }

    const db = await loadDataStore();
    if (!db.reviews) db.reviews = [];

    const newReview = {
      id: Date.now(),
      text,
      rating: numericRating,
      name: name || "Anonymous",
      createdAt: new Date().toISOString()
    };

    db.reviews.push(newReview);
    await saveDataStore(db);

    res.status(201).json({
      success: true,
      review: newReview
    });
  } catch (err) {
    console.error("Error saving review:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/reviews", async (req, res) => {
  try {
    const db = await loadDataStore();
    db.reviews = [];
    await saveDataStore(db);

    res.json({
      success: true,
      message: "All reviews were deleted."
    });
  } catch (err) {
    console.error("Error clearing reviews:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =======================
// Customer Service API
// =======================

app.get("/api/contact", async (req, res) => {
  try {
    const db = await loadDataStore();
    res.json(db.contacts || []);
  } catch (err) {
    console.error("Error loading contacts:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/contact", async (req, res) => {
  try {
    const { name, studentId, email, message } = req.body;

    if (!name || !studentId || !email || !message) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    if (!/^[0-9]+$/.test(studentId)) {
      return res.status(400).json({
        message: "Student ID must contain digits only"
      });
    }

    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format"
      });
    }

    if (message.length < 10) {
      return res.status(400).json({
        message: "Message must be at least 10 characters"
      });
    }

    const db = await loadDataStore();
    if (!db.contacts) db.contacts = [];

    const newContact = {
      id: Date.now(),
      name,
      studentId,
      email,
      message,
      createdAt: new Date().toISOString()
    };

    db.contacts.push(newContact);
    await saveDataStore(db);

    res.status(201).json({
      success: true,
      contact: newContact
    });
  } catch (err) {
    console.error("Error saving contact:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/contact", async (req, res) => {
  try {
    const db = await loadDataStore();
    db.contacts = [];
    await saveDataStore(db);

    res.json({
      success: true,
      message: "All contact messages were deleted."
    });
  } catch (err) {
    console.error("Error clearing contacts:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =======================
// Split Bill API
// =======================

app.get("/api/split-bills", async (req, res) => {
  try {
    const db = await loadDataStore();
    res.json(db.splitBills || []);
  } catch (err) {
    console.error("Error loading split bills:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/split-bills", async (req, res) => {
  try {
    const { totalAmount, peopleCount, perPerson } = req.body;

    if (!totalAmount || !peopleCount || !perPerson) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const db = await loadDataStore();
    if (!db.splitBills) db.splitBills = [];

    const newBill = {
      id: Date.now(),
      totalAmount: Number(totalAmount),
      peopleCount: Number(peopleCount),
      perPerson: Number(perPerson),
      createdAt: new Date().toISOString()
    };

    db.splitBills.push(newBill);
    await saveDataStore(db);

    res.status(201).json({
      success: true,
      bill: newBill
    });
  } catch (err) {
    console.error("Error saving split bill:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/split-bills", async (req, res) => {
  try {
    const db = await loadDataStore();
    db.splitBills = [];
    db.payments = [];
    await saveDataStore(db);

    res.json({
      success: true,
      message: "All bills were deleted."
    });
  } catch (err) {
    console.error("Error clearing split bills:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =======================
// Payments API
// =======================

app.get("/api/payments", async (req, res) => {
  try {
    const db = await loadDataStore();
    res.json(db.payments || []);
  } catch (err) {
    console.error("Error loading payments:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/payments", async (req, res) => {
  try {
    const { totalAmount } = req.body;

    if (!totalAmount) {
      return res.status(400).json({
        message: "Total amount is required"
      });
    }

    const db = await loadDataStore();
    if (!db.payments) db.payments = [];

    const newPayment = {
      id: Date.now(),
      totalAmount: Number(totalAmount),
      createdAt: new Date().toISOString()
    };

    db.payments.push(newPayment);
    await saveDataStore(db);

    res.status(201).json({
      success: true,
      payment: newPayment
    });
  } catch (err) {
    console.error("Error saving payment:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =======================
// Rides API
// =======================

app.get("/api/rides", async (req, res) => {
  try {
    const db = await loadDataStore();
    res.json(db.rides || []);
  } catch (err) {
    console.error("Error loading rides:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/rides", async (req, res) => {
  try {
    const {
      pickup,
      dropoff,
      driverName,
      driverCar,
      driverPlate,
      fare
    } = req.body;

    if (!pickup || !dropoff) {
      return res.status(400).json({
        success: false,
        message: "Pickup and drop-off locations are required."
      });
    }

    const db = await loadDataStore();
    if (!db.rides) db.rides = [];

    const newRide = {
      id: Date.now(),
      pickup,
      dropoff,
      driverName: driverName || "Ahmed Massaud",
      driverCar: driverCar || "Toyota Camry",
      driverPlate: driverPlate || "R12345",
      fare: fare ? Number(fare) : 12.5,
      status: "Confirmed",
      createdAt: new Date().toISOString()
    };

    db.rides.push(newRide);
    await saveDataStore(db);

    res.status(201).json({
      success: true,
      message: "Ride confirmed successfully.",
      ride: newRide
    });
  } catch (err) {
    console.error("Error saving ride:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.patch("/api/rides/:id/cancel", async (req, res) => {
  try {
    const rideId = Number(req.params.id);

    const db = await loadDataStore();
    if (!db.rides) db.rides = [];

    const ride = db.rides.find((r) => Number(r.id) === rideId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found."
      });
    }

    ride.status = "Cancelled";
    ride.cancelledAt = new Date().toISOString();

    await saveDataStore(db);

    res.json({
      success: true,
      message: "Ride cancelled successfully.",
      ride
    });
  } catch (err) {
    console.error("Error cancelling ride:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/rides", async (req, res) => {
  try {
    const db = await loadDataStore();
    db.rides = [];
    await saveDataStore(db);

    res.json({
      success: true,
      message: "All rides were deleted."
    });
  } catch (err) {
    console.error("Error clearing rides:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =======================
// Start server
// =======================

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});