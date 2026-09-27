

const express = require("express");

const http = require("http");

const cors = require("cors");

const dotenv = require("dotenv");

const jwt = require("jsonwebtoken");

const path = require("path");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");

const messageRoutes = require("./routes/messageRoutes");
const fileRoutes = require("./routes/fileRoutes");

const { Server } = require("socket.io");

const Conversation = require("./models/Conversation");
const Message = require("./models/Message");
const User = require("./models/User");

const auth = require("./middleware/authMiddleware");

dotenv.config();

connectDB();

const app = express();

const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "https://communication-app-sk.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", auth, require("./routes/userRoutes"));
app.use("/api/conversations", auth, require("./routes/conversationRoutes"));
app.use("/api/messages", auth, messageRoutes);
app.use("/download", fileRoutes);




const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

const connectedUsers = new Map();

const authenticateSocket = (socket) => {
  const tokenFromAuth = socket.handshake.auth?.token;
  const tokenFromHeader = socket.handshake.headers.authorization
    ? socket.handshake.headers.authorization.split(" ")[1]
    : null;
  const token = tokenFromAuth || tokenFromHeader;

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

io.on("connection", async (socket) => {

  const authenticatedUser = authenticateSocket(socket);

  if (!authenticatedUser) {
    console.log("Socket authentication failed:", socket.id);
    socket.disconnect(true);
    return;
  }

  const account = await User.findById(authenticatedUser.id)
    .select("_id email name entity");

  if (!account) {
    console.log("Socket user no longer exists:", socket.id);
    socket.disconnect(true);
    return;
  }

  const user = {
    ...authenticatedUser,
    id: account._id.toString(),
    email: account.email,
    name: account.name,
    entity: account.entity,
  };

  socket.user = user;
  const userId = user.id?.toString();
  connectedUsers.set(userId, socket.id);
  socket.join(`user_${userId}`);

  socket.on("register-user", (registeredUserId) => {
    const nextUserId = registeredUserId?.toString();
    if (!nextUserId) return;

    connectedUsers.set(nextUserId, socket.id);
    socket.join(`user_${nextUserId}`);
  });

  // Typing Indicator


  socket.on("typing", ({ to, userName }) => {
    io.to(`user_${to}`).emit("typing", {
      userName,
    });
  });

  socket.on("stop-typing", ({ to }) => {
    io.to(`user_${to}`).emit("stop-typing");
  });

  console.log(`Socket connected: ${socket.id} (user ${userId})`);

  // Broadcast user online status to all connected clients
  io.emit("user-online", userId);

  socket.on("join-conversation", async (conversationId) => {
    try {
      const conversation = await Conversation.findById(
        conversationId
      );

      if (
        !conversation ||
        !conversation.participants.some(
          (participant) =>
            participant.toString() === user.id
        )
      ) {
        return;
      }

      socket.join(`conversation_${conversationId}`);
    } catch (error) {
      console.error("Join conversation error:", error);
    }
  });

  socket.on("leave-conversation", (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
  });

  socket.on("send-message", async (data) => {
    try {
      if (!data?.conversationId) {
        return;
      }

      const conversation = await Conversation.findById(
        data.conversationId
      );

      if (
        !conversation ||
        !conversation.participants.some(
          (participant) =>
            participant.toString() === user.id
        )
      ) {
        return;
      }

      io.to(`conversation_${data.conversationId}`).emit(
        "receive-message",
        data
      );
    } catch (error) {
      console.error("Socket send-message error:", error);
    }
  });

  // Call event handlers
  socket.on("call-initiate", async (data) => {
    try {
      const recipientId = data.to?.toString();
      const recipientSocketId = connectedUsers.get(recipientId);

      if (!recipientSocketId) {
        io.to(`user_${recipientId}`).emit("call-initiate", {
          from: userId,
          userName: user.email || user.name || "Unknown User",
          type: data.type,
        });
        return;
      }

      io.to(recipientSocketId).emit("call-initiate", {
        from: userId,
        userName: user.email || user.name || "Unknown User",
        type: data.type,
      });
    } catch (error) {
      console.error("Call initiate error:", error);
      socket.emit("call-failed", {
        error: "Failed to initiate call",
      });
    }
  });

  socket.on("call-accept", async (data) => {
    try {
      const callerId = (data.to || data.from)?.toString();
      const callerSocketId = connectedUsers.get(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit("call-accepted", {
          from: userId,
          type: data.type,
        });
      } else {
        io.to(`user_${callerId}`).emit("call-accepted", {
          from: userId,
          type: data.type,
        });
      }
    } catch (error) {
      console.error("Call accept error:", error);
    }
  });

  socket.on("call-reject", async (data) => {
    try {
      const callerId = (data.to || data.from)?.toString();
      const callerSocketId = connectedUsers.get(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit("call-rejected", {
          from: userId,
        });
      } else {
        io.to(`user_${callerId}`).emit("call-rejected", {
          from: userId,
        });
      }
    } catch (error) {
      console.error("Call reject error:", error);
    }
  });

  socket.on("call-end", async (data) => {
    try {
      const otherUserId = (data.to || data.from)?.toString();
      const otherUserSocketId = connectedUsers.get(otherUserId);
      if (otherUserSocketId) {
        io.to(otherUserSocketId).emit("call-ended", {
          from: userId,
        });
      } else {
        io.to(`user_${otherUserId}`).emit("call-ended", {
          from: userId,
        });
      }
    } catch (error) {
      console.error("Call end error:", error);
    }
  });

  socket.on("call-signal", async (data) => {
    try {
      const recipientId = data.to?.toString();
      const recipientSocketId = connectedUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("call-signal", {
          from: userId,
          signal: data.signal,
        });
      } else {
        io.to(`user_${recipientId}`).emit("call-signal", {
          from: userId,
          signal: data.signal,
        });
      }
    } catch (error) {
      console.error("Call signal error:", error);
    }
  });

  socket.on("disconnect", () => {
    if (connectedUsers.get(userId) === socket.id) {
      connectedUsers.delete(userId);
    }
    console.log(
      `Socket disconnected: ${socket.id} (user ${userId})`
    );

    // Broadcast user offline status to all connected clients
    io.emit("user-offline", userId);
  });
});

const cleanupExpiredMessages = async () => {
  try {
    const expirationDate = new Date(
      Date.now() - 10 * 60 * 1000
    );

    // const expiredMessages = await Message.find({
    //   seenAt: { $lte: expirationDate },
    // });
    const expiredMessages = await Message.find({
      seenAt: { $ne: null, $lte: expirationDate },
    });

    if (expiredMessages.length === 0) {
      return;
    }

    const expiredIds = expiredMessages.map((message) => message._id.toString());

    expiredMessages.forEach((message) => {
      io.to(`conversation_${message.conversationId.toString()}`).emit(
        "message-deleted",
        {
          messageId: message._id.toString(),
          conversationId: message.conversationId.toString(),
        }
      );
    });

    await Message.deleteMany({
      _id: { $in: expiredIds },
    });
  } catch (error) {
    console.error(
      "Cleanup expired messages error:",
      error
    );
  }
};

setInterval(cleanupExpiredMessages, 60 * 1000);

app.get("/", (req, res) => {
  res.send("API Running");
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((error, req, res, next) => {
  console.error("Express error:", error);

  if (error?.message?.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: error.message,
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});