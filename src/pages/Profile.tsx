import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Camera, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useIsMundusAdmin } from "@/hooks/useIsMundusAdmin";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { getActiveRole, setActiveRole, type ActiveRole } from "@/lib/activeRole";
import { supabase } from "@/integrations/supabase/client";
import AvatarCropModal from "@/components/profile/AvatarCropModal";
import { transformedPublicUrl } from "@/lib/imageOptimization";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { company } = useCurrentCompany();
  const { isAdmin } = useIsMundusAdmin();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pickedSrc, setPickedSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) { setAvatarUrl(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) setAvatarUrl((data?.avatar_url as string | null) ?? null);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const onFilePicked = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(t("profile.avatar.invalidType", { defaultValue: "Please pick an image file" }));
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error(t("profile.avatar.tooLarge", { defaultValue: "Image is too large (max 15MB)" }));
      return;
    }
    const url = URL.createObjectURL(file);
    setPickedSrc(url);
    setCropOpen(true);
  };

  const handleConfirmCrop = async (blob: Blob) => {
    if (!user?.id) return;
    setSavingAvatar(true);
    try {
      const path = `${user.id}/avatar.webp`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, {
          upsert: true,
          contentType: "image/webp",
          cacheControl: "2592000",
        });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?s=${blob.size}`;
      const { error: updErr } = await supabase
        .from("users")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (updErr) throw updErr;
      setAvatarUrl(url);
      window.dispatchEvent(new CustomEvent("profile:avatar-updated", { detail: { url } }));
      setCropOpen(false);
      if (pickedSrc) URL.revokeObjectURL(pickedSrc);
      setPickedSrc(null);
      toast.success(t("profile.avatar.updated", { defaultValue: "Photo updated" }));
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleCancelCrop = () => {
    setCropOpen(false);
    if (pickedSrc) URL.revokeObjectURL(pickedSrc);
    setPickedSrc(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const availableRoles: ActiveRole[] = [
    ...(company?.is_buyer ? (["buyer"] as ActiveRole[]) : []),
    ...(company?.is_supplier ? (["supplier"] as ActiveRole[]) : []),
    ...(isAdmin ? (["admin"] as ActiveRole[]) : []),
  ];
  const showSwitch = availableRoles.length >= 2;
  const inferredRole: ActiveRole = location.pathname.startsWith("/supplier")
    ? "supplier"
    : location.pathname.startsWith("/admin")
    ? "admin"
    : "buyer";
  const saved = getActiveRole();
  const currentRole: ActiveRole =
    saved && availableRoles.includes(saved) ? saved : inferredRole;

  const handleRoleChange = (role: ActiveRole) => {
    if (role === currentRole) return;
    setActiveRole(role);
    navigate(`/${role}`, { replace: true });
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "U";
  const displayName = user?.email?.split("@")[0] ?? t("shell.nav.profile", { defaultValue: "Profile" });

  const handleLogout = async () => {
    await signOut();
    toast.success(t("common.signedOut"));
    navigate("/login", { replace: true });
  };

  return (
    <div className="profile-page">
      <button
        type="button"
        className="profile-back"
        onClick={() => navigate(`/${currentRole}`)}
      >
        <ArrowLeft size={16} />
        <span>{t("common.backToHome", { defaultValue: "Back to home" })}</span>
      </button>
      <div className="profile-card">
        <div className="profile-avatar-wrap">
          <span className="profile-avatar">
            {avatarUrl ? (
              <img
                src={transformedPublicUrl(avatarUrl, { width: 144, height: 144, quality: 80 })}
                alt={displayName}
                width={72}
                height={72}
                loading="lazy"
                decoding="async"
                className="profile-avatar-img"
              />
            ) : (
              initials
            )}
          </span>
          <button
            type="button"
            className="profile-avatar-edit"
            onClick={() => fileRef.current?.click()}
            aria-label={t("profile.avatar.change", { defaultValue: "Change profile photo" })}
          >
            <Camera size={14} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFilePicked(f);
              e.currentTarget.value = "";
            }}
          />
        </div>
        <span className="profile-name">{displayName}</span>
        {user?.email && <span className="profile-sub">{user.email}</span>}
        {company?.name && <span className="profile-sub">{company.name}</span>}
      </div>

      <div className="profile-section">
        <h3>{t("common.language", { defaultValue: "Language" })}</h3>
        <div className="md-lang-row">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => i18n.changeLanguage(l.code)}
              className={`md-lang-btn ${i18n.resolvedLanguage === l.code ? "is-active" : ""}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {showSwitch && (
        <div className="profile-section">
          <h3>{t("profile.activeRole", { defaultValue: "Active profile" })}</h3>
          <div className="role-switch">
            {availableRoles.map((role) => (
              <button
                key={role}
                type="button"
                className={`role-switch-btn ${currentRole === role ? "is-active" : ""}`}
                onClick={() => handleRoleChange(role)}
                aria-pressed={currentRole === role}
              >
                {t(`profile.${role}`, {
                  defaultValue: role.charAt(0).toUpperCase() + role.slice(1),
                })}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="profile-spacer" />

      <button type="button" className="profile-logout" onClick={handleLogout}>
        {t("common.signOut")}
      </button>

      <AvatarCropModal
        open={cropOpen}
        imageSrc={pickedSrc}
        onCancel={handleCancelCrop}
        onConfirm={handleConfirmCrop}
        busy={savingAvatar}
      />
    </div>
  );
}