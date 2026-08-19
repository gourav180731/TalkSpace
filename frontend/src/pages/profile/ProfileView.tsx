import { TextInput, Textarea, Select, Button } from "@mantine/core";

const today = new Date();

const maxDate = new Date(
  today.getFullYear() - 12,
  today.getMonth(),
  today.getDate()
)
  .toISOString()
  .split("T")[0];

const minDate = new Date(
  today.getFullYear() - 101,
  today.getMonth(),
  today.getDate()
)
  .toISOString()
  .split("T")[0];


export function ProfileView({
  profile,
  setProfile,
  errors,
  loading,
  uploading,
  fileRef,
  getFullName,
  updateFullName,
  handleUpload,
  saveChanges,
  logout,
}: any) {
  if (!profile) return null;

  return (
    <div className="
      max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[35%_65%]
      p-4 md:p-6
      md:bg-white/10 md:rounded-3xl md:border md:border-white/20
      md:backdrop-blur-2xl md:shadow-2xl
    ">
      {/* LEFT */}
      <div className="flex flex-col items-center text-white pr-6 border-r border-white/20">
        <div className="relative">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              className="w-28 h-28 rounded-full object-cover border-4 border-white/40"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center text-3xl">
              👤
            </div>
          )}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-1 right-1 bg-black/40 p-2 rounded-full"
          >
            {uploading ? "⏳" : "📷"}
          </button>

          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/*"
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </div>

        <h2 className="mt-4 text-xl font-semibold">
          {profile.firstName} {profile.lastName}
        </h2>
        <p className="text-white/80">@{profile.username}</p>
        <p className="text-white/80">{profile.email}</p>

        <button
          type="button"
          onClick={logout}
          className="hidden sm:block mt-6 px-4 py-2 rounded-xl
          bg-red-500/30 border border-red-400/40"
        >
          Logout
        </button>
      </div>

      {/* RIGHT */}
      <div className="pl-6 flex flex-col gap-6 text-white">
        <TextInput
          label="Username"
          value={profile.username}
          error={errors.username}
          onChange={(e) =>
            setProfile({ ...profile, username: e.target.value })
          }
        />

        <div className="hidden sm:grid grid-cols-2 gap-4">
          <TextInput
            label="First Name"
            value={profile.firstName}
            error={errors.firstName}
            onChange={(e) =>
              setProfile({ ...profile, firstName: e.target.value })
            }
          />
          <TextInput
            label="Last Name"
            value={profile.lastName}
            error={errors.lastName}
            onChange={(e) =>
              setProfile({ ...profile, lastName: e.target.value })
            }
          />
        </div>

        <div className="sm:hidden">
          <TextInput
            label="Name"
            value={getFullName()}
            error={errors.firstName}
            onChange={(e) => updateFullName(e.target.value)}
          />
        </div>
<TextInput
  label="Date of Birth"
  type="date"
  value={profile.dob || ""}
  min={minDate}   // 101 years ago
  max={maxDate}   // 12 years ago
  error={errors.dob}
  onChange={(e) =>
    setProfile({ ...profile, dob: e.target.value })
  }
/>


        <Select
          label="Gender"
          data={["male", "female", "other"]}
          value={profile.gender}
          onChange={(v) =>
            setProfile({ ...profile, gender: v || "male" })
          }
        />

        <Textarea
          label="Bio"
          value={profile.bio}
          error={errors.bio}
          onChange={(e) =>
            setProfile({ ...profile, bio: e.target.value })
          }
        />

        <Button
          type="button"
          loading={loading}
          onClick={saveChanges}
          fullWidth
          radius="lg"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
