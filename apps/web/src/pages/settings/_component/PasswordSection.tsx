import type { FormEventHandler } from "react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { PasswordFormData } from "./profileFormTypes";

interface PasswordSectionProps {
  onSubmit: FormEventHandler<HTMLFormElement>;
  registerPassword: UseFormRegister<PasswordFormData>;
  passwordErrors: FieldErrors<PasswordFormData>;
  newPassword: string;
  isPending: boolean;
}

export function PasswordSection({
  onSubmit,
  registerPassword,
  passwordErrors,
  newPassword,
  isPending,
}: PasswordSectionProps) {
  const { t } = useTranslation("common");

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <h3 className="text-lg font-medium text-neutral-100">
        {t("settings.profile.changePassword") || "Change Password"}
      </h3>

      {/* Current Password */}
      <div>
        <label
          htmlFor="profile-form-current-password"
          className="block text-sm font-medium text-neutral-300 mb-2"
        >
          {t("settings.profile.currentPassword") || "Current Password"}
        </label>
        <input
          id="profile-form-current-password"
          type="password"
          {...registerPassword("current_password", {
            required:
              t("settings.profile.currentPasswordRequired") ||
              "Current password is required",
          })}
          placeholder={
            t("settings.profile.currentPasswordPlaceholder") ||
            "Enter your current password"
          }
          className="focus-ring w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-neutral-100 focus:border-transparent"
        />
        {passwordErrors.current_password && (
          <p className="mt-1 text-sm text-red-400">
            {passwordErrors.current_password.message}
          </p>
        )}
      </div>

      {/* New Password */}
      <div>
        <label
          htmlFor="profile-form-new-password"
          className="block text-sm font-medium text-neutral-300 mb-2"
        >
          {t("settings.profile.newPassword")}
        </label>
        <input
          id="profile-form-new-password"
          type="password"
          {...registerPassword("new_password", {
            required:
              t("settings.profile.newPasswordRequired") ||
              "New password is required",
            minLength: {
              value: 8,
              message:
                t("settings.profile.passwordMinLength") ||
                "Password must be at least 8 characters",
            },
          })}
          placeholder={t("settings.profile.newPasswordPlaceholder")}
          className="focus-ring w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-neutral-100 focus:border-transparent"
        />
        {passwordErrors.new_password && (
          <p className="mt-1 text-sm text-red-400">
            {passwordErrors.new_password.message}
          </p>
        )}
        <p className="mt-1 text-sm text-neutral-400">
          {t("settings.profile.passwordHelp")}
        </p>
      </div>

      {/* Confirm New Password */}
      <div>
        <label
          htmlFor="profile-form-confirm-password"
          className="block text-sm font-medium text-neutral-300 mb-2"
        >
          {t("settings.profile.confirmPassword") || "Confirm New Password"}
        </label>
        <input
          id="profile-form-confirm-password"
          type="password"
          {...registerPassword("confirm_password", {
            required:
              t("settings.profile.confirmPasswordRequired") ||
              "Please confirm your new password",
            validate: (value) =>
              value === newPassword ||
              t("settings.profile.passwordMismatch") ||
              "Passwords do not match",
          })}
          placeholder={
            t("settings.profile.confirmPasswordPlaceholder") ||
            "Confirm your new password"
          }
          className="focus-ring w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-neutral-100 focus:border-transparent"
        />
        {passwordErrors.confirm_password && (
          <p className="mt-1 text-sm text-red-400">
            {passwordErrors.confirm_password.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending
          ? t("settings.profile.saving")
          : t("settings.profile.updatePassword") || "Update Password"}
      </Button>
    </form>
  );
}
