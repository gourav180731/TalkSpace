type Props = {
  request: any;
  onAccept: () => void;
  onReject: () => void;
};

export default function FriendRequestItem({
  request,
  onAccept,
  onReject,
}: Props) {
  const user = request.from;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
      <img
        src={user.avatar}
        className="w-10 h-10 rounded-full object-cover"
      />

      <div className="flex-1 text-white">
        <p className="font-medium leading-tight">
          {user.username}
        </p>
        <p className="text-xs text-white/60">
          wants to be your friend
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="px-3 py-1 text-xs rounded-lg bg-green-500 hover:bg-green-600"
        >
          Accept
        </button>
        <button
          onClick={onReject}
          className="px-3 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
