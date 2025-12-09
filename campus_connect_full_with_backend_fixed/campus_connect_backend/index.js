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
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://bavinan-campus-connect.vercel.app",
    ],
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
    password: String, // plain text for now (matches your existing data)
    role: String,
    department: String,
    year: String,
    section: String,
    avatar: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Messages
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

// Groups
const groupSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    name: String,
    category: String,
    description: String,
    privacy: String,
    maxMembers: Number,
    mentorId: Number, // numeric id of mentor user
    posts: { type: Array, default: [] }, // we store full post objects or ids
    membersCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Posts
const postSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    authorId: Number, // numeric id of User
    title: String,
    description: String,
    image: String,
    fromDate: String,
    toDate: String,
    venue: String,
    likes: { type: [Number], default: [] }, // user ids
    comments: { type: Array, default: [] },
    savedBy: { type: [Number], default: [] },
    groupId: Number, // optional: if post belongs to a group
    timestamp: String,
  },
  { timestamps: true }
);

// Study Materials
const materialSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    uploaderId: Number, // numeric id of User
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

// ---------- AUTH ----------

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

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().lean();
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const body = req.body;
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

// ---------- MESSAGES ----------

app.get("/api/messages", async (req, res) => {
  try {
    const msgs = await Message.find().lean();
    res.json(msgs);
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

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

// This must match frontend: /api/messages/mark-read
app.post("/api/messages/mark-read", async (req, res) => {
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

// ---------- GROUPS ----------

app.get("/api/groups", async (req, res) => {
  try {
    const groups = await Group.find().lean();
    res.json(groups);
  } catch (err) {
    console.error("Get groups error:", err);
    res.status(500).json({ message: "Failed to fetch groups" });
  }
});

app.post("/api/groups", async (req, res) => {
  try {
    const body = req.body;
    const group = new Group({
      id: body.id || Date.now(),
      name: body.name,
      category: body.category,
      description: body.description,
      privacy: body.privacy || "Public",
      maxMembers: body.maxMembers || 50,
      mentorId: body.mentorId || body.mentor?.id || 0,
      posts: Array.isArray(body.posts) ? body.posts : [],
      membersCount: body.membersCount || 0,
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
    });

    await group.save();
    res.status(201).json(group.toObject());
  } catch (err) {
    console.error("Create group error:", err);
    res.status(500).json({ message: "Failed to create group" });
  }
});

app.put("/api/groups/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await Group.findOneAndUpdate({ id }, req.body, {
      new: true,
    }).lean();

    if (!updated) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update group error:", err);
    res.status(500).json({ message: "Failed to update group" });
  }
});

// ---------- POSTS ----------

app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find().lean();
    res.json(posts);
  } catch (err) {
    console.error("Get posts error:", err);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
});

app.post("/api/posts", async (req, res) => {
  try {
    const body = req.body;

    const post = new Post({
      id: body.id || Date.now(),
      authorId: body.authorId || body.author?.id || 0,
      title: body.title || "",
      description: body.description || "",
      image: body.image || "",
      fromDate: body.fromDate || "",
      toDate: body.toDate || "",
      venue: body.venue || "",
      likes: Array.isArray(body.likes) ? body.likes : [],
      comments: Array.isArray(body.comments) ? body.comments : [],
      savedBy: Array.isArray(body.savedBy) ? body.savedBy : [],
      groupId: body.groupId || null,
      timestamp: body.timestamp || new Date().toISOString(),
    });

    await post.save();
    res.status(201).json(post.toObject());
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ message: "Failed to create post" });
  }
});

app.put("/api/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await Post.findOneAndUpdate({ id }, req.body, {
      new: true,
    }).lean();

    if (!updated) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update post error:", err);
    res.status(500).json({ message: "Failed to update post" });
  }
});

app.delete("/api/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await Post.deleteOne({ id });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ message: "Failed to delete post" });
  }
});

// ---------- STUDY MATERIALS ----------

app.get("/api/materials", async (req, res) => {
  try {
    const materials = await StudyMaterial.find().lean();
    res.json(materials);
  } catch (err) {
    console.error("Get materials error:", err);
    res.status(500).json({ message: "Failed to fetch materials" });
  }
});

app.post("/api/materials", async (req, res) => {
  try {
    const body = req.body;
    const material = new StudyMaterial({
      id: body.id || Date.now(),
      uploaderId: body.uploaderId || body.uploader?.id || 0,
      title: body.title || "",
      subject: body.subject || "",
      description: body.description || "",
      fileName: body.fileName || "",
      fileType: body.fileType || "PDF",
      url: body.url || "",
      likes: Array.isArray(body.likes) ? body.likes : [],
      comments: Array.isArray(body.comments) ? body.comments : [],
      savedBy: Array.isArray(body.savedBy) ? body.savedBy : [],
      downloads: body.downloads || 0,
    });

    await material.save();
    res.status(201).json(material.toObject());
  } catch (err) {
    console.error("Create material error:", err);
    res.status(500).json({ message: "Failed to create material" });
  }
});

// ---------- START SERVER & CONNECT DB ----------

// Ensure default Admin user exists
async function ensureAdminUser() {
  try {
    const existing = await User.findOne({ username: "Admin" }).lean();

    if (!existing) {
      const adminUser = new User({
        id: 1,
        username: "Admin",
        firstName: "Default",
        lastName: "Admin",
        email: "admin@campus.com",
        password: "10032002", // same as your frontend default login
        role: "Admin",
        department: "Administration",
        year: "",
        section: "",
        avatar: "",
        isActive: true,
      });

      await adminUser.save();
      console.log("✅ Seeded default Admin user");
    } else {
      console.log("ℹ️ Admin user already exists");
    }
  } catch (err) {
    console.error("❌ Error ensuring Admin user:", err);
  }
}

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB connected");

    // Make sure Admin user exists
    await ensureAdminUser();

    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

