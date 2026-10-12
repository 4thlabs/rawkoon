import type { RefObject } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/dialog";
import { centerAspectCrop } from "./avatarCrop";
import "react-image-crop/dist/ReactCrop.css";

interface AvatarCropDialogProps {
  selectedImageUrl: string | null;
  crop: Crop | undefined;
  completedCrop: PixelCrop | undefined;
  imageRef: RefObject<HTMLImageElement | null>;
  isUploading: boolean;
  onCropChange: (crop: Crop) => void;
  onCropComplete: (crop: PixelCrop) => void;
  onCancel: () => void;
  onApply: () => void;
}

export function AvatarCropDialog({
  selectedImageUrl,
  crop,
  completedCrop,
  imageRef,
  isUploading,
  onCropChange,
  onCropComplete,
  onCancel,
  onApply,
}: AvatarCropDialogProps) {
  const { t } = useTranslation("common");

  return (
    <Dialog
      isOpen={Boolean(selectedImageUrl)}
      onClose={onCancel}
      title={t("settings.profile.cropPhoto")}
    >
      <div className="space-y-4">
        {selectedImageUrl && (
          <div className="overflow-auto">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => onCropChange(percentCrop)}
              onComplete={(cropPixels) => onCropComplete(cropPixels)}
              aspect={1}
              circularCrop
              keepSelection
            >
              <img
                decoding="async"
                ref={imageRef}
                src={selectedImageUrl}
                alt={t("settings.profile.profilePictureAlt")}
                className="max-h-[60dvh] w-auto"
                onLoad={(event) => {
                  const { width, height } = event.currentTarget;
                  onCropChange(centerAspectCrop(width, height, 1));
                }}
              />
            </ReactCrop>
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isUploading}
          >
            {t("settings.profile.cancelCrop")}
          </Button>
          <Button
            type="button"
            onClick={onApply}
            disabled={isUploading || !completedCrop}
          >
            {isUploading
              ? t("settings.profile.uploading")
              : t("settings.profile.applyCrop")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
