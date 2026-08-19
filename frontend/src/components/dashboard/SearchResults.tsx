import SearchResultItem from "./SearchResultItem";

type Props = {
  users: any[];
};

export default function SearchResults({ users }: Props) {
  if (users.length === 0) {
    return (
      <p className="text-white/60 text-sm text-center mt-4">
        No users found
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <SearchResultItem key={user._id} user={user} />
      ))}
    </div>
  );
}
