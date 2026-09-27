
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { conversationId, text, replyTo } = req.body;

    if (!conversationId || !text) {
      return res.status(400).json({
        success: false,
        message: "conversationId and text are required",
      });
    }

    const conversation = await Conversation.findById(
      conversationId
    );

    if (
      !conversation ||
      !conversation.participants.some(
        (participant) =>
          participant.toString() === senderId
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to send message in this conversation",
      });
    }

    // Validate replyTo if provided
    if (replyTo) {
      const replyMessage = await Message.findById(replyTo);
      if (!replyMessage) {
        return res.status(404).json({
          success: false,
          message: "Reply-to message not found",
        });
      }
    }

    const message = await Message.create({
      conversationId,
      sender: senderId,
      text,
      replyTo: replyTo || null,
      readBy: [senderId], // Sender has read their own message
    });

    const populatedMessage = await Message.findById(
      message._id
    )
      .populate("sender", "name")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name" },
      });

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      success: false,
      message: "Server error sending message",
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "conversationId is required",
      });
    }

    const conversation = await Conversation.findById(
      conversationId
    );

    if (
      !conversation ||
      !conversation.participants.some(
        (participant) =>
          participant.toString() === userId
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view messages for this conversation",
      });
    }

    const messages = await Message.find({
      conversationId,
    })
      .populate("sender", "name email")
      .populate("readBy", "name")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name" },
      })
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      success: false,
      message: "Server error loading messages",
    });
  }
};

exports.editMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to edit this message",
      });
    }

    message.text = req.body.text || message.text;
    message.edited = true;
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    console.error("Edit message error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating message",
    });
  }
};

exports.markConversationMessagesSeen = async (
  req,
  res
) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "conversationId is required",
      });
    }

    const conversation = await Conversation.findById(conversationId);

    if (
      !conversation ||
      !conversation.participants.some(
        (participant) =>
          participant.toString() === userId
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to mark messages as seen for this conversation",
      });
    }

    // Add current user to readBy array for all unseen messages
    // const result = await Message.updateMany(
    //   {
    //     conversationId,
    //     sender: { $ne: userId },
    //     readBy: { $ne: userId },
    //   },
    //   {
    //     $addToSet: { readBy: userId },
    //     seenAt: new Date(),
    //   }
    // );
    const result = await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        readBy: { $ne: userId },
      },
      {
        $addToSet: { readBy: userId },
      }
    );

    // Set seenAt ONLY once
    await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        seenAt: null,
      },
      {
        seenAt: new Date(),
      }
    );

    res.status(200).json({
      success: true,
      message: "Messages marked as seen",
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark messages seen error:", error);
    res.status(500).json({
      success: false,
      message: "Server error marking messages as seen",
    });
  }
};

exports.deleteMessage = async (
  req,
  res
) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this message",
      });
    }

    await message.deleteOne();

    res.status(200).json({
      success: true,
      message: "Message deleted",
    });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting message",
    });
  }
};

exports.uploadMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { conversationId } = req.body;
    const file = req.file;

    if (!conversationId || !file) {
      return res.status(400).json({
        success: false,
        message: "conversationId and file are required",
      });
    }

    const conversation = await Conversation.findById(
      conversationId
    );

    if (
      !conversation ||
      !conversation.participants.some(
        (participant) =>
          participant.toString() === senderId
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to upload file to this conversation",
      });
    }

    // Create a temporary file URL (in production, use cloud storage like AWS S3)
    const fileUrl = `/uploads/${file.filename}`;

    const message = await Message.create({
      conversationId,
      sender: senderId,
      text: "",
      fileUrl,
      fileName: file.originalname,
      fileType: file.mimetype,
      readBy: [senderId],
    });

    await message.populate("sender", "name");

    res.status(201).json(message);
  } catch (error) {
    console.error("Upload message error:", error);
    res.status(500).json({
      success: false,
      message: "Server error uploading file",
    });
  }
};

// Mark a message as read by a user
exports.markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { readBy: userId } },
      { new: true }
    )
      .populate("sender", "name")
      .populate("readBy", "name")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name" },
      });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    res.status(200).json(message);
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "Server error marking message as read",
    });
  }
};

// Forward a message to another conversation
exports.forwardMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId, targetConversationId } = req.body;

    if (!messageId || !targetConversationId) {
      return res.status(400).json({
        success: false,
        message: "messageId and targetConversationId are required",
      });
    }

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: "Message to forward not found",
      });
    }

    const targetConversation = await Conversation.findById(
      targetConversationId
    );
    if (
      !targetConversation ||
      !targetConversation.participants.some(
        (p) => p.toString() === userId
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to forward to this conversation",
      });
    }

    // Create forwarded message
    const forwardedMessage = await Message.create({
      conversationId: targetConversationId,
      sender: userId,
      text: originalMessage.text,
      fileUrl: originalMessage.fileUrl,
      fileName: originalMessage.fileName,
      fileType: originalMessage.fileType,
      isForwarded: true,
      originalSender: originalMessage.sender,
      readBy: [userId],
    });

    const populatedMessage = await forwardedMessage
      .populate("sender", "name")
      .populate("originalSender", "name")
      .populate("readBy", "name");

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Forward message error:", error);
    res.status(500).json({
      success: false,
      message: "Server error forwarding message",
    });
  }
};