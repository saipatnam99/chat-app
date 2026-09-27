// const mongoose = require("mongoose");

// const messageSchema = new mongoose.Schema(
//   {
//     sender: String,
//     text: String,
//   },
//   {
//     timestamps: true,
//   }
// );

// module.exports = mongoose.model("Message", messageSchema);

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    text: {
      type: String,
    },

    fileUrl: {
      type: String,
      default: null,
    },

    fileName: {
      type: String,
      default: null,
    },

    fileType: {
      type: String,
      default: null,
    },

    edited: {
      type: Boolean,
      default: false,
    },

    // Track who has read this message
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    seenAt: {
      type: Date,
      default: null,
      index: true,
    },

    // Reply-to functionality
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // For forwarding - original message info if forwarded
    isForwarded: {
      type: Boolean,
      default: false,
    },

    originalSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ seenAt: 1 });

module.exports = mongoose.model(
  "Message",
  messageSchema
);