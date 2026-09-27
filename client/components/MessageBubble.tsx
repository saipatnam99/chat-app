"use client";

interface Props {
  text: string;
  sender: string;
  deleteMessage: (id: string) => void;
  editMessage: (message: any) => void;
  replyMessage: (message: any) => void;
  forwardMessage: (message: any) => void;
  message: any;
  currentUserId: string;
  isOwn: boolean;
}

export default function MessageBubble({
  text,
  sender,
  deleteMessage,
  editMessage,
  replyMessage,
  forwardMessage,
  message,
  currentUserId,
  isOwn,
}: Props) {
  const serverBase = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    "http://localhost:5001"
  ).replace(/\/api$/i, "");

  const getAttachmentUrl = (path?: string) => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return `${serverBase}${path.startsWith("/") ? path : `/${path}`}`;
  };

  const readByOthers = message.readBy?.filter(
    (user: any) => user._id !== currentUserId
  ) || [];

  const showReadStatus = isOwn && readByOthers.length > 0;

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`${isOwn
          ? "bg-linear-to-br from-blue-500 to-blue-600"
          : "bg-linear-to-br from-gray-200 to-gray-300"
          } ${isOwn ? "text-black" : "text-gray-900"
          } p-3 sm:p-4 rounded-2xl sm:rounded-3xl max-w-xs sm:max-w-sm shadow-md hover:shadow-lg transition-all duration-200 group`}
      >
        {/* Show replied message if exists */}
        {/* Show replied message if exists */}
        {message.replyTo && (
          <div
            className={`${isOwn
              ? "bg-blue-700/50 border-l-2 border-white"
              : "bg-gray-400/50 border-l-2 border-gray-700"
              } px-2 py-1 mb-2 text-xs rounded`}
          >
            <p className="font-semibold opacity-75">
              Replying to {message.replyTo?.sender?.name || "Unknown"}
            </p>

            <p className="truncate opacity-75">
              {message.replyTo?.text || "[File shared]"}
            </p>
          </div>
        )}

        {/* Show forwarded badge if applicable */}
        {message.isForwarded && (
          <div
            className={`text-xs font-semibold mb-1 ${isOwn ? "opacity-75" : "opacity-60"
              }`}
          >
            ⤴️ Forwarded from {message.originalSender?.name || "Unknown"}
          </div>
        )}

        <p className="font-bold text-xs sm:text-sm mb-1">
          {sender}
        </p>

        {message.fileUrl ? (
          <div className="mb-2">
            {message.fileType?.startsWith("image/") && (
              <img
                src={getAttachmentUrl(message.fileUrl)}
                alt={message.fileName}
                className="rounded-xl mb-2 max-h-60 border"
              />
            )}

            <a
              href={getAttachmentUrl(`/download/${message.fileUrl.split("/").pop()}`)}
              target="_blank"
              rel="noreferrer"
              className={`${isOwn
                ? "text-blue-100 hover:text-white"
                : "text-blue-600 hover:text-blue-800"
                } text-xs sm:text-sm font-semibold underline break-all`}
            >
              📎 {message.fileName}
            </a>
          </div>
        ) : null}

        <p className="text-sm sm:text-base wrap-break-word">
          {text}
        </p>

        {/* Read status indicator (eye icon) */}

        <div className="flex items-center gap-1 mt-1 text-xs">
          <span className="opacity-60">
            {new Date(message.createdAt).toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </span>
          {showReadStatus && (
            <span title={`Read by: ${readByOthers
              .map((u: any) => u.name)
              .join(", ")}`}>
              👁️
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 mt-2 flex-wrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => replyMessage(message)}
            className="text-xs font-semibold px-2 sm:px-3 py-1 rounded bg-green-500/20 hover:bg-green-500/30 text-green-200 transition-all duration-150"
            title="Reply"
          >
            ↩️
          </button>
          {/* <button
            onClick={() => forwardMessage(message)}
            className="text-xs font-semibold px-2 sm:px-3 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 transition-all duration-150"
            title="Forward"
          >
            ⤴️
          </button> */}
          {isOwn && (
            <>
              <button
                onClick={() => editMessage(message)}
                className="text-xs font-semibold px-2 sm:px-3 py-1 rounded bg-blue-500 hover:bg-blue-500/30 text-blue-100 transition-all duration-150"
                title="Edit"
              >
                ✏️
              </button>
              <button
                onClick={() => deleteMessage(message._id)}
                className="text-xs font-semibold px-2 sm:px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 transition-all duration-150"
                title="Delete"
              >
                🗑️
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
