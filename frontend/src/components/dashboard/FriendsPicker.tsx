import { useMemo } from "react";
import FriendsPickerPanel from "./FriendsPickerPanel";
import FriendsPickerSheet from "./FriendsPickerSheet";

type Props = {
  friends: any[]; // must be ONLY accepted friends
  onSelect: (user: any) => void;
  onClose: () => void;
};

export default function FriendsPicker({
  friends = [],
  onSelect,
  onClose,
}: Props) {

const sortedFriends = useMemo(() => {
  return [...friends]
    .filter(
      (f) =>
        !("requestStatus" in f) || f.isFriend === true
    )
    .sort((a, b) => a.username.localeCompare(b.username));
}, [friends]);


  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block">
        <FriendsPickerPanel
          friends={sortedFriends}
          onSelect={onSelect}
          onClose={onClose}
        />
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <FriendsPickerSheet
          friends={sortedFriends}
          onSelect={onSelect}
          onClose={onClose}
        />
      </div>
    </>
  );
}
