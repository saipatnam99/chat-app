
"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import API from "@/lib/axios";
import socket from "@/lib/socket";
import { connectSocket } from "@/lib/socket";
import { useCallStore } from "@/store/useCallStore";
import MessageBubble from "@/components/MessageBubble";
import ChatInput from "@/components/ChatInput";

const Toast = dynamic(
  () => import("@/components/Toast"),
  { ssr: false }
);

const EmojiPicker = dynamic(
  () => import("@/components/EmojiPicker"),
  { ssr: false }
);

const CallWindow = dynamic(
  () => import("@/components/CallWindow"),
  { ssr: false }
);

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Message {
  _id: string;
  text: string;
  createdAt: string;
  edited?: boolean;
  seenAt?: string | null;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  readBy?: any[];
  replyTo?: Message | null;
  isForwarded?: boolean;
  originalSender?: {
    _id: string;
    name: string;
  };
  sender: {
    _id: string;
    name: string;
  };
}

export default function ChatPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] =
    useState<User | null>(null);
  const [conversationId, setConversationId] =
    useState("");
  const [messages, setMessages] = useState<
    Message[]
  >([]);
  const [message, setMessage] = useState("");
  const [editingMessageId, setEditingMessageId] =
    useState<string | null>(null);
  const [editingText, setEditingText] =
    useState("");
  const [currentUser, setCurrentUser] =
    useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    from: string;
    type: "audio" | "video";
    userName: string;
  } | null>(null);
  const [toast, setToast] = useState<
    | { message: string; type: "success" | "error" | "info" }
    | null
  >(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef =
    useRef<HTMLDivElement>(null);
  const previousConversationIdRef =
    useRef<string>("");
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [typingUser, setTypingUser] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
  if (!currentUser) return;

  const register = () => {
    socket.emit("register-user", currentUser._id);
  };

  if (socket.connected) {
    register();
  } else {
    socket.once("connect", register);
  }

  return () => {
    socket.off("connect", register);
  };
}, [currentUser]);

  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 100);
  }, [messages]);

  // Show errors as toast notifications
  useEffect(() => {
    if (error) {
      setToast({ message: error, type: "error" });
    }
  }, [error]);

  // Initialize current user from localStorage
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedUser = localStorage.getItem(
      "user"
    );

    if (!storedUser) {
      router.replace("/login");
      return;
    }

    try {
      setCurrentUser(JSON.parse(storedUser));
    } catch (err) {
      console.error(
        "Failed to parse user from localStorage",
        err
      );
      router.replace("/login");
      setCurrentUser(null);
    }
  }, [router]);

  useEffect(() => {
    connectSocket();
  }, []);

  useEffect(() => {
    if (!currentUser || typeof window === "undefined") {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    socket.auth = { token };

    if (!socket.connected) {
      socket.connect();
    }

    const handleConnectError = (error: Error) => {
      console.error("Socket connection error:", error);
      setToast({ message: "Realtime connection failed. Please refresh.", type: "error" });
    };

    socket.on("connect_error", handleConnectError);

    return () => {
      socket.off("connect_error", handleConnectError);
    };
  }, [currentUser]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!currentUser) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await API.get("/users");

      const filteredUsers = res.data.filter(
        (u: User) => u._id !== currentUser._id
      );

      setUsers(filteredUsers);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    fetchUsers();
  }, [currentUser, fetchUsers]);

  useEffect(() => {
    if (!conversationId || !currentUser) {
      return;
    }

    const previousId = previousConversationIdRef.current;

    if (previousId && previousId !== conversationId) {
      socket.emit("leave-conversation", previousId);
    }

    const emitJoin = () => {
      socket.emit("join-conversation", conversationId);
    };

    if (socket.connected) {
      emitJoin();
    } else {
      socket.once("connect", emitJoin);
    }

    previousConversationIdRef.current = conversationId;
  }, [conversationId, currentUser]);

  const markConversationMessagesSeen = useCallback(
    async (convId: string) => {
      if (!currentUser || !convId) {
        return;
      }

      try {
        await API.put(
          `/messages/conversation/${convId}/seen`
        );
      } catch (err) {
        console.error(
          "Failed to mark messages as seen:",
          err
        );
      }
    },
    [currentUser]
  );

  const handleTyping = useCallback(
    (value: string) => {
      setMessage(value);

      if (!selectedUser || !currentUser) {
        return;
      }

      socket.emit("typing", {
        to: selectedUser._id,
        userName: currentUser.name,
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop-typing", {
          to: selectedUser._id,
        });
      }, 1000);
    },
    [selectedUser, currentUser]
  );


  // Load messages
  const loadMessages = useCallback(
    async (convId: string) => {
      try {
        const res = await API.get(
          `/messages/${convId}`
        );
        setMessages(res.data);
        await markConversationMessagesSeen(convId);
      } catch (err) {
        console.error(
          "Failed to load messages:",
          err
        );
        setError("Failed to load messages");
      }
    },
    [markConversationMessagesSeen]
  );

  // Auto-poll messages and setup socket listeners for online status
  useEffect(() => {
    if (!conversationId) {
      return;
    }

    // Auto-poll messages every 5 seconds
    const startPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollIntervalRef.current = setInterval(() => {
        loadMessages(conversationId);
      }, 5000);
    };

    startPolling();

    // Socket listeners for online status
    const handleUserOnline = (userId: string) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    };

    const handleUserOffline = (userId: string) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    };

    socket.on("user-online", handleUserOnline);
    socket.on("user-offline", handleUserOffline);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      socket.off("user-online", handleUserOnline);
      socket.off("user-offline", handleUserOffline);
    };
  }, [conversationId, loadMessages]);

  const startEditingMessage = useCallback(
    (messageToEdit: Message) => {
      setEditingMessageId(messageToEdit._id);
      setEditingText(messageToEdit.text);
    },
    []
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editingMessageId || !editingText.trim()) {
      return;
    }


    try {
      const res = await API.put(
        `/messages/${editingMessageId}`,
        {
          text: editingText.trim(),
        }
      );

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === editingMessageId
            ? res.data
            : msg
        )
      );
      setEditingMessageId(null);
      setEditingText("");
    } catch (err) {
      console.error("Failed to edit message:", err);
      setError("Failed to update message");
    }
  }, [editingMessageId, editingText]);

  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingText("");
  }, []);

  // Reply to message
  const replyToMessage = useCallback((msg: Message) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  }, []);

  // Cancel reply
  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // Forward message to another conversation
  const forwardMessage = useCallback((msg: Message) => {
    setForwardingMessage(msg);
    setShowForwardModal(true);
  }, []);

  // Handle forward to selected user
  const handleForwardToUser = useCallback(
    async (targetUserId: string) => {
      if (!forwardingMessage || !currentUser) {
        return;
      }

      try {
        // Get or create conversation with target user
        const convRes = await API.post(
          "/conversations",
          {
            receiverId: targetUserId,
          }
        );

        const targetConvId = convRes.data._id;

        // Send forwarded message
        const res = await API.post("/messages/forward", {
          messageId: forwardingMessage._id,
          targetConversationId: targetConvId,
        });

        setToast({
          message: "Message forwarded successfully",
          type: "success",
        });

        setShowForwardModal(false);
        setForwardingMessage(null);
      } catch (err) {
        console.error("Failed to forward message:", err);
        setError("Failed to forward message");
      }
    },
    [forwardingMessage, currentUser]
  );

  // Mark message as read
  const markMessageAsRead = useCallback(
    async (messageId: string) => {
      try {
        await API.post(`/messages/${messageId}/read`);
      } catch (err) {
        console.error("Failed to mark message as read:", err);
      }
    },
    []
  );

  // Select user
  const selectUser = useCallback(
    async (user: User) => {
      if (!currentUser) {
        return;
      }

      setSelectedUser(user);
      setError(null);
      setShowMobileSidebar(false); // Close sidebar on mobile when contact is selected

      try {
        const res = await API.post(
          "/conversations",
          {
            receiverId: user._id,
          }
        );

        setConversationId(res.data._id);
        await loadMessages(res.data._id);
      } catch (err) {
        console.error(
          "Failed to select user:",
          err
        );
        setError("Failed to open conversation");
        setSelectedUser(null);
      }
    },
    [currentUser, loadMessages]
  );

  // Send message
  const sendMessage = useCallback(async () => {
    if (
      !currentUser ||
      !message.trim() ||
      !selectedUser ||
      !conversationId
    ) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await API.post("/messages", {
        conversationId,
        text: message.trim(),
        replyTo: replyingTo?._id || null,
      });

      socket.emit("send-message", res.data);

      setMessages((prev) => [
        ...prev,
        res.data,
      ]);

      setMessage("");
      socket.emit("stop-typing", {
        to: selectedUser._id,
      });

      setTypingUser("");

      setReplyingTo(null);
      inputRef.current?.focus();
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  }, [
    currentUser,
    message,
    selectedUser,
    conversationId,
    replyingTo,
  ]);

  // Handle Enter key press
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // Delete message
  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        await API.delete(
          `/messages/${messageId}`
        );

        setMessages((prev) =>
          prev.filter(
            (msg) => msg._id !== messageId
          )
        );
      } catch (err) {
        console.error(
          "Failed to delete message:",
          err
        );
        setError("Failed to delete message");
      }
    },
    []
  );

  // File upload handler
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0 || !selectedUser || !conversationId) {
        return;
      }

      const file = files[0];
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("conversationId", conversationId);
        formData.append("file", file);

        const res = await API.post("/messages/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setMessages((prev) => [...prev, res.data]);
        socket.emit("send-message", res.data);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        setToast({
          message: "File uploaded successfully",
          type: "success",
        });
      } catch (err) {
        console.error("Failed to upload file:", err);
        setError("Failed to upload file");
      } finally {
        setUploading(false);
      }
    },
    [selectedUser, conversationId]
  );

  // Call handlers
  // const { setIsInCall, setCallType, remoteUserId, isInCall } = useCallStore();
  const {
    setIsInCall,
    setCallType,
    setRemoteUserId,
    setIsCaller,
    remoteUserId,
    isInCall,
  } = useCallStore();

  // const startCall = useCallback(
  //   (type: "audio" | "video") => {
  //     if (!selectedUser) return;

  //     setCallType(type);
  //     setIsInCall(true);

  //     socket.emit("call-initiate", {
  //       to: selectedUser._id,
  //       type,
  //       from: currentUser?._id,
  //       userName: currentUser?.name,
  //     });

  //     setToast({
  //       message: `Calling ${selectedUser.name} for ${type} call...`,
  //       type: "info",
  //     });
  //   },
  //   [selectedUser, currentUser, setCallType, setIsInCall]
  // );

  const startCall = useCallback(
    (type: "audio" | "video") => {
      if (!selectedUser || !currentUser || isInCall) return;

      const emitCall = () => {
        setRemoteUserId(selectedUser._id);
        setCallType(type);
        setIsCaller(true);

        socket.emit("call-initiate", {
          to: selectedUser._id,
          type,
          from: currentUser._id,
          userName: currentUser.name,
        });

        setToast({
          message: `Calling ${selectedUser.name} for ${type} call...`,
          type: "info",
        });
      };

      if (!socket.connected) {
        connectSocket();
        socket.once("connect", emitCall);
        return;
      }

      emitCall();
    },
    [
      selectedUser,
      currentUser,
      setCallType,
      setRemoteUserId,
      setIsCaller,
      isInCall,
    ]
  );

  // const acceptCall = useCallback(
  //   (from: string, type: "audio" | "video") => {
  //     setCallType(type);
  //     setIsInCall(true);
  //     setIncomingCall(null);

  //     socket.emit("call-accept", {
  //       to: from,
  //       type,
  //     });

  //     setToast({
  //       message: "Call accepted. Connecting...",
  //       type: "info",
  //     });
  //   },
  //   [setCallType, setIsInCall]
  // );

  const acceptCall = useCallback(
    (
      from: string,
      type: "audio" | "video"
    ) => {
      setRemoteUserId(from);
      setCallType(type);
      setIsCaller(false);
      setIsInCall(true);
      setIncomingCall(null);
      socket.emit("call-accept", {
        to: from,
        type,
      });
      setToast({
        message: "Call accepted. Connecting...",
        type: "info",
      });
    },
    [
      setCallType,
      setIsInCall,
      setRemoteUserId,
      setIsCaller,
    ]
  );


  const rejectCall = useCallback(
    (from: string) => {
      socket.emit("call-reject", { to: from });
      setIncomingCall(null);
    },
    []
  );

  const endCall = useCallback(() => {
    if (remoteUserId) {
      socket.emit("call-end", {
        to: remoteUserId,
      });
    }

    useCallStore.getState().endCall();
  }, [remoteUserId]);

  // Socket listener for incoming messages
  useEffect(() => {
    const handleReceiveMessage = (data: Message) => {
      setMessages((prev) => {
        // Prevent duplicate messages
        const exists = prev.some(
          (msg) => msg._id === data._id
        );

        if (exists) return prev;

        return [...prev, data];
      });

      if (
        currentUser &&
        data.sender._id !== currentUser._id
      ) {
        markConversationMessagesSeen(
          conversationId
        );
      }
    };

    const handleDeletedMessage = (payload: {
      messageId: string;
    }) => {
      setMessages((prev) =>
        prev.filter(
          (msg) => msg._id !== payload.messageId
        )
      );
    };

    socket.on(
      "receive-message",
      handleReceiveMessage
    );
    socket.on(
      "message-deleted",
      handleDeletedMessage
    );

    return () => {
      socket.off(
        "receive-message",
        handleReceiveMessage
      );
      socket.off(
        "message-deleted",
        handleDeletedMessage
      );
    };
  }, [conversationId, currentUser, markConversationMessagesSeen]);

  // Socket listener for call events

  // Typing indicator listener
  // useEffect(() => {
  //   const handleTyping = (data: {
  //     userName: string;
  //   }) => {
  //     setTypingUser(data.userName);
  //   };

  //   const handleStopTyping = () => {
  //     setTypingUser("");
  //   };

  //   socket.on("typing", handleTyping);
  //   socket.on("stop-typing", handleStopTyping);

  //   return () => {
  //     socket.off("typing", handleTyping);
  //     socket.off("stop-typing", handleStopTyping);
  //   };
  // }, []);

  // Typing indicator listener
  useEffect(() => {
    const handleTyping = ({
      userName,
    }: {
      userName: string;
    }) => {
      setTypingUser(userName);
    };

    const handleStopTyping = () => {
      setTypingUser("");
    };

    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);

    return () => {
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
    };
  }, []);

  useEffect(() => {
    const handleIncomingCall = (data: {
      from: string;
      type: "audio" | "video";
      userName: string;
    }) => {
      setIncomingCall(data);
      setToast({
        message: `${data.userName} is calling...`,
        type: "info",
      });
    };

    const handleCallRejected = (data?: { from?: string }) => {
      setToast({
        message: "Call was rejected",
        type: "error",
      });
      setIncomingCall(null);
      setIsInCall(false);
      setCallType(null);
      setRemoteUserId(null);
    };

    const handleCallEnded = () => {
      setIncomingCall(null);
      setIsInCall(false);
      setCallType(null);
      setRemoteUserId(null);
      setToast({
        message: "Call ended",
        type: "info",
      });
    };

    const handleCallAccepted = (data: {
      from: string;
      type?: "audio" | "video";
    }) => {
      setIncomingCall(null);
      setRemoteUserId(data.from);
      if (data.type) {
        setCallType(data.type);
      }
      setIsCaller(true);
      setIsInCall(true);
      setToast({
        message: "Call accepted",
        type: "success",
      });
    };

    const handleCallFailed = (data?: { error?: string }) => {
      setIncomingCall(null);
      setIsInCall(false);
      setCallType(null);
      setToast({
        message: data?.error || "Call failed",
        type: "error",
      });
    };

    socket.on("call-initiate", handleIncomingCall);
    socket.on("call-rejected", handleCallRejected);
    socket.on("call-ended", handleCallEnded);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("call-failed", handleCallFailed);

    return () => {
      socket.off("call-initiate", handleIncomingCall);
      socket.off("call-rejected", handleCallRejected);
      socket.off("call-ended", handleCallEnded);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("call-failed", handleCallFailed);
    };
  }, [
    setIsInCall,
    setCallType,
    setRemoteUserId,
    setIsCaller,
  ]);

  // Logout handler
  const handleLogout = useCallback(() => {
    if (conversationId && socket.connected) {
      socket.emit("leave-conversation", conversationId);
    }

    localStorage.removeItem("user");
    localStorage.removeItem("token");
    socket.disconnect();
    router.push("/login");
  }, [conversationId, router]);

  return (
    <div className="h-screen flex flex-col md:flex-row bg-linear-to-br from-slate-50 to-slate-100 overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => {
            setToast(null);
            setError(null);
          }}
        />
      )}

      {/* SIDEBAR - Mobile drawer overlay + desktop sidebar */}
      {/* Mobile Overlay */}
      {showMobileSidebar && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`flex flex-col w-full sm:w-72 bg-white border-r border-slate-200 overflow-y-auto shadow-sm fixed md:static inset-y-0 left-0 z-50 md:z-auto transition-transform duration-300 ${showMobileSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } md:w-80 h-screen md:h-auto`}>
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-linear-to-r from-blue-600 to-blue-700 text-white">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Messages
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1">
            {users.length} contacts
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-4 sm:p-6 text-center text-slate-500">
            <div className="inline-block animate-spin text-lg">
              ⟳
            </div>
            <p className="text-xs sm:text-sm mt-2">
              Loading chats...
            </p>
          </div>
        )}

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {users.length > 0 ? (
            users.map((user) => (
              <button
                type="button"
                key={user._id}
                onClick={() => selectUser(user)}
                className={`w-full text-left p-3 sm:p-4 border-b border-slate-100 cursor-pointer transition-all duration-200 ${selectedUser?._id === user._id
                  ? "bg-blue-50 border-l-4 border-l-blue-600"
                  : "hover:bg-slate-50 hover:shadow-sm"
                  }`}
                aria-label={`Chat with ${user.name}`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="relative">
                    <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-xs sm:text-sm shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    {onlineUsers.has(user._id) && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-sm sm:text-base text-slate-900 truncate">
                      {user.name}
                    </h2>
                    <p className="text-xs text-slate-500 truncate">
                      {onlineUsers.has(user._id) ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : !loading ? (
            <div className="p-4 sm:p-6 text-center text-slate-500">
              <p className="text-xs sm:text-sm">No contacts</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* CHAT AREA */}
      {/* <div className="flex-1 flex flex-col w-full md:w-auto"> */}
      <div className="flex-1 flex flex-col h-screen md:h-full overflow-hidden">
        {/* CHAT HEADER */}
        <div className="sticky top-0 z-30 min-h-16 sm:min-h-20 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between px-3 sm:px-6 md:px-8 shadow-sm shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 flex-wrap">
            {/* Selected User Info */}
            <div className="flex-1 min-w-0">
              {selectedUser ? (
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 truncate">
                    {selectedUser.name}
                  </h2>

                  <div className="h-5">
                    {typingUser ? (
                      <p className="text-xs sm:text-sm text-green-500 animate-pulse font-medium">
                        typing...
                      </p>
                    ) : (
                      <p className="text-xs sm:text-sm text-slate-500">
                        {onlineUsers.has(selectedUser._id)
                          ? "Online"
                          : "Offline"}
                      </p>
                    )}
                  </div>
                </div>
                // <div className="min-w-0">
                //   <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 truncate">
                // 
                //   </h2>
                //<p className="text-xs sm:text-sm text-slate-500 truncate hidden sm:block">
                // {selectedUser.email}
                //</p> 
                // </div>
              ) : (
                <h2 className="text-sm sm:text-base text-slate-400 font-medium">
                  Select a contact
                </h2>
              )}
            </div>

            {/* Call Buttons - Visible on all screen sizes when user selected */}
            {selectedUser && (
              <div className="flex flex-wrap gap-1 sm:gap-2 md:gap-2 md:items-center md:ml-auto md:pr-4 md:border-r md:border-slate-200">
                <button
                  type="button"
                  onClick={() =>
                    startCall("audio")
                  }
                  disabled={isInCall}
                  title="Start Audio Call"
                  className="p-1.5 sm:p-2 md:p-2.5 rounded-full bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white transition-all duration-200 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center text-lg sm:text-xl"
                >
                  ☎️
                </button>
                <button
                  type="button"
                  onClick={() =>
                    startCall("video")
                  }
                  disabled={isInCall}
                  title="Start Video Call"
                  className="p-1.5 sm:p-2 md:p-2.5 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white transition-all duration-200 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center text-lg sm:text-xl"
                >
                  📹
                </button>
              </div>
            )}

            {/* Mobile Contact Selector Button */}
            {!selectedUser && (
              <button
                type="button"
                onClick={() => setShowMobileSidebar(true)}
                className="md:hidden px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer"
              >
                👥 Contacts
              </button>
            )}

            {/* Mobile Back Button */}
            {selectedUser && (
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setMessages([]);
                  setShowMobileSidebar(false);
                }}
                className="md:hidden px-2 sm:px-3 py-1.5 bg-slate-500 hover:bg-slate-600 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer"
              >
                ← Back
              </button>
            )}
          </div>

          {/* Current User & Logout - Desktop Version */}
          <div className="hidden md:flex md:items-center md:gap-3 md:border-l md:border-slate-200 md:pl-6 ml-4 min-w-0">
            {currentUser && (
              <div className="flex items-center gap-2 md:gap-3">
                <div className="text-right hidden lg:block">
                  <p className="text-xs lg:text-sm font-semibold text-slate-900">
                    {currentUser.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    You
                  </p>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-linear-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-xs md:text-sm shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1 sm:gap-2 shrink-0"
              title="Logout from your account"
            >
              <span className="hidden sm:inline">🚪</span>
              <span className="text-xs sm:text-sm">Logout</span>
            </button>
          </div>

          {/* Hamburger Menu Button for Sidebar */}
          <button
            type="button"
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="md:hidden px-2 py-1.5 text-slate-600 hover:text-slate-900 transition-all duration-200 text-xl shrink-0"
            title="Toggle contacts menu"
          >
            ☰
          </button>

          {/* Mobile User Menu - Hidden on Desktop */}
          <div className="md:hidden flex flex-wrap items-center gap-1 sm:gap-2 w-full justify-end">
            {currentUser && (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-linear-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-xs shrink-0  sm:flex">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="px-1.5 sm:px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer shrink-0"
              title="Logout"
            >
              <span className="hidden sm:inline">🚪 Logout</span>
              <span className="sm:hidden">🚪</span>
            </button>
          </div>
        </div>

        {/* MESSAGES CONTAINER */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 min-h-0">
          {messages.length === 0 && selectedUser && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-slate-400 text-xl sm:text-2xl mb-2">
                  👋
                </p>
                <p className="text-xs sm:text-base text-slate-500">
                  No messages yet. Say hello to{" "}
                  <span className="font-semibold">
                    {selectedUser.name}
                  </span>
                </p>
              </div>
            </div>
          )}


          {messages.map((msg) => {
            const isOwnMessage =
              currentUser?._id === msg.sender._id;

            // Mark message as read
            if (
              !isOwnMessage &&
              !msg.readBy?.some(
                (u: any) => u._id === currentUser?._id
              )
            ) {
              markMessageAsRead(msg._id);
            }

            return (
              <div key={`${msg._id}-${msg.createdAt}`}>
                {editingMessageId === msg._id ? (
                  <div
                    className={`flex ${isOwnMessage
                      ? "justify-end"
                      : "justify-start"
                      }`}
                  >
                    <div className="bg-white border rounded-2xl p-3 shadow w-full max-w-md">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) =>
                          setEditingText(e.target.value)
                        }
                        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />

                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 text-xs bg-slate-200 rounded-lg"
                        >
                          Cancel
                        </button>

                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <MessageBubble
                    // key={`${msg._id}-${msg.createdAt}`}
                    key={msg._id}
                    text={msg.text}
                    sender={msg.sender.name}
                    message={msg}
                    currentUserId={currentUser?._id || ""}
                    isOwn={isOwnMessage}
                    deleteMessage={deleteMessage}
                    editMessage={startEditingMessage}
                    replyMessage={replyToMessage}
                    forwardMessage={forwardMessage}
                  />
                )}
              </div>
            );
          })}
          {typingUser && (
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="bg-slate-200 rounded-2xl px-4 py-2 text-sm text-slate-600 shadow-sm animate-pulse">
                {typingUser} is typing...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* MESSAGE INPUT */}

        {selectedUser ? (
          // <div className="p-3 sm:p-6 bg-linear-to-t from-slate-50 to-white border-t border-slate-200 shrink-0">
          <div className="sticky bottom-0 z-20 p-3 sm:p-6 bg-white border-t border-slate-200 shrink-0 text-black">
            <ChatInput
              message={message}
              setMessage={handleTyping}
              sendMessage={sendMessage}
              replyingTo={replyingTo}
              cancelReply={cancelReply}
              handleFileUpload={handleFileUpload}
              uploading={uploading}
              sending={sending}
              inputRef={inputRef}
            />
          </div>
        ) : (
          <div className="p-4 sm:p-8 bg-linear-to-t from-slate-50 to-white border-t border-slate-200 text-center shrink-0">
            <p className="text-slate-400 text-xs sm:text-sm">
              Select a contact to start messaging
            </p>
          </div>
        )}
        {/* CALL WINDOW OVERLAY */}
        {isInCall && remoteUserId && (
          <CallWindow
            remoteUserId={remoteUserId}
            onEndCall={endCall}
          />
        )}

        {/* INCOMING CALL MODAL */}
        {incomingCall && !isInCall && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm w-full">
              <div className="text-center">
                <div className="text-5xl sm:text-6xl mb-4">
                  {incomingCall.type === "video"
                    ? "📹"
                    : "☎️"}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                  {incomingCall.userName} is calling...
                </h3>
                <p className="text-slate-500 text-sm sm:text-base mb-6">
                  {incomingCall.type === "video"
                    ? "Video call"
                    : "Audio call"}
                </p>

                <div className="flex gap-3 sm:gap-4 justify-center">
                  <button
                    onClick={() =>
                      rejectCall(incomingCall.from)
                    }
                    className="px-6 sm:px-8 py-2 sm:py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-all duration-200 cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() =>
                      acceptCall(
                        incomingCall.from,
                        incomingCall.type
                      )
                    }
                    className="px-6 sm:px-8 py-2 sm:py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full transition-all duration-200 cursor-pointer"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FORWARD MESSAGE MODAL */}
        {showForwardModal && forwardingMessage && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm w-full max-h-96 overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">
                Forward message to
              </h3>
              <div className="space-y-2">
                {users.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => handleForwardToUser(user._id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-blue-50 border border-slate-200 transition-all duration-200 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-900">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {user.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowForwardModal(false);
                  setForwardingMessage(null);
                }}
                className="w-full mt-4 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold rounded-lg transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

  );
}