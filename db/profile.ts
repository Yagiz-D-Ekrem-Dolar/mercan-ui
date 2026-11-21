import { localDb } from "@/lib/local-db"
import { Tables, TablesUpdate } from "@/types/database"

export const getProfileByUserId = async (userId: string) => {
  const profile = localDb.filter<Tables<"profiles">>(
    "profiles",
    profile => profile.user_id === userId
  )[0]

  if (!profile) {
    throw new Error("Profil bulunamadı.")
  }

  return profile
}

export const updateProfile = async (
  profileId: string,
  profile: TablesUpdate<"profiles">
) => {
  return localDb.update<Tables<"profiles">>("profiles", profileId, profile)
}
