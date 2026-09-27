"use client";

import { Send, X, Reply } from "lucide-react";
import { useEffect, useRef } from "react";
import EmojiPicker from "./EmojiPicker";

interface Props {
  message: string;
  setMessage: (value: string) => void;
  sendMessage: () => void;
  replyingTo: any;
  cancelReply: () => void;
  handleFileUpload: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  uploading: boolean;
  sending: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function ChatInput({
  message,
  setMessage,
  sendMessage,
  replyingTo,
  cancelReply,
  handleFileUpload,
  uploading,
  sending,
  inputRef,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (replyingTo) {
      inputRef?.current?.focus();
      inputRef?.current?.setSelectionRange(
        inputRef.current.value.length,
        inputRef.current.value.length
      );
    }
  }, [replyingTo, inputRef]);

  return (
    <div className="w-full  bg-white px-3 sm:px-4 md:px-6 py-3">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Reply className="w-4 h-4 text-blue-600 mt-1" />

            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-blue-700">
                Replying to {replyingTo?.sender?.name || "Unknown"}
              </p>

              <p className="text-xs sm:text-sm text-slate-700 truncate">
                {replyingTo?.text || "[File shared]"}
              </p>
            </div>
          </div>

          <button
            onClick={cancelReply}
            className="rounded-full p-1.5 hover:bg-blue-100"
          >
            <X className="w-4 h-4 text-blue-700" />
          </button>
        </div>
      )}

      {/* Main Input Row */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Emoji Picker */}
        <EmojiPicker
          onEmojiSelect={(emoji) =>
            setMessage(message + emoji)
          }
        />

        {/* File Upload */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="h-11 w-11 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-lg"
        >
          {uploading ? "⏳" : "+"}
        </button>

        {/* Message Input */}
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder={
            replyingTo
              ? "Write your reply..."
              : "Type a message..."
          }
          className="
            flex-1
            rounded-full
            border
            border-slate-300
            px-4
            py-3
            text-sm
            sm:text-base
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
            text-black
          "
        />

        {/* Send Button */}
        <button
          onClick={sendMessage}
          disabled={!message.trim() || sending}
          className="
    h-12
    w-12
    rounded-full
    bg-blue-600
    hover:bg-blue-700
    disabled:opacity-50
    flex
    items-center
    justify-center
  "
        >
          {sending ? (
            <span className="animate-spin text-white text-lg">
              ⟳
            </span>
          ) : (
            <Send className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="hidden sm:flex items-center justify-between mt-2 px-2">
        <p className="text-xs text-slate-400">
          Press Enter to send
        </p>

        <p className="text-xs text-slate-400">
          Secure messaging
        </p>
      </div>
    </div>
  );
}