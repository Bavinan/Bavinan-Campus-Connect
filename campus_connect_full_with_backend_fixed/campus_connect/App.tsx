import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useRef,
} from "react";
import {
  HashRouter,
  Routes,
  Route,
  NavLink,
  useParams,
  useNavigate,
  Navigate,
} from "react-router-dom";

import {
  Role,
  User,
  Post,
  StudyMaterial,
  Group,
  Message,
  Comment,
} from "./types";
import {
  Logo,
  ICONS,
  MOCK_USERS,
  MOCK_POSTS,
  MOCK_STUDY_MATERIALS,
  MOCK_GROUPS,
  MOCK_MESSAGES,
  EMOJIS,
} from "./constants";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://bavinan-campus-connect.onrender.com";

// ---------------------- DATA CONTEXT ---------------------- //

interface DataContextType {
  posts: Post[];
  addPost: (post: Post) => void;
  updatePost: (post: Post) => void;
  deletePost: (id: number) => void;

  materials: StudyMaterial[];
  addMaterial: (material: StudyMaterial) => void;

  groups: Group[];
  addGroup: (group: Group) => void;
  updateGroup: (group: Group) => void;

  messages: Message[];
  addMessage: (message: Message) => void;
  markMessagesAsRead: (senderId: number, receiverId: number) => void;

  users: User[];
  registerUser: (userData: Omit<User, "id">) => void;
  updateUser: (user: User) => void;
}

const DataContext = createContext<DataContextType>(null!);
const useData = () => useContext(DataContext);

const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [materials, setMaterials] = useState<StudyMaterial[]>(MOCK_STUDY_MATERIALS);
  const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);

  // ---------- LOAD INITIAL DATA FROM BACKEND ---------- //
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [usersRes, groupsRes, postsRes, materialsRes, messagesRes] =
          await Promise.all([
            fetch(`${API_BASE_URL}/api/users`),
            fetch(`${API_BASE_URL}/api/groups`),
            fetch(`${API_BASE_URL}/api/posts`),
            fetch(`${API_BASE_URL}/api/materials`),
            fetch(`${API_BASE_URL}/api/messages`),
          ]);

        const [
          usersData,
          groupsData,
          postsData,
          materialsData,
          messagesData,
        ] = await Promise.all([
          usersRes.ok ? usersRes.json() : Promise.resolve(null),
          groupsRes.ok ? groupsRes.json() : Promise.resolve(null),
          postsRes.ok ? postsRes.json() : Promise.resolve(null),
          materialsRes.ok ? materialsRes.json() : Promise.resolve(null),
          messagesRes.ok ? messagesRes.json() : Promise.resolve(null),
        ]);

        // Users
        if (usersData) {
          setUsers(usersData);
        }

        // Groups – normalize
        if (groupsData) {
          const normalizedGroups: Group[] = groupsData.map(
            (g: any, index: number) => {
              let mentor =
                usersData?.find?.((u: any) => g.admins?.[0] === u.id) ||
                usersData?.find?.((u: any) => u.role === Role.MENTOR) ||
                usersData?.[0] || {
                  id: 0,
                  username: "mentor",
                  firstName: "Mentor",
                  lastName: "",
                  email: "",
                  role: Role.MENTOR,
                  department: "",
                  year: "",
                  section: "",
                  avatar: "",
                };

              return {
                id: g.id ?? Date.now() + index,
                name: g.name ?? "Untitled Group",
                category: g.category ?? "General",
                description: g.description ?? "",
                privacy: g.privacy ?? "Public",
                maxMembers: g.maxMembers ?? 50,
                mentor,
                posts: Array.isArray(g.posts) ? g.posts : [],
                membersCount: Array.isArray(g.members)
                  ? g.members.length
                  : g.membersCount ?? 0,
                isActive:
                  typeof g.isActive === "boolean" ? g.isActive : true,
              } as Group;
            }
          );

          setGroups(normalizedGroups);
        }

        // Materials – normalize
        if (materialsData) {
          const normalizedMaterials: StudyMaterial[] = materialsData.map(
            (m: any, idx: number) => {
              let uploader = usersData?.find?.(
                (u: any) => u.id === m.uploadedBy
              );
              if (!uploader && usersData && usersData.length > 0) {
                uploader = usersData[0];
              }

              return {
                id: m.id ?? Date.now() + idx,
                uploader:
                  uploader || {
                    id: 0,
                    username: "Unknown",
                    firstName: "Unknown",
                    lastName: "",
                    email: "",
                    role: Role.STUDENT,
                    department: "",
                    year: "",
                    section: "",
                    avatar: "",
                  },
                title: m.title ?? "",
                subject: m.subject ?? "",
                fileName: m.fileName ?? "file",
                fileType: "PDF",
                description: m.description ?? "",
                likes: [],
                comments: [],
                savedBy: [],
                url: m.fileUrl ?? m.url ?? "",
                downloads: m.downloads ?? 0,
              } as StudyMaterial;
            }
          );

          setMaterials(normalizedMaterials);
        }

        // Posts
        if (postsData) {
          setPosts(postsData);
        }

        // Messages
        if (messagesData) {
          setMessages(messagesData);
        }
      } catch (error) {
        console.error("Failed to fetch initial data from backend:", error);
        // stays on MOCK_* data
      }
    };

    fetchAll();
  }, []);

  // ---------- SYNC HELPERS (POST / PUT to backend) ---------- //

  const addPost = async (post: Post) => {
    setPosts(prev => [...prev, post]); // optimistic

    try {
      await fetch(`${API_BASE_URL}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(post),
      });
    } catch (e) {
      console.error("Failed to save post to backend", e);
    }
  };

  const updatePost = async (post: Post) => {
    setPosts(prev => prev.map(p => (p.id === post.id ? post : p)));

    try {
      await fetch(`${API_BASE_URL}/api/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(post),
      });
    } catch (e) {
      console.error("Failed to update post in backend", e);
    }
  };

  const deletePost = async (id: number) => {
    setPosts(prev => prev.filter(p => p.id !== id));

    try {
      await fetch(`${API_BASE_URL}/api/posts/${id}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error("Failed to delete post in backend", e);
    }
  };

  const addMaterial = async (material: StudyMaterial) => {
    setMaterials(prev => [...prev, material]);

    try {
      await fetch(`${API_BASE_URL}/api/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(material),
      });
    } catch (e) {
      console.error("Failed to save material", e);
    }
  };

  const addGroup = async (group: Group) => {
    setGroups(prev => [...prev, group]);

    try {
      await fetch(`${API_BASE_URL}/api/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(group),
      });
    } catch (e) {
      console.error("Failed to save group", e);
    }
  };

  const updateGroup = async (group: Group) => {
    setGroups(prev => prev.map(g => (g.id === group.id ? group : g)));

    try {
      await fetch(`${API_BASE_URL}/api/groups/${group.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(group),
      });
    } catch (e) {
      console.error("Failed to update group", e);
    }
  };

  const addMessage = async (message: Message) => {
    setMessages(prev => [...prev, message]);

    try {
      await fetch(`${API_BASE_URL}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
    } catch (e) {
      console.error("Failed to save message", e);
    }
  };

  const markMessagesAsRead = async (senderId: number, receiverId: number) => {
    // update UI immediately
    setMessages(prev =>
      prev.map(m =>
        m.senderId === senderId && m.receiverId === receiverId
          ? { ...m, isRead: true }
          : m
      )
    );

    // optional backend sync (adjust the URL to match your API)
    try {
      await fetch(`${API_BASE_URL}/api/messages/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId, receiverId }),
      });
    } catch (e) {
      console.error("Failed to mark messages as read in backend", e);
    }
  };

  // ⬇️ put this inside DataProvider, with your other functions
