import { LOCAL_USER_ID, localDb } from "@/lib/local-db"
import {
  DEFAULT_CHAT_SETTINGS,
  workspaceDefaultsFromChatSettings
} from "@/lib/mercan/settings"
import { Tables } from "@/types/database"

// Tek ve sabit çalışma alanı: adresler /mercan/chat biçiminde olur.
export const HOME_WORKSPACE_ID = "mercan"

// Giriş ekranı yerine ilk açılışta yerel profil ve çalışma alanını oluşturur.
export const ensureLocalSetup = () => {
  let profile = localDb.filter<Tables<"profiles">>(
    "profiles",
    profile => profile.user_id === LOCAL_USER_ID
  )[0]

  if (!profile) {
    profile = localDb.insert<Tables<"profiles">>("profiles", {
      user_id: LOCAL_USER_ID,
      username: "kullanici",
      display_name: "Sen",
      bio: "",
      profile_context: "",
      image_path: "",
      image_url: "",
      has_onboarded: true,
      use_azure_openai: false
    })
  }

  let workspace = localDb.get<Tables<"workspaces">>(
    "workspaces",
    HOME_WORKSPACE_ID
  )

  if (!workspace) {
    workspace = localDb.insert<Tables<"workspaces">>("workspaces", {
      id: HOME_WORKSPACE_ID,
      user_id: LOCAL_USER_ID,
      name: "Mercan",
      description: "",
      instructions: "",
      image_path: "",
      is_home: true,
      sharing: "private",
      ...workspaceDefaultsFromChatSettings(DEFAULT_CHAT_SETTINGS)
    })
  }

  return { profile, workspace }
}
