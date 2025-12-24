"use client";

import type { CreativeAsset, CreativeSpecs, CreativeType } from "@repo/core/creatives";
import { ImageUploader } from "./ImageUploader";
import { VideoUploader } from "./VideoUploader";
import styles from "./CreativeSlot.module.css";

interface CreativeSlotProps {
  /** Type of creative (image or video) */
  type: CreativeType;
  /** Current asset value */
  value: CreativeAsset | null;
  /** Called when asset changes */
  onChange: (asset: CreativeAsset | null) => void;
  /** Creative specifications */
  specs: CreativeSpecs;
  /** Label for the slot */
  label?: string;
  /** Help text */
  helpText?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Show variable source option */
  showVariableOption?: boolean;
  /** Available columns for variable selection */
  availableColumns?: string[];
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Test ID prefix */
  testId?: string;
}

/**
 * Wrapper component that renders the appropriate uploader based on creative type.
 * Handles requirements display from ad type definitions.
 */
export function CreativeSlot({
  type,
  value,
  onChange,
  specs,
  label,
  helpText,
  required = false,
  showVariableOption = false,
  availableColumns = [],
  disabled = false,
  testId = "creative-slot",
}: CreativeSlotProps) {
  return (
    <div className={styles.container} data-testid={`${testId}-${type}`}>
      {type === "video" ? (
        <VideoUploader
          value={value}
          onChange={onChange}
          specs={specs}
          label={label}
          helpText={helpText}
          required={required}
          disabled={disabled}
          testId="video-uploader"
        />
      ) : (
        <ImageUploader
          value={value}
          onChange={onChange}
          specs={specs}
          label={label}
          helpText={helpText}
          required={required}
          showVariableOption={showVariableOption}
          availableColumns={availableColumns}
          disabled={disabled}
          testId="image-uploader"
        />
      )}
    </div>
  );
}