const registerUser = async (userData: Omit<User, "id">) => {
  try {
    // CALL YOUR BACKEND REGISTER ENDPOINT
    // If your route is different (e.g. /api/users), change the URL here.
   const res = await fetch(`${API_BASE_URL}/api/users`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(userData),
});

    if (!res.ok) {
      //const text = await res.text();
      console.error("Register failed:", text);
      //throw new Error("Failed to register user on server");
      return;
    }

    const created: User = await res.json(); // backend returns saved user
    // Update React state with the user from DB (has correct id)
    setUsers((prev) => [...prev, createdUser]);
  } catch (err) {
    console.error("Register error:", err);
    //console.error("Error while registering user:", err);
    //alert("Could not register user in backend. Check server console.");
  }
};

  const updateUser = async (user: User) => {
    setUsers(prev => prev.map(u => (u.id === user.id ? user : u)));

    try {
      await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
    } catch (e) {
      console.error("Failed to update user", e);
    }
  };

  const value: DataContextType = {
    posts,
    addPost,
    updatePost,
    deletePost,
    materials,
    addMaterial,
    groups,
    addGroup,
    updateGroup,
    messages,
    addMessage,
    markMessagesAsRead,
    users,
    registerUser,
    updateUser,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

// ---------------------- AUTH CONTEXT ---------------------- //

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);
const useAuth = () => useContext(AuthContext);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const { users } = useData(); // ✅ get users from DataContext

  const login = async (username: string, password: string): Promise<void> => {
    // 1) Try backend login first
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const loggedInUser: User = await response.json();
        setUser(loggedInUser);
        return;
      }
    } catch (err) {
      console.warn("Backend auth not available or failed, using local users.", err);
    }

    // 2) Fallback to users loaded/registered in the app (from DataProvider)
    let localUser =
      users.find(
        (u) => u.username === username && (u as any).password === password
      ) ||
      MOCK_USERS.find(
        (u) => u.username === username && (u as any).password === password
      );

    if (!localUser) {
      throw new Error("Invalid username or password.");
    }

    setUser(localUser);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};


// ---------------------- UI HELPERS ---------------------- //

const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden ${className}`}
  >
    {children}
  </div>
);

const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "success";
  disabled?: boolean;
}> = ({
  children,
  onClick,
  className = "",
  type = "button",
  variant = "primary",
  disabled,
}) => {
  let variantClasses =
    "bg-violet-600 text-white hover:bg-violet-700 hover:shadow-md";
  if (variant === "secondary")
    variantClasses =
      "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800";
  if (variant === "danger")
    variantClasses =
      "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100";
  if (variant === "success")
    variantClasses =
      "bg-green-50 text-green-600 border border-green-100 hover:bg-green-100";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses} ${className}`}
    >
      {children}
    </button>
  );
};

const UserAvatar: React.FC<{ user: User; className?: string }> = ({
  user,
  className = "w-10 h-10 text-sm",
}) => {
  if (user.avatar && user.avatar.startsWith("data:")) {
    return (
      <img
        src={user.avatar}
        alt={user.username}
        className={`${className} rounded-full object-cover border border-slate-200`}
      />
    );
  }
  const colors = [
    "bg-red-100 text-red-600",
    "bg-green-100 text-green-600",
    "bg-blue-100 text-blue-600",
    "bg-yellow-100 text-yellow-600",
    "bg-purple-100 text-purple-600",
  ];
  const colorIndex = (user.firstName.length + user.lastName.length) % colors.length;

  return (
    <div
      className={`${className} rounded-full flex items-center justify-center font-bold uppercase ${colors[colorIndex]} border border-slate-100`}
    >
      {user.firstName.charAt(0)}
    </div>
  );
};

const Input: React.FC<{
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  name?: string;
  required?: boolean;
  className?: string;
}> = ({ label, className = "", ...props }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && (
      <label className="text-sm font-semibold text-slate-700">{label}</label>
    )}
    <input
      {...props}
      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
    />
  </div>
);

const TextArea: React.FC<{
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  name?: string;
  required?: boolean;
  rows?: number;
}> = ({ label, rows = 4, ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-sm font-semibold text-slate-700">{label}</label>
    )}
    <textarea
      {...props}
      rows={rows}
      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none"
    />
  </div>
);

