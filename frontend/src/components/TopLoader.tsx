export default function TopLoader() {
  return (
    <div className="fixed top-0 left-0 w-full h-1 z-[9999] overflow-hidden">
      <div className="h-full w-full bg-indigo-500 animate-loading-bar" />
    </div>
  );
}
