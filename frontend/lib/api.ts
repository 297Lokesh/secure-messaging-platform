import axios, { AxiosError } from "axios";
import {
  User,
  UserSearchItem,
  Contact,
  Conversation,
  Message,
  UserSettings,
} from "@/types";

export const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl.replace(/\/+$/, "");
  }

  // In deployed browser environment (e.g. *.vercel.app), default to production backend
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return "https://secure-messaging-platform-kma1.vercel.app";
  }

  return (envUrl || "http://localhost:8000").replace(/\/+$/, "");
};

export const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("signal_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to handle unauthenticated 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const isAuthRoute = window.location.pathname.startsWith("/login") || window.location.pathname.startsWith("/register");
      if (!isAuthRoute) {
        localStorage.removeItem("signal_token");
        localStorage.removeItem("signal_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth APIs ---
export const authApi = {
  register: async (data: {
    username?: string;
    phone?: string;
    password: string;
    display_name: string;
    avatar_url?: string;
  }) => {
    const res = await api.post("/api/auth/register", data);
    return res.data;
  },

  validateCredentials: async (data: {
    username_or_phone: string;
    password?: string;
    otp?: string | null;
  }) => {
    const payload = {
      username_or_phone: data.username_or_phone,
      password: data.password || "",
      otp: data.otp !== undefined ? data.otp : null,
    };
    const res = await api.post<{
      requires_otp: boolean;
      mock_otp: string;
      phone: string;
      username: string;
      display_name: string;
      message: string;
    }>("/api/auth/validate-credentials", payload);
    return res.data;
  },

  requestLoginOtp: async (data: { username_or_phone: string; password?: string }) => {
    const res = await api.post<{
      requires_otp: boolean;
      mock_otp: string;
      phone: string;
      username: string;
      display_name: string;
      message: string;
    }>("/api/auth/request-login-otp", data);
    return res.data;
  },

  verifyRegistrationOtp: async (data: { phone_or_username: string; otp: string }) => {
    const res = await api.post<{
      verified: boolean;
      message: string;
      username: string;
      phone: string;
    }>("/api/auth/verify-registration-otp", data);
    return res.data;
  },

  verifyOtp: async (data: { phone_or_username: string; otp: string }) => {
    const res = await api.post<{ access_token: string; user: User }>(
      "/api/auth/verify-otp",
      data
    );
    return res.data;
  },

  resendOtp: async (data: { phone_or_username: string }) => {
    const res = await api.post<{ message: string; mock_otp: string; phone?: string }>(
      "/api/auth/resend-otp",
      { phone_or_username: data.phone_or_username, otp: "123456" }
    );
    return res.data;
  },

  login: async (data: { username_or_phone: string; password: string }) => {
    const res = await api.post<{ access_token: string; user: User }>(
      "/api/auth/login",
      data
    );
    return res.data;
  },

  logout: async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      localStorage.removeItem("signal_token");
      localStorage.removeItem("signal_user");
    }
  },

  getMe: async () => {
    const res = await api.get<User>("/api/auth/me");
    return res.data;
  },
};

// --- Users APIs ---
export const usersApi = {
  getUsers: async () => {
    const res = await api.get<User[]>("/api/users");
    return res.data;
  },

  searchUsers: async (query: string) => {
    const res = await api.get<UserSearchItem[]>(`/api/users/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  getUserById: async (id: number) => {
    const res = await api.get<User>(`/api/users/${id}`);
    return res.data;
  },
};

// --- Contacts APIs ---
export const contactsApi = {
  getContacts: async () => {
    const res = await api.get<Contact[]>("/api/contacts");
    return res.data;
  },

  addContact: async (contactUserId: number) => {
    const res = await api.post<Contact>("/api/contacts", {
      contact_user_id: contactUserId,
    });
    return res.data;
  },

  deleteContact: async (contactId: number) => {
    const res = await api.delete(`/api/contacts/${contactId}`);
    return res.data;
  },
};

// --- Conversations APIs ---
export const conversationApi = {
  getConversations: async () => {
    const res = await api.get<Conversation[]>("/api/conversations");
    return res.data;
  },

  getConversationById: async (id: number) => {
    const res = await api.get<Conversation>(`/api/conversations/${id}`);
    return res.data;
  },

  createDirectConversation: async (recipientUserId: number) => {
    const res = await api.post<Conversation>("/api/conversations", {
      type: "direct",
      recipient_user_id: recipientUserId,
    });
    return res.data;
  },

  createGroupConversation: async (name: string, memberUserIds: number[], avatarUrl?: string) => {
    const res = await api.post<Conversation>("/api/conversations", {
      type: "group",
      name,
      member_user_ids: memberUserIds,
      avatar_url: avatarUrl,
    });
    return res.data;
  },

  addMember: async (conversationId: number, userId: number, role: string = "member") => {
    const res = await api.post(`/api/conversations/${conversationId}/members`, {
      user_id: userId,
      role,
    });
    return res.data;
  },

  removeMember: async (conversationId: number, userId: number) => {
    const res = await api.delete(`/api/conversations/${conversationId}/members/${userId}`);
    return res.data;
  },
};

// --- Messages APIs ---
export const messageApi = {
  getMessages: async (conversationId: number, skip: number = 0, limit: number = 50) => {
    const res = await api.get<Message[]>(
      `/api/conversations/${conversationId}/messages?skip=${skip}&limit=${limit}&mark_as_read=true`
    );
    return res.data;
  },

  sendMessage: async (conversationId: number, content: string, replyToId?: number) => {
    const res = await api.post<Message>(`/api/conversations/${conversationId}/messages`, {
      content,
      reply_to_id: replyToId,
      message_type: "text",
    });
    return res.data;
  },

  editMessage: async (messageId: number, content: string) => {
    const res = await api.patch<Message>(`/api/messages/${messageId}`, { content });
    return res.data;
  },

  deleteMessage: async (messageId: number) => {
    const res = await api.delete(`/api/messages/${messageId}`);
    return res.data;
  },

  markAsRead: async (messageId: number) => {
    const res = await api.post(`/api/messages/${messageId}/read`);
    return res.data;
  },
};

// --- Profile & Settings APIs ---
export const profileApi = {
  getProfile: async () => {
    const res = await api.get<User>("/api/profile");
    return res.data;
  },

  updateProfile: async (data: { display_name?: string; avatar_url?: string; phone?: string }) => {
    const res = await api.patch<User>("/api/profile", data);
    return res.data;
  },
};

export const settingsApi = {
  getSettings: async () => {
    const res = await api.get<UserSettings>("/api/settings");
    return res.data;
  },

  updateSettings: async (data: Partial<UserSettings>) => {
    const res = await api.patch<UserSettings>("/api/settings", data);
    return res.data;
  },
};