const Select: React.FC<{
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  name?: string;
  placeholder?: string;
  required?: boolean;
}> = ({ label, options, placeholder, ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-sm font-semibold text-slate-700">{label}</label>
    )}
    <div className="relative">
      <select
        {...props}
        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all appearance-none"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-4 h-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </div>
    </div>
  </div>
);

const FileInput: React.FC<{
  label?: string;
  required?: boolean;
  accept?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileName?: string;
}> = ({ label, required, accept, onChange, fileName }) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <label className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 hover:border-violet-400 transition-all group">
      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-sm font-medium group-hover:bg-white group-hover:shadow-sm transition-all">
        Choose File
      </span>
      <span
        className={`text-sm ${
          fileName ? "text-violet-600 font-medium" : "text-slate-400"
        }`}
      >
        {fileName || "No file chosen"}
      </span>
      <input type="file" className="hidden" accept={accept} onChange={onChange} />
    </label>
  </div>
);

// ---------------------- PAGES ---------------------- //

const GetStartedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  if (user) return <Navigate to="/app/home" replace />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-6 text-center">
      <div className="animate-fade-in-up max-w-2xl">
        <div className="mb-8 flex justify-center">
          <Logo className="scale-150" />
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-800 mb-6 tracking-tight">
          Welcome to <span className="text-violet-600">Campus Connect</span>
        </h1>
        <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-lg mx-auto">
          A social and educational platform for students, professors, and
          administrators to connect, share materials, and collaborate.
        </p>
        <Button
          onClick={() => navigate("/login")}
          className="!px-10 !py-4 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
};

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("Admin");
  const [password, setPassword] = useState("10032002");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
      navigate("/app/home");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full bg-white shadow-xl border-0">
        <div className="p-10">
          <div className="flex justify-center mb-8">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
            Welcome Back
          </h2>
          <p className="text-center text-slate-500 mb-8">
            Please login to your account
          </p>
          {error && (
            <p className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center font-medium border border-red-100">
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Username"
              name="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              label="Password"
              name="password"
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              className="w-full !py-3 mt-2 text-base shadow-md shadow-violet-200"
            >
              Login
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { messages } = useData();

  const hasUnreadMessages = messages.some(
    (m) => !m.isRead && m.receiverId === user?.id
  );

  const navItems = [
    {
      path: "/app/home",
      label: "Home",
      icon: ICONS.home,
      roles: [Role.ADMIN, Role.PROFESSOR, Role.STUDENT, Role.MENTOR],
    },
    {
      path: "/app/posts",
      label: "Post Page",
      icon: ICONS.post,
      roles: [Role.ADMIN, Role.PROFESSOR, Role.STUDENT, Role.MENTOR],
    },
    {
      path: "/app/study-material",
      label: "Study Material",
      icon: ICONS.study,
      roles: [Role.ADMIN, Role.PROFESSOR, Role.STUDENT, Role.MENTOR],
    },
    {
      path: "/app/chat",
      label: "Chat",
      icon: ICONS.chat,
      roles: [Role.ADMIN, Role.PROFESSOR, Role.STUDENT, Role.MENTOR],
      notification: hasUnreadMessages,
    },
    {
      path: "/app/groups",
      label: "Groups",
      icon: ICONS.groups,
      roles: [Role.ADMIN, Role.PROFESSOR, Role.STUDENT, Role.MENTOR],
    },
    {
      path: "/app/saved",
      label: "Saved",
      icon: ICONS.save,
      roles: [Role.ADMIN, Role.PROFESSOR, Role.STUDENT, Role.MENTOR],
    },
    {
      path: "/app/create-group",
      label: "Create Group",
      icon: ICONS.createGroup,
      roles: [Role.ADMIN],
    },
    {
      path: "/app/register-user",
      label: "Register User",
      icon: ICONS.registerUser,
      roles: [Role.ADMIN],
    },
  ];

  return (
    <aside className="w-64 bg-white h-screen flex flex-col border-r border-slate-200 sticky top-0 z-10">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-violet-200">
            CC
          </div>
          <div>
            <h1 className="font-bold text-slate-800 leading-tight">
              Campus
              <br />
              Connect
            </h1>
          </div>
        </div>
      </div>

      {user && (
        <div className="p-4 mx-4 mt-4 mb-2 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Logged in as
          </p>
          <div className="flex items-center gap-2">
            <UserAvatar user={user} className="w-8 h-8 text-xs" />
            <p className="font-bold text-slate-800 truncate text-sm">
              {user.username}
            </p>
          </div>
          <span className="inline-block px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold uppercase rounded-full mt-1">
            {user.role}
          </span>
        </div>
      )}

      <nav className="flex-grow px-4 py-2 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => user && item.roles.includes(user.role))
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                  isActive
                    ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
              {item.notification && (
                <span className="absolute right-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </NavLink>
          ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-200 font-medium"
        >
          {ICONS.logout}
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <div className="flex justify-between items-start mb-8">
    <div>
      <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
        {title}
      </h1>
      {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
    </div>
    <div>{children}</div>
  </div>
);

const PostItem: React.FC<{
  post: Post;
  currentUserId: number;
  onUpdate: (post: Post) => void;
  onDelete?: (id: number) => void;
}> = ({ post, currentUserId, onUpdate, onDelete }) => {
  const { users } = useData();
  const { user: authUser } = useAuth();

  const [liked, setLiked] = useState(post.likes.includes(currentUserId));
  const [saved, setSaved] = useState(post.savedBy.includes(currentUserId));
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  const commentsList: Comment[] = Array.isArray(post.comments)
    ? post.comments
    : [];
  const commentsCount = commentsList.length;

  const isAdmin = authUser?.role === Role.ADMIN;
  const isAuthor = authUser?.id === post.author.id;

  const handleLike = () => {
    const updatedLikes = liked
      ? post.likes.filter((id) => id !== currentUserId)
      : [...post.likes, currentUserId];
    const updatedPost = { ...post, likes: updatedLikes };
    onUpdate(updatedPost);
    setLiked(!liked);
  };

  const handleSave = () => {
    const updatedSavedBy = saved
      ? post.savedBy.filter((id) => id !== currentUserId)
      : [...post.savedBy, currentUserId];
    const updatedPost = { ...post, savedBy: updatedSavedBy };
    onUpdate(updatedPost);
    setSaved(!saved);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const commenter = users.find((u) => u.id === currentUserId)!;
    const comment: Comment = {
      id: Date.now(),
      user: commenter,
      text: newComment,
      timestamp: "Just now",
    };
    const updatedPost = {
      ...post,
      comments: Array.isArray(post.comments)
        ? [...post.comments, comment]
        : [comment],
    };
    onUpdate(updatedPost);
    setNewComment("");
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="p-5 pb-0 flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <UserAvatar user={post.author} />
          <div>
            <p className="font-bold text-slate-800 text-sm">
              {post.author.firstName} {post.author.lastName}
            </p>
            <p className="text-xs text-slate-500">
              {post.author.role} • 2 hours ago
            </p>
          </div>
        </div>
        {(isAdmin || isAuthor) && onDelete && (
          <button
            onClick={() => onDelete(post.id)}
            className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
            title="Delete Post"
          >
            {ICONS.delete}
          </button>
        )}
      </div>
      <div className="px-5 py-2">
        <h3 className="font-bold text-lg text-slate-900 mb-1 line-clamp-1">
          {post.title}
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed mb-3 line-clamp-2">
          {post.description}
        </p>
      </div>
      {post.image && (
        <div className="w-full h-48 bg-slate-100 relative overflow-hidden">
          <img
            className="w-full h-full object-cover"
            src={post.image}
            alt="Post content"
          />
        </div>
      )}
      <div className="p-5 mt-auto">
        <div className="flex flex-wrap gap-y-2 text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg">
          {(post.fromDate || post.toDate) && (
            <div className="flex w-full">
              {post.fromDate && (
                <div className="w-1/2">
                  <span className="font-semibold text-slate-700 block">
                    From
                  </span>
                  {post.fromDate}
                </div>
              )}
              {post.toDate && (
                <div className="w-1/2">
                  <span className="font-semibold text-slate-700 block">
                    To
                  </span>
                  {post.toDate}
                </div>
              )}
            </div>
          )}
          {post.venue && (
            <div className="w-full mt-2 pt-2 border-t border-slate-200">
              <span className="font-semibold text-slate-700 block">Venue</span>
              {post.venue}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                liked ? "text-red-500" : "text-slate-500 hover:text-red-500"
              }`}
            >
              {ICONS.like} {post.likes.length}
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-violet-600 transition-colors"
            >
              {ICONS.comment} {commentsCount}
            </button>
          </div>
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              saved ? "text-violet-600" : "text-slate-500 hover:text-violet-600"
            }`}
          >
            {ICONS.save} {saved ? "Saved" : "Save"}
          </button>
        </div>
        {showComments && (
          <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-in-down">
            <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
              {commentsList.map((comment) => {
                const username =
                  (comment as any)?.user?.username ?? "User";
                return (
                  <div key={comment.id} className="flex gap-2 text-sm">
                    <span className="font-bold text-slate-700">
                      {username}:
                    </span>
                    <span className="text-slate-600">
                      {comment.text}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-grow px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
              <button
                onClick={handleAddComment}
                className="px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700"
              >
                Post
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { posts, materials, groups, updatePost, deletePost } = useData();
  const isAdmin = user?.role === Role.ADMIN;

  const StatsSection = () => (
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      <Card className="p-6 flex items-center gap-5 hover:shadow-md transition-shadow cursor-pointer group">
        <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl group-hover:bg-violet-600 group-hover:text-white transition-colors">
          {ICONS.post}
        </div>
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">
            Total Posts
          </p>
          <p className="text-3xl font-bold text-slate-800">
            {posts.length}
          </p>
        </div>
      </Card>
      <Card className="p-6 flex items-center gap-5 hover:shadow-md transition-shadow cursor-pointer group">
        <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
          {ICONS.study}
        </div>
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">
            Study Materials
          </p>
          <p className="text-3xl font-bold text-slate-800">
            {materials.length}
          </p>
        </div>
      </Card>
      <Card className="p-6 flex items-center gap-5 hover:shadow-md transition-shadow cursor-pointer group">
        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
          {ICONS.groups}
        </div>
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">
            Active Groups
          </p>
          <p className="text-3xl font-bold text-slate-800">
            {groups.filter((g) => g.isActive).length}
          </p>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Home" subtitle="Welcome back to your dashboard" />
      <Card className="p-8 mb-8 bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-200">
        <div className="flex items-center gap-6">
          <UserAvatar
            user={user!}
            className="w-20 h-20 rounded-full border-4 border-white/20 text-2xl"
          />
          <div>
            <h2 className="text-3xl font-bold mb-2">
              Hello, {user?.firstName}!
            </h2>
            <p className="text-violet-100 text-lg opacity-90">
              Here's what's happening on campus today.
            </p>
          </div>
        </div>
      </Card>

      {isAdmin && <StatsSection />}

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-800">
          Recent Posts
        </h3>
        {posts.length === 0 ? (
          <div className="p-10 text-center border border-dashed border-slate-300 rounded-xl text-slate-500">
            No posts yet.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <PostItem
                key={post.id}
                post={post}
                currentUserId={user!.id}
                onUpdate={updatePost}
                onDelete={deletePost}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const PostPage: React.FC = () => {
  const { user } = useAuth();
  const { posts, addPost, updatePost, deletePost } = useData();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [venue, setVenue] = useState("");
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");

  const canPost = user?.role === Role.ADMIN;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = () => {
    if (!title || !content || !imageFile) {
      alert("Please fill in Title, Content, and Image");
      return;
    }
    const newPost: Post = {
      id: Date.now(),
      author: user!,
      title,
      description: content,
      image: imageFile,
      fromDate,
      toDate,
      venue,
      likes: [],
      comments: [],
      savedBy: [],
    };
    addPost(newPost);
    setTitle("");
    setContent("");
    setFromDate("");
    setToDate("");
    setVenue("");
    setImageFile(null);
    setImageName("");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Posts" subtitle="Share and discover what's happening" />
      {canPost && (
        <Card className="mb-10 p-6 border-violet-100 shadow-md">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-800 mb-1">
              Create a Post
            </h3>
            <p className="text-slate-500 text-sm">
              Share your thoughts with the community (Admin Only)
            </p>
          </div>
          <div className="space-y-5">
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's on your mind?"
            />
            <TextArea
              label="Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post here..."
              rows={3}
            />
            <FileInput
              label="Image"
              required
              accept="image/*"
              onChange={handleImageChange}
              fileName={imageName}
            />
            {imageFile && (
              <div className="mt-2">
                <p className="text-xs text-slate-500 mb-1">Preview:</p>
                <img
                  src={imageFile}
                  alt="Preview"
                  className="h-32 w-auto rounded-lg border border-slate-200 object-cover"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-6">
              <Input
                type="date"
                label="From Date (Optional)"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <Input
                type="date"
                label="To Date (Optional)"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <Input
              label="Venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Event Venue (Optional)"
            />
            <div className="pt-2">
              <Button
                onClick={handleCreatePost}
                className="flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                Create Post
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          Recent Posts
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <PostItem
              key={post.id}
              post={post}
              currentUserId={user!.id}
              onUpdate={updatePost}
              onDelete={deletePost}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const StudyMaterialPage: React.FC = () => {
  const { user } = useAuth();
  const { materials, addMaterial } = useData();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");

  const canUpload =
    user?.role === Role.ADMIN || user?.role === Role.PROFESSOR;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setFileName(e.target.files[0].name);
    }
  };

  const handleUpload = () => {
    if (!title || !subject || !file || !description) {
      alert("Please fill in all required fields.");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    let fileType: "PDF" | "DOC" | "DOCX" = "PDF";
    if (ext === "doc") fileType = "DOC";
    if (ext === "docx") fileType = "DOCX";
    const fileUrl = URL.createObjectURL(file);
    const newMaterial: StudyMaterial = {
      id: Date.now(),
      uploader: user!,
      title,
      subject,
      description,
      fileName: file.name,
      fileType,
      url: fileUrl,
      likes: [],
      comments: [],
      savedBy: [],
      downloads: 0,
    };
    addMaterial(newMaterial);
    setTitle("");
    setSubject("");
    setDescription("");
    setFile(null);
    setFileName("");
  };

  const FileIcon: React.FC<{ type: string }> = ({ type }) => {
    const colors: Record<string, string> = {
      PDF: "bg-red-50 text-red-600 border-red-100",
      DOC: "bg-blue-50 text-blue-600 border-blue-100",
      DOCX: "bg-blue-50 text-blue-600 border-blue-100",
    };
    return (
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs border ${
          colors[type] || "bg-slate-50 text-slate-600 border-slate-100"
        }`}
      >
        {type}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Study Materials"
        subtitle="Access and share learning resources"
      />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {canUpload && (
          <div className="w-full lg:w-1/3 flex-shrink-0">
            <Card className="p-6 sticky top-24">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800">
                  Upload Material
                </h3>
                <p className="text-slate-500 text-sm">
                  Share resources with others
                </p>
              </div>
              <div className="space-y-4">
                <Input
                  label="Title"
                  placeholder="Enter title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Input
                  label="Subject"
                  placeholder="Enter subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <TextArea
                  label="Description"
                  placeholder="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
                <FileInput
                  label="File (PDF, Word)"
                  required
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  fileName={fileName}
                />
                <Button
                  onClick={handleUpload}
                  className="w-full mt-2 flex justify-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  Upload
                </Button>
              </div>
            </Card>
          </div>
        )}

        <div className="flex-grow w-full">
          <div className="space-y-4">
            {materials.length === 0 && (
              <div className="p-10 text-center border border-dashed border-slate-300 rounded-xl text-slate-500">
                No materials uploaded yet.
              </div>
            )}
            {materials.map((material) => (
              <Card
                key={material.id}
                className="p-5 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-4">
                  <FileIcon type={material.fileType} />
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 truncate pr-2">
                          {material.title}
                        </h4>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                          {material.subject} • {material.fileType} • 2.5 MB
                        </p>
                      </div>
                      <a
                        href={material.url}
                        download={material.fileName}
                        className="text-decoration-none"
                      >
                        <Button
                          variant="secondary"
                          className="!py-1.5 !px-3 text-sm flex items-center gap-2"
                        >
                          {ICONS.download}
                          Download
                        </Button>
                      </a>
                    </div>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                      {material.description}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs font-medium text-slate-400">
                      <span>{material.downloads} downloads</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span>
                        Uploaded by {material.uploader.firstName}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatPage: React.FC = () => {
    const { user } = useAuth();
    const { users, messages, addMessage, markMessagesAsRead } = useData();
    const [activeChatUserId, setActiveChatUserId] = useState<number | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeUsers = users.filter(u => u.isActive && u.id !== user!.id);
    const filteredUsers = activeUsers.filter(u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getLastMessageTimestamp = (userId: number) => {
        const userMessages = messages.filter(m =>
            (m.senderId === userId && m.receiverId === user!.id) ||
            (m.senderId === user!.id && m.receiverId === userId)
        );
        if (userMessages.length === 0) return 0;
        return userMessages[userMessages.length - 1].id;
    };

    const sortedUsers = [...filteredUsers].sort(
        (a, b) => getLastMessageTimestamp(b.id) - getLastMessageTimestamp(a.id)
    );

    const activeChatUser = users.find(u => u.id === activeChatUserId);
    const chatMessages = messages.filter(m =>
        (m.senderId === user!.id && m.receiverId === activeChatUserId) ||
        (m.senderId === activeChatUserId && m.receiverId === user!.id)
    );

    const hasUnread = (senderId: number) =>
        messages.some(m => !m.isRead && m.senderId === senderId && m.receiverId === user!.id);

    const handleUserClick = (userId: number) => {
        setActiveChatUserId(userId);
        markMessagesAsRead(userId, user!.id);
    };

    // 🔔 When viewing a conversation and new messages arrive from that user,
    // mark them as read so notification dots disappear.
    useEffect(() => {
        if (!user || !activeChatUserId) return;

        const unreadFromActive = messages.some(
            m => !m.isRead && m.senderId === activeChatUserId && m.receiverId === user.id
        );

        if (unreadFromActive) {
            markMessagesAsRead(activeChatUserId, user.id);
        }
    }, [messages, activeChatUserId, user, markMessagesAsRead]);

    const handleSendMessage = () => {
        if (!newMessage.trim() || !activeChatUser) return;
        const msg: Message = {
            id: Date.now(),
            senderId: user!.id,
            receiverId: activeChatUser.id,
            text: newMessage,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isRead: false
        };
        addMessage(msg);
        setNewMessage('');
        setShowEmojiPicker(false);
    };

    const handleEmojiClick = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && activeChatUser) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const msg: Message = {
                    id: Date.now(),
                    senderId: user!.id,
                    receiverId: activeChatUser.id,
                    text: '',
                    file: {
                        name: file.name,
                        type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
                        url: reader.result as string,
                        mimeType: file.type
                    },
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isRead: false
                };
                addMessage(msg);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-white">
            <div className="px-8 pt-8 pb-4 border-b border-slate-100">
                <PageHeader title="Chat" subtitle="Connect with your classmates" />
            </div>
            <div className="flex-grow flex overflow-hidden max-w-7xl mx-auto w-full px-8 pb-8 gap-6">
                <Card className="w-1/3 flex flex-col border-slate-200 shadow-lg h-full">
                    <div className="p-4 border-b border-slate-100">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                            />
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                                />
                            </svg>
                        </div>
                    </div>
                    <ul className="overflow-y-auto flex-grow p-2 space-y-1">
                        {sortedUsers.map(u => (
                            <li
                                key={u.id}
                                onClick={() => handleUserClick(u.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                    activeChatUserId === u.id
                                        ? 'bg-violet-50 border border-violet-100'
                                        : 'hover:bg-slate-50 border border-transparent'
                                }`}
                            >
                                <div className="relative">
                                    <UserAvatar user={u} className="w-12 h-12 text-lg" />
                                    {hasUnread(u.id) && (
                                        <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse" />
                                    )}
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <p className="font-bold text-slate-800 truncate">
                                            {u.firstName} {u.lastName}
                                        </p>
                                        <span className="text-xs text-slate-400">Online</span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">{u.role}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>

                <Card className="w-2/3 flex flex-col border-slate-200 shadow-lg h-full">
                    {activeChatUser ? (
                        <>
                            <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-white">
                                <div className="relative">
                                    <UserAvatar user={activeChatUser} />
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">
                                        {activeChatUser.firstName} {activeChatUser.lastName}
                                    </h3>
                                    <p className="text-xs text-green-600 font-medium">Online</p>
                                </div>
                            </div>
                            <div className="flex-grow p-6 overflow-y-auto space-y-6 bg-slate-50/50">
                                {chatMessages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${
                                            msg.senderId === user!.id ? 'justify-end' : 'justify-start'
                                        }`}
                                    >
                                        <div
                                            className={`max-w-md flex flex-col ${
                                                msg.senderId === user!.id ? 'items-end' : 'items-start'
                                            }`}
                                        >
                                            {msg.text && (
                                                <div
                                                    className={`px-5 py-3 rounded-2xl shadow-sm text-sm ${
                                                        msg.senderId === user!.id
                                                            ? 'bg-violet-600 text-white rounded-tr-none'
                                                            : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                                    }`}
                                                >
                                                    <p>{msg.text}</p>
                                                </div>
                                            )}
                                            {msg.file && (
                                                <div className="mt-1">
                                                    {msg.file.mimeType.startsWith('image/') ? (
                                                        <img
                                                            src={msg.file.url}
                                                            alt="attachment"
                                                            className="max-w-[200px] rounded-lg shadow-sm border border-slate-200"
                                                        />
                                                    ) : (
                                                        <div className="px-4 py-3 rounded-lg shadow-sm bg-white text-slate-700 border border-slate-100 flex items-center gap-3">
                                                            <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    strokeWidth={2}
                                                                    stroke="currentColor"
                                                                    className="w-5 h-5"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 6.375L8.545 17.33a1.5 1.5 0 01-2.121-2.121L14.25 7.5"
                                                                    />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-sm underline decoration-slate-300 underline-offset-2">
                                                                    {msg.file.name}
                                                                </p>
                                                                <p className="text-xs text-slate-400">{msg.file.type}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                                                {msg.timestamp}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 bg-white border-t border-slate-100 relative">
                                {showEmojiPicker && (
                                    <div className="absolute bottom-20 left-12 bg-white border border-slate-200 shadow-xl rounded-xl p-3 grid grid-cols-5 gap-2 w-64 h-40 overflow-y-auto">
                                        {EMOJIS.map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => handleEmojiClick(emoji)}
                                                className="text-2xl hover:bg-slate-50 rounded p-1"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                        {ICONS.attach}
                                    </button>
                                    <button
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                        {ICONS.smile}
                                    </button>
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Type a message..."
                                        className="flex-grow px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:bg-white transition-all"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        className="p-3 bg-violet-600 text-white rounded-full hover:bg-violet-700 shadow-md shadow-violet-200 transition-all"
                                    >
                                        {ICONS.send}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                {ICONS.chat}
                            </div>
                            <p>Select a user to start chatting</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};


const GroupDetailPage: React.FC = () => {
  const { user } = useAuth();
  const { groups, updateGroup, addPost, updatePost, deletePost } = useData();
  const { groupId } = useParams();
  const group = groups.find((g) => g.id === Number(groupId));

  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<string>("");
  const [postImageName, setPostImageName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [venue, setVenue] = useState("");

  if (!group) return <div className="p-8">Group not found</div>;

  const canPostToGroup =
    user?.role === Role.ADMIN || user?.id === group.mentor.id;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPostImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = () => {
    if (!postTitle || !postContent || !postImage) {
      alert("Title, Description, and Image are mandatory for group posts.");
      return;
    }
    if (!user) {
      alert("You must be logged in to post.");
      return;
    }

    const newPost: Post = {
      id: Date.now(),
      author: user,
      title: postTitle,
      image: postImage,
      description: postContent,
      fromDate,
      toDate,
      venue,
      likes: [],
      comments: [],
      savedBy: [],
      groupId: group.id,
      timestamp: new Date().toISOString(),
    } as any;

    // Save in global posts state and backend
    addPost(newPost);

    // Also store inside this group's posts so Group Feed shows it
    const updatedGroup: Group = {
      ...group,
      posts: [...group.posts, newPost],
    };
    updateGroup(updatedGroup);

    setPostTitle("");
    setPostContent("");
    setPostImage("");
    setPostImageName("");
    setFromDate("");
    setToDate("");
    setVenue("");
  };

  const handleGroupPostUpdate = (updatedPost: Post) => {
    const postWithGroup = { ...updatedPost, groupId: group.id };
    updatePost(postWithGroup);

    const updatedGroup: Group = {
      ...group,
      posts: group.posts.map((p) =>
        p.id === updatedPost.id ? postWithGroup : p
      ),
    };
    updateGroup(updatedGroup);
  };

  const handleGroupPostDelete = (postId: number) => {
    deletePost(postId);
    const updatedGroup: Group = {
      ...group,
      posts: group.posts.filter((p) => p.id !== postId),
    };
    updateGroup(updatedGroup);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title={group.name} subtitle={group.description}>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200">
          <UserAvatar user={group.mentor} className="w-8 h-8 text-xs" />
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">
              Mentor
            </p>
            <p className="text-sm font-semibold text-slate-700">
              {group.mentor.firstName} {group.mentor.lastName}
            </p>
          </div>
        </div>
      </PageHeader>

      {canPostToGroup && (
        <Card className="mb-10 p-6 border-violet-100 shadow-md">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            Post to Group
          </h3>
          <div className="space-y-4">
            <Input
              label="Title (Mandatory)"
              placeholder="Title"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
            />
            <TextArea
              label="Content (Mandatory)"
              placeholder="Write something..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={2}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                label="From Date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <Input
                type="date"
                label="To Date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <Input
              label="Venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Enter venue"
            />
            <FileInput
              label="Image (Mandatory)"
              accept="image/*"
              onChange={handleImageChange}
              fileName={postImageName}
            />
            {postImage && (
              <img
                src={postImage}
                className="h-20 rounded border border-slate-200"
                alt="Preview"
              />
            )}
            <div className="flex justify-end">
              <Button onClick={handlePost}>Post</Button>
            </div>
          </div>
        </Card>
      )}

      <h3 className="text-lg font-bold text-slate-800 mb-4">
        Group Feed
      </h3>
      {group.posts.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-slate-500">No posts in this group yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {group.posts.map((post) => (
            <PostItem
              key={post.id}
              post={post as Post}
              currentUserId={user!.id}
              onUpdate={handleGroupPostUpdate}
              onDelete={handleGroupPostDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SavedPage: React.FC = () => {
  const { user } = useAuth();
  const { posts, groups, updatePost, updateGroup } = useData();

  const allGroupPosts = groups.flatMap((g) =>
    g.posts.map((p) => ({ ...p, groupId: g.id }))
  );

  const savedGlobalPosts = posts.filter((p) =>
    p.savedBy.includes(user!.id)
  );
  const savedGroupPosts = allGroupPosts.filter((p) =>
    p.savedBy.includes(user!.id)
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Saved Items"
        subtitle="Your collection of saved posts"
      />

      {savedGlobalPosts.length === 0 && savedGroupPosts.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-slate-500">
            You haven't saved any posts yet.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {savedGlobalPosts.map((post) => (
            <PostItem
              key={post.id}
              post={post}
              currentUserId={user!.id}
              onUpdate={updatePost}
            />
          ))}
          {savedGroupPosts.map((post) => {
            const handleGroupPostUpdateInSaved = (updatedPost: Post) => {
              const group = groups.find(
                (g) => g.id === (post as any).groupId
              );
              if (group) {
                const updatedPosts = group.posts.map((p) =>
                  p.id === updatedPost.id ? updatedPost : p
                );
                updateGroup({ ...group, posts: updatedPosts as any });
              }
            };
            return (
              <PostItem
                key={post.id}
                post={post as Post}
                currentUserId={user!.id}
                onUpdate={handleGroupPostUpdateInSaved}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

const GroupsPage: React.FC = () => {
  const { groups } = useData();
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Groups"
        subtitle="Join and participate in student groups"
      />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <Card
            key={group.id}
            className="p-6 hover:shadow-md transition-all cursor-pointer group"
          >
            <div onClick={() => navigate(`/app/groups/${group.id}`)}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-xl">
                  {group.name.charAt(0)}
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    group.isActive
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {group.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {group.name}
              </h3>
              <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                {group.description}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-4">
                <span>{group.membersCount} Members</span>
                <span>{group.category}</span>
              </div>
            </div>
          </Card>
        ))}
        {groups.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No groups found.
          </div>
        )}
      </div>
    </div>
  );
};

const CreateGroupPage: React.FC = () => {
  const { user } = useAuth();
  const { users, addGroup, groups, updateGroup } = useData();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"Public" | "Private">("Public");
  const [mentorId, setMentorId] = useState<number | "">("");

  const mentors = users.filter(
    (u) =>
      u.role === Role.PROFESSOR ||
      u.role === Role.MENTOR ||
      u.role === Role.STUDENT
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || !mentorId) return;

    const selectedMentor = users.find((u) => u.id === Number(mentorId));
    if (!selectedMentor) return;

    const newGroup: Group = {
      id: Date.now(),
      name,
      category,
      description,
      privacy,
      maxMembers: 50,
      mentor: selectedMentor,
      posts: [],
      membersCount: 1,
      isActive: true,
    };

    addGroup(newGroup);
    setName("");
    setCategory("");
    setDescription("");
    setMentorId("");
    alert("Group created successfully");
  };

  const toggleGroupStatus = (group: Group) => {
    updateGroup({ ...group, isActive: !group.isActive });
  };

  if (user?.role !== Role.ADMIN) return <Navigate to="/app/home" />;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader title="Create Group" subtitle="Start a new community group" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              New Group Details
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Group Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />
              <TextArea
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
              />
              <div className="space-y-4">
                <Select
                  label="Privacy"
                  value={privacy}
                  onChange={(e) =>
                    setPrivacy(e.target.value as "Public" | "Private")
                  }
                  options={[
                    { value: "Public", label: "Public" },
                    { value: "Private", label: "Private" },
                  ]}
                />
                <Select
                  label="Assign Mentor"
                  value={mentorId.toString()}
                  onChange={(e) => setMentorId(Number(e.target.value))}
                  options={mentors.map((m) => ({
                    value: m.id.toString(),
                    label: `${m.firstName} ${m.lastName} (${m.role})`,
                  }))}
                  placeholder="Select a mentor"
                  required
                />
              </div>
              <div className="pt-4">
                <Button type="submit" className="w-full">
                  Create Group
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            Manage Groups
          </h3>
          <div className="space-y-4">
            {groups.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                No groups created yet.
              </div>
            ) : (
              groups.map((group) => (
                <Card
                  key={group.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-slate-800">
                      {group.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {group.category} • Mentor: {group.mentor.firstName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        group.isActive
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {group.isActive ? "Active" : "Inactive"}
                    </span>
                    <Button
                      variant={group.isActive ? "danger" : "success"}
                      onClick={() => toggleGroupStatus(group)}
                      className="!py-1 !px-3 text-xs"
                    >
                      {group.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const RegisterUserPage: React.FC = () => {
  const { user } = useAuth();
  const { users, registerUser, updateUser } = useData();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(Role.STUDENT);
  const [department, setDepartment] = useState("");
  const [avatarFile, setAvatarFile] = useState<string>("");
  const [avatarName, setAvatarName] = useState("");

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!username || !password || !email) {
    alert("Username, email and password are required.");
    return;
  }

  try {
    // Call backend
    const res = await fetch(`${API_BASE_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        firstName,
        lastName,
        email,
        password,
        role,
        department,
        avatar: avatarFile,
        isActive: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Backend /api/users error:", res.status, errText);
      throw new Error("Backend returned " + res.status);
    }

    const createdUser: User = await res.json();

    // also update React state so the list updates instantly
    registerUser(createdUser);

    alert("User registered successfully");

    // reset form
    setFirstName("");
    setLastName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setDepartment("");
    setAvatarFile("");
    setAvatarName("");
  } catch (error) {
    //console.error("Register user frontend error:", error);
    //alert("Could not register user in backend. Check server console.");
  }
};


  const toggleUserStatus = (u: User) => {
    if (u.id === user?.id) return;
    updateUser({ ...u, isActive: !u.isActive });
  };

  if (user?.role !== Role.ADMIN) return <Navigate to="/app/home" />;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Register User"
        subtitle="Add new users to the platform"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              New User Details
            </h3>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <Input
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <Input
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <FileInput
                label="Profile Photo"
                accept="image/*"
                onChange={handleAvatarChange}
                fileName={avatarName}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  options={Object.values(Role).map((r) => ({
                    value: r,
                    label: r,
                  }))}
                />
                <Input
                  label="Department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
              <div className="pt-4">
                <Button type="submit" className="w-full">
                  Register User
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            Registered Users
          </h3>
          <div className="space-y-3">
            {users.map((u) => (
              <Card
                key={u.id}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <UserAvatar user={u} />
                  <div>
                    <p className="font-bold text-slate-800">
                      {u.firstName} {u.lastName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                        {u.role}
                      </span>
                      <span>{u.username}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      u.isActive
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                  {u.id !== user?.id && (
                    <Button
                      variant={u.isActive ? "danger" : "success"}
                      onClick={() => toggleUserStatus(u)}
                      className="!py-1 !px-3 text-xs"
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const NotFound: React.FC = () => (
  <div className="p-8 text-center">
    <PageHeader title="404 - Not Found" />
  </div>
);

// ---------------------- DASHBOARD LAYOUT ---------------------- //

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex bg-white min-h-screen font-sans text-slate-600">
      <Sidebar />
      <main className="flex-grow bg-white overflow-y-auto h-screen">
        <Routes>
          {/* index route -> /app */}
          <Route index element={<HomePage />} />
          <Route path="home" element={<HomePage />} />
          <Route path="posts" element={<PostPage />} />
          <Route path="study-material" element={<StudyMaterialPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="groups/:groupId" element={<GroupDetailPage />} />
          <Route path="saved" element={<SavedPage />} />
          <Route path="create-group" element={<CreateGroupPage />} />
          <Route path="register-user" element={<RegisterUserPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
};

// ---------------------- ROOT APP ---------------------- //

export default function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<GetStartedPage />} />
            <Route path="/login" element={<LoginPage />} />
            {/* All app pages under /app/* use Dashboard layout */}
            <Route path="/app/*" element={<Dashboard />} />
            {/* fallback to landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </DataProvider>
  );
}
