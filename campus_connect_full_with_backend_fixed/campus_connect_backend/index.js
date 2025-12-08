// campus_connect_backend/index.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ---------- CONFIG ----------
const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/campus_connect";

// ---------- MIDDLEWARE ----------
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// ---------- MONGOOSE MODELS ----------

// Users
const userSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true }, // numeric id used by frontend
    username: { type: String, unique: true },
    firstName: String,
    lastName: String,
    email: { type: String, unique: true },
    password: String, // plain for now (matches your existing data)
    role: String,
    department: String,
    year: String,
    section: String,
    avatar: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const messageSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    senderId: Number,
    receiverId: Number,
    text: String,
    file: {
      name: String,
      type: String,
      url: String,
      mimeType: String,
    },
    timestamp: String,
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// simple placeholders for posts/materials/groups so fetchAll works
const groupSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    name: String,
    category: String,
    description: String,
    privacy: String,
    maxMembers: Number,
    mentorId: Number,
    posts: { type: Array, default: [] },
    membersCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    authorId: Number,
    title: String,
    description: String,
    image: String,
    fromDate: String,
    toDate: String,
    venue: String,
    likes: { type: [Number], default: [] },
    comments: { type: Array, default: [] },
    savedBy: { type: [Number], default: [] },
    groupId: Number,
    timestamp: String,
  },
  { timestamps: true }
);

const materialSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    uploaderId: Number,
    title: String,
    subject: String,
    description: String,
    fileName: String,
    fileType: String,
    url: String,
    likes: { type: [Number], default: [] },
    comments: { type: Array, default: [] },
    savedBy: { type: [Number], default: [] },
    downloads: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);
const Group = mongoose.model("Group", groupSchema);
const Post = mongoose.model("Post", postSchema);
const StudyMaterial = mongoose.model("StudyMaterial", materialSchema);

// ---------- ROUTES ----------

// Health check
app.get("/", (req, res) => {
  res.send("Campus Connect backend is running ✅");
});

// ---------- AUTH LOGIN ----------
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({
      username,
      password,
      isActive: true,
    }).lean();

    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    return res.json(user);
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
});

// ---------- USERS ----------

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().lean();
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Register new user (used by Admin Register page)
app.post("/api/users", async (req, res) => {
  try {
    const body = req.body;

    // generate numeric id if not provided
    const numericId = body.id || Date.now();

    const user = new User({
      id: numericId,
      username: body.username,
      firstName: body.firstName || "",
      lastName: body.lastName || "",
      email: body.email,
      password: body.password,
      role: body.role,
      department: body.department || "",
      year: body.year || "",
      section: body.section || "",
      avatar: body.avatar || "",
      isActive: body.isActive !== undefined ? body.isActive : true,
    });

    await user.save();
    res.status(201).json(user.toObject());
  } catch (err) {
    console.error("Register user error:", err);
    res.status(500).json({ message: "Failed to register user" });
  }
});

// Update user (toggle active, etc.)
app.put("/api/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await User.findOneAndUpdate({ id }, req.body, {
      new: true,
    }).lean();

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// ---------- MESSAGES / CHAT ----------

// Get all messages
app.get("/api/messages", async (req, res) => {
  try {
    const msgs = await Message.find().lean();
    res.json(msgs);
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// Send message
app.post("/api/messages", async (req, res) => {
  try {
    const body = req.body;
    const msg = new Message({
      id: body.id || Date.now(),
      senderId: body.senderId,
      receiverId: body.receiverId,
      text: body.text || "",
      file: body.file || null,
      timestamp: body.timestamp || "",
      isRead: body.isRead ?? false,
    });

    await msg.save();
    res.status(201).json(msg.toObject());
  } catch (err) {
    console.error("Create message error:", err);
    res.status(500).json({ message: "Failed to create message" });
  }
});

// Mark messages from sender -> receiver as read
app.put("/api/messages/read", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    await Message.updateMany(
      {
        senderId,
        receiverId,
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Mark messages as read error:", err);
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
});

// ---------- PLACEHOLDER ROUTES FOR OTHER DATA ----------

// These keep your frontend fetchAll() from failing.
// You can extend them later with full logic if you want persistence.

app.get("/api/groups", async (req, res) => {
  try {
    const groups = await Group.find().lean();
    res.json(groups);
  } catch (err) {
    console.error("Get groups error:", err);
    res.status(500).json({ message: "Failed to fetch groups" });
  }
});

app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find().lean();
    res.json(posts);
  } catch (err) {
    console.error("Get posts error:", err);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
});

app.get("/api/materials", async (req, res) => {
  try {
    const materials = await StudyMaterial.find().lean();
    res.json(materials);
  } catch (err) {
    console.error("Get materials error:", err);
    res.status(500).json({ message: "Failed to fetch materials" });
  }
});

// ---------- START SERVER ----------
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
