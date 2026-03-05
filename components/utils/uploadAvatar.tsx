import { supabase } from "@/supabase";

function extFromUri(uri: string) {
  const m = uri.match(/\.([a-zA-Z0-9]+)$/);
  return (m?.[1] ?? "jpg").toLowerCase();
}

export async function uploadAvatarAndGetPublicUrl(userId: string, uri: string) {
  const ext = extFromUri(uri);
  const path = `${userId}/${Date.now()}.${ext}`;

  // transforma URI em ArrayBuffer (funciona no Expo)
  const res = await fetch(uri);
  const arrayBuffer = await res.arrayBuffer();

  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, arrayBuffer, {
      contentType: ext === "png" ? "image/png" : "image/jpeg",
      upsert: true,
    });

  if (upErr) throw upErr;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}