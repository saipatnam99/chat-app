/**
 * DEPRECATED SOCKET HANDLER
 *
 * Note: `server/server.js` now implements socket handlers inline and does
 * not require this module. This file is kept for reference only. Requiring
 * this module will still return a handler, but you'll see a runtime warning.
 */

console.warn(
  "DEPRECATED: server/socket/socket.js is deprecated. server/server.js implements sockets inline."
);

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("Connected");

    socket.on("register-user", (userId) => {
      socket.join(`user_${userId}`);
    });

    socket.on("send-message", (data) => {
      io.emit("receive-message", data);
    });

    socket.on(
      "typing",
      ({ to, userName }) => {
        io.to(`user_${to}`).emit(
          "typing",
          {
            userName,
          }
        );
      }
    );

    socket.on("stop-typing", ({ to }) => {
      io.to(`user_${to}`).emit(
        "stop-typing"
      );
    });

    socket.on("call-initiate", (data) => {
      io.to(`user_${data.to}`).emit(
        "call-initiate",
        data
      );
    });

    socket.on("call-accept", (data) => {
      io.to(`user_${data.to}`).emit(
        "call-accepted",
        data
      );
    });

    socket.on("call-reject", (data) => {
      io.to(`user_${data.to}`).emit(
        "call-rejected"
      );
    });

    socket.on("call-signal", (data) => {
      io.to(`user_${data.to}`).emit(
        "call-signal",
        data
      );
    });

    socket.on("call-end", (data) => {
      io.to(`user_${data.to}`).emit(
        "call-ended"
      );
    });

    socket.on("disconnect", () => {
      console.log("Disconnected");
    });
  });
};

module.exports = socketHandler;