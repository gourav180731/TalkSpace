import { useEffect, useState } from "react";
import {
  getFriendRequestsApi,
  acceptFriendRequestApi,
  rejectFriendRequestApi,
} from "../../apis/friend.api";
import FriendRequestItem from "./FriendRequestItem";

type FriendRequestsProps = {
  onAccepted: () => void;
};

export default function FriendRequests({
  onAccepted,
}: FriendRequestsProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await getFriendRequestsApi();
      setRequests(res.data.requests || res.data || []);
    } finally {
      setLoading(false);
    }
  };

  const accept = async (id: string) => {
    await acceptFriendRequestApi(id);

    // remove request from UI
    setRequests((prev) => prev.filter((r) => r._id !== id));

    // 🔥 refresh friends list in sidebar
    onAccepted();
  };

  const reject = async (id: string) => {
    await rejectFriendRequestApi(id);
    setRequests((prev) => prev.filter((r) => r._id !== id));
  };

  if (loading) {
    return (
      <p className="text-white/60 text-sm mt-4">
        Loading requests...
      </p>
    );
  }

  if (requests.length === 0) {
    return (
      <p className="text-white/60 text-sm mt-4">
        No friend requests
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((r) => (
        <FriendRequestItem
          key={r._id}
          request={r}
          onAccept={() => accept(r._id)}
          onReject={() => reject(r._id)}
        />
      ))}
    </div>
  );
}
