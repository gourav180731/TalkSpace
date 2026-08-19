import { useState } from "react";
import { sendFriendRequestApi } from "../../apis/friend.api";
import ProfilePeek from "../profile/ProfilePeek";
import { useProfilePeek } from "../profile/useProfilePeek";

type Props = {
  user: any;
};

export default function SearchResultItem({ user }: Props) {
  const { user: peekUser, pos, open, close } = useProfilePeek();

  //  local optimistic state
  const [requestStatus, setRequestStatus] = useState<
    "none" | "sent" | "friend"
  >(
    user.isFriend
      ? "friend"
      : user.requestStatus === "sent"
      ? "sent"
      : "none"
  );

  const handleAdd = async () => {
    if (requestStatus !== "none") return;

    // optimistic UI
    setRequestStatus("sent");

    try {
      await sendFriendRequestApi(user._id);
    } catch (err) {
      console.error("Failed to send request");
      setRequestStatus("none"); 
    }
  };

  return (
    <>
      <div
        className="
          flex items-center gap-3
          p-3 rounded-xl
          bg-white/5 hover:bg-white/10
          transition
        "
      >
        {/* Avatar (peek trigger) */}
        <img
          src={user.avatar}
          onClick={(e) => open(e, user)}
          className="w-11 h-11 rounded-full object-cover cursor-pointer"
        />

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">
            {user.username}
          </p>
          <p className="text-xs text-white/60 truncate">
            {requestStatus === "friend"
              ? "Friend"
              : requestStatus === "sent"
              ? "Request sent"
              : "Not connected"}
          </p>
        </div>

        {/* Actions */}
        {requestStatus === "none" && (
          <button
            onClick={handleAdd}
            className="
              text-xs px-3 py-1.5
              rounded-lg
              bg-indigo-500 hover:bg-indigo-600
              text-white
            "
          >
            Add
          </button>
        )}

        {requestStatus === "sent" && (
          <span className="text-xs text-white/50">
            Sent
          </span>
        )}

        {requestStatus === "friend" && (
          <span className="text-xs text-green-400">
            Friend
          </span>
        )}
      </div>

      {/* Profile Peek */}
      {peekUser && (
        <ProfilePeek
          user={peekUser}
          pos={pos}
          onClose={close}
        />
      )}
    </>
  );
}
