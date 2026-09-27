
"use client";

import { useEffect, useRef, useState } from "react";
import EmojiPickerReact, {
  EmojiClickData,
  Theme,
} from "emoji-picker-react";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export default function EmojiPicker({
  onEmojiSelect,
}: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const handleEmojiClick = (
    emojiData: EmojiClickData
  ) => {
    onEmojiSelect(emojiData.emoji);
  };

  return (
    <div
      className="relative flex items-center"
      ref={pickerRef}
    >
      {/* Emoji Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 transition-all duration-200 text-xl active:scale-95"
      >
        😊
      </button>

      {/* Emoji Picker */}
      {open && (
        <div
          className="
            absolute
            bottom-14
            left-0
            z-50
            shadow-2xl
            rounded-2xl
            overflow-hidden
            animate-in
            fade-in
            zoom-in
            duration-200
          "
        >
          <EmojiPickerReact
            onEmojiClick={handleEmojiClick}
            theme={Theme.LIGHT}
            lazyLoadEmojis={true}
            searchDisabled={false}
            skinTonesDisabled={false}
            previewConfig={{
              showPreview: true,
            }}
            width={
              typeof window !== "undefined" &&
              window.innerWidth < 640
                ? 300
                : 360
            }
            height={
              typeof window !== "undefined" &&
              window.innerHeight < 700
                ? 350
                : 450
            }
          />
        </div>
      )}
    </div>
  );
}