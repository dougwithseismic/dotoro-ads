"use client";

import { useCallback } from "react";
import type { DemographicTarget, Gender } from "@repo/core";
import { COMMON_LANGUAGES } from "@repo/core";
import styles from "./DemographicTargeting.module.css";

export interface DemographicTargetingProps {
  demographics: DemographicTarget | undefined;
  onChange: (demographics: DemographicTarget | undefined) => void;
}

const GENDERS: { id: Gender; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
];

const AGE_PRESETS = [
  { label: "18-24", min: 18, max: 24 },
  { label: "25-34", min: 25, max: 34 },
  { label: "35-44", min: 35, max: 44 },
  { label: "45-54", min: 45, max: 54 },
  { label: "55-64", min: 55, max: 64 },
  { label: "65+", min: 65, max: 120 },
];

export function DemographicTargeting({
  demographics,
  onChange,
}: DemographicTargetingProps) {
  const handleAgeChange = useCallback(
    (field: "ageMin" | "ageMax", value: string) => {
      const numValue = value === "" ? undefined : parseInt(value, 10);
      const newDemographics = {
        ...demographics,
        [field]: numValue,
      };

      // Check if demographics is empty
      const isEmpty =
        newDemographics.ageMin === undefined &&
        newDemographics.ageMax === undefined &&
        (!newDemographics.genders || newDemographics.genders.length === 0) &&
        (!newDemographics.languages || newDemographics.languages.length === 0);

      onChange(isEmpty ? undefined : newDemographics);
    },
    [demographics, onChange]
  );

  const handleGenderToggle = useCallback(
    (gender: Gender) => {
      const currentGenders = demographics?.genders || [];
      const newGenders = currentGenders.includes(gender)
        ? currentGenders.filter((g) => g !== gender)
        : [...currentGenders, gender];

      const newDemographics = {
        ...demographics,
        genders: newGenders.length > 0 ? newGenders : undefined,
      };

      // Check if demographics is empty
      const isEmpty =
        newDemographics.ageMin === undefined &&
        newDemographics.ageMax === undefined &&
        (!newDemographics.genders || newDemographics.genders.length === 0) &&
        (!newDemographics.languages || newDemographics.languages.length === 0);

      onChange(isEmpty ? undefined : newDemographics);
    },
    [demographics, onChange]
  );

  const handleLanguageToggle = useCallback(
    (langCode: string) => {
      const currentLanguages = demographics?.languages || [];
      const newLanguages = currentLanguages.includes(langCode)
        ? currentLanguages.filter((l) => l !== langCode)
        : [...currentLanguages, langCode];

      const newDemographics = {
        ...demographics,
        languages: newLanguages.length > 0 ? newLanguages : undefined,
      };

      // Check if demographics is empty
      const isEmpty =
        newDemographics.ageMin === undefined &&
        newDemographics.ageMax === undefined &&
        (!newDemographics.genders || newDemographics.genders.length === 0) &&
        (!newDemographics.languages || newDemographics.languages.length === 0);

      onChange(isEmpty ? undefined : newDemographics);
    },
    [demographics, onChange]
  );

  const handleAgePreset = useCallback(
    (min: number, max: number) => {
      const newDemographics = {
        ...demographics,
        ageMin: min,
        ageMax: max,
      };
      onChange(newDemographics);
    },
    [demographics, onChange]
  );

  const selectedLanguages = demographics?.languages || [];
  const popularLanguages = COMMON_LANGUAGES.slice(0, 8);

  return (
    <div className={styles.container}>
      {/* Age Range */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Age Range</label>
        <div className={styles.ageRow}>
          <div className={styles.ageInputGroup}>
            <input
              type="number"
              className={styles.ageInput}
              value={demographics?.ageMin ?? ""}
              onChange={(e) => handleAgeChange("ageMin", e.target.value)}
              placeholder="Min"
              min={13}
              max={120}
              data-testid="age-min"
            />
            <span className={styles.ageSeparator}>to</span>
            <input
              type="number"
              className={styles.ageInput}
              value={demographics?.ageMax ?? ""}
              onChange={(e) => handleAgeChange("ageMax", e.target.value)}
              placeholder="Max"
              min={13}
              max={120}
              data-testid="age-max"
            />
          </div>
        </div>
        <div className={styles.agePresets}>
          {AGE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={`${styles.presetButton} ${
                demographics?.ageMin === preset.min &&
                demographics?.ageMax === preset.max
                  ? styles.presetActive
                  : ""
              }`}
              onClick={() => handleAgePreset(preset.min, preset.max)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gender */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Gender</label>
        <div className={styles.checkboxGroup}>
          {GENDERS.map((gender) => (
            <button
              key={gender.id}
              type="button"
              className={`${styles.checkboxButton} ${
                demographics?.genders?.includes(gender.id)
                  ? styles.checkboxActive
                  : ""
              }`}
              onClick={() => handleGenderToggle(gender.id)}
              data-testid={`gender-${gender.id}`}
            >
              <span className={styles.checkbox}>
                {demographics?.genders?.includes(gender.id) && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              {gender.label}
            </button>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Languages</label>
        <div className={styles.languageGrid}>
          {popularLanguages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={`${styles.languageButton} ${
                selectedLanguages.includes(lang.code) ? styles.languageActive : ""
              }`}
              onClick={() => handleLanguageToggle(lang.code)}
            >
              {lang.name}
            </button>
          ))}
        </div>
        {selectedLanguages.length > 0 && (
          <p className={styles.selectedCount}>
            {selectedLanguages.length} language{selectedLanguages.length !== 1 ? "s" : ""} selected
          </p>
        )}
      </div>
    </div>
  );
}
