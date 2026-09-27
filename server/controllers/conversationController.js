const Conversation = require(
  "../models/Conversation"
);

exports.createConversation = async (
  req,
  res
) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "receiverId is required",
      });
    }

    if (senderId === receiverId) {
      return res.status(400).json({
        success: false,
        message: "Cannot create a conversation with yourself",
      });
    }

    const existingConversation =
      await Conversation.findOne({
        participants: {
          $all: [senderId, receiverId],
        },
      });

    if (existingConversation) {
      return res.status(200).json(existingConversation);
    }

    const newConversation =
      await Conversation.create({
        participants: [senderId, receiverId],
      });

    res.status(201).json(newConversation);
  } catch (error) {
    console.error("Conversation creation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating conversation",
    });
  }
};

exports.getUserConversations = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const conversations =
      await Conversation.find({
        participants: userId,
      }).populate(
        "participants",
        "name email avatar"
      );

    res.json(conversations);
  } catch (error) {
    console.error("Fetch conversations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load conversations",
    });
  }
};