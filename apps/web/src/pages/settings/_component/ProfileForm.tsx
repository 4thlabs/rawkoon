import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Crop, PixelCrop } from "react-image-crop";
import { useCurrentUser } from "@/lib/auth/useAuth";
import {
  useUpdateProfile,
  useChangePassword,
  useUploadAvatar,
} from "@/pages/settings/useUsers";
import { AvatarCropDialog } from "./AvatarCropDialog";
import { PasswordSection } from "./PasswordSection";
import type { PasswordFormData, ProfileFormData } from "./profileFormTypes";
import type { UpdateProfileRequest } from "@rawkoon/shared/types";

const MAX_AVATAR_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_CROPPED_DIMENSION_PX = 1024;

export function ProfileForm({
  part = "both",
}: {
  /** The page shows account details and the password on separate pages. */
  part?: "profile" | "password" | "both";
}) {
  const { t } = useTranslation("common");
  const { data: currentUser } = useCurrentUser();
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();
  const uploadAvatarMutation = useUploadAvatar();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    defaultValues: {
      first_name: "",
      last_name: "",
    },
  });

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    watch,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>({
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  // react-hook-form's watch() opts this component out of React Compiler.
  // eslint-disable-next-line react-hooks/incompatible-library
  const newPassword = watch("new_password");

  useEffect(() => {
    if (currentUser) {
      resetProfile({
        first_name: currentUser.first_name || "",
        last_name: currentUser.last_name || "",
      });
    }
  }, [currentUser, resetProfile]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    const updates: UpdateProfileRequest = {};

    if (data.first_name !== (currentUser?.first_name || "")) {
      updates.first_name = data.first_name;
    }

    if (data.last_name !== (currentUser?.last_name || "")) {
      updates.last_name = data.last_name;
    }

    if (Object.keys(updates).length === 0) {
      toast.info(t("settings.profile.noChanges") || "No changes to save");
      return;
    }

    try {
      await updateProfileMutation.mutateAsync(updates);
      toast.success(t("settings.profile.updateSuccess"));
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(
        (error instanceof Error ? error.message : null) ||
          t("settings.profile.updateError"),
      );
    }
  };

  const uploadAvatarFile = async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await uploadAvatarMutation.mutateAsync(formData);
    const nextAvatar = response.avatar_url || response.url || null;
    setAvatarPreview(nextAvatar);
  };

  const onAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
        toast.error(t("settings.profile.maxFileSizeError"));
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setSelectedImageUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return objectUrl;
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error(
        (error instanceof Error ? error.message : null) ||
          t("settings.profile.avatarUpdateError"),
      );
    } finally {
      event.target.value = "";
    }
  };

  const onCropCancel = () => {
    setSelectedImageUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  const onCropApply = async () => {
    if (!imageRef.current || !completedCrop || !selectedImageUrl) return;

    const image = imageRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const sourceWidth = Math.max(1, Math.round(completedCrop.width * scaleX));
    const sourceHeight = Math.max(1, Math.round(completedCrop.height * scaleY));
    const downscaleFactor = Math.min(
      1,
      MAX_CROPPED_DIMENSION_PX / Math.max(sourceWidth, sourceHeight),
    );
    const outputWidth = Math.max(1, Math.round(sourceWidth * downscaleFactor));
    const outputHeight = Math.max(
      1,
      Math.round(sourceHeight * downscaleFactor),
    );

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      toast.error(t("settings.profile.avatarUpdateError"));
      return;
    }

    const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });

    try {
      await uploadAvatarFile(croppedFile);
      toast.success(t("settings.profile.avatarUpdateSuccess"));
      onCropCancel();
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error(
        (error instanceof Error ? error.message : null) ||
          t("settings.profile.avatarUpdateError"),
      );
    }
  };

  useEffect(() => {
    return () => {
      if (selectedImageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(selectedImageUrl);
      }
    };
  }, [selectedImageUrl]);

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      await changePasswordMutation.mutateAsync({
        current_password: data.current_password,
        new_password: data.new_password,
      });
      resetPassword();
      toast.success(
        t("settings.profile.passwordUpdateSuccess") ||
          "Password updated successfully",
      );
    } catch (error) {
      console.error("Password change error:", error);
      toast.error(
        (error instanceof Error ? error.message : null) ||
          t("settings.profile.passwordUpdateError") ||
          "Failed to update password",
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <form
        hidden={part === "password"}
        onSubmit={handleProfileSubmit(onProfileSubmit)}
        className="space-y-6"
      >
        <h3 className="text-lg font-medium text-neutral-100">
          {t("settings.profile.personalInfo") || "Personal Information"}
        </h3>

        <div>
          <p className="block text-sm font-medium text-neutral-300 mb-2">
            {t("settings.profile.profilePicture")}
          </p>
          <div className="flex items-center gap-4">
            {avatarPreview || currentUser?.avatar_url ? (
              <img
                decoding="async"
                src={avatarPreview || currentUser?.avatar_url || ""}
                alt={t("settings.profile.profilePictureAlt")}
                className="h-14 w-14 rounded-full object-cover border border-neutral-600"
              />
            ) : (
              <div className="h-14 w-14 rounded-full border border-neutral-600 bg-neutral-700 text-neutral-300 flex items-center justify-center font-semibold text-sm">
                {`${currentUser?.first_name?.[0] || ""}${currentUser?.last_name?.[0] || ""}`.toUpperCase() ||
                  "U"}
              </div>
            )}
            <label className="inline-flex cursor-pointer items-center px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-neutral-100 hover:bg-neutral-600 transition-colors">
              <span>
                {uploadAvatarMutation.isPending
                  ? t("settings.profile.uploading")
                  : t("settings.profile.uploadPhoto")}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={onAvatarChange}
                disabled={uploadAvatarMutation.isPending}
                className="hidden"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            {t("settings.profile.imageRequirements")}
          </p>
        </div>

        {/* Email (Read-only) */}
        <div>
          <label
            htmlFor="profile-form-email"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            {t("settings.profile.email")}
          </label>
          <input
            id="profile-form-email"
            type="email"
            value={currentUser?.email || ""}
            disabled
            className="focus-ring w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-neutral-400 cursor-not-allowed"
          />
          <p className="mt-1 text-sm text-neutral-400">
            {t("settings.profile.emailReadOnly")}
          </p>
        </div>

        {/* First Name */}
        <div>
          <label
            htmlFor="profile-form-first-name"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            {t("settings.profile.firstName")}
          </label>
          <input
            id="profile-form-first-name"
            type="text"
            {...registerProfile("first_name")}
            placeholder={t("settings.profile.firstNamePlaceholder")}
            className="focus-ring w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-neutral-100 focus:border-transparent"
          />
        </div>

        {/* Last Name */}
        <div>
          <label
            htmlFor="profile-form-last-name"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            {t("settings.profile.lastName")}
          </label>
          <input
            id="profile-form-last-name"
            type="text"
            {...registerProfile("last_name")}
            placeholder={t("settings.profile.lastNamePlaceholder")}
            className="focus-ring w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-neutral-100 focus:border-transparent"
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={updateProfileMutation.isPending}
          className="w-full"
        >
          {updateProfileMutation.isPending
            ? t("settings.profile.saving")
            : t("settings.profile.saveChanges")}
        </Button>
      </form>

      {part === "both" && <div className="border-t border-neutral-700" />}

      {/* Password Section */}
      {part !== "profile" && (
        <PasswordSection
          onSubmit={handlePasswordSubmit(onPasswordSubmit)}
          registerPassword={registerPassword}
          passwordErrors={passwordErrors}
          newPassword={newPassword}
          isPending={changePasswordMutation.isPending}
        />
      )}

      <AvatarCropDialog
        selectedImageUrl={selectedImageUrl}
        crop={crop}
        completedCrop={completedCrop}
        imageRef={imageRef}
        isUploading={uploadAvatarMutation.isPending}
        onCropChange={setCrop}
        onCropComplete={setCompletedCrop}
        onCancel={onCropCancel}
        onApply={onCropApply}
      />
    </div>
  );
}
