const express = require("express");

const router = express.Router();

const {
  createConversation,
  getUserConversations,
} = require(
  "../controllers/conversationController"
);

router.post("/", createConversation);
router.get("/", getUserConversations);

module.exports = router;