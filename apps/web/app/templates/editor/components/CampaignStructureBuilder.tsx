"use client";

import { useCallback } from "react";
import { VariableInput } from "../../components/VariableInput";
import styles from "./CampaignStructureBuilder.module.css";

export interface AdConfig {
  id: string;
  headline: string;
  description: string;
  displayUrl: string;
  finalUrl: string;
  callToAction: string;
}

export interface AdGroupConfig {
  id: string;
  name: string;
  ads: AdConfig[];
}

export interface CampaignConfig {
  name: string;
  objective: string;
  budget: string;
  platform: "reddit" | "google" | "facebook";
}

interface CampaignStructureBuilderProps {
  campaign: CampaignConfig;
  adGroups: AdGroupConfig[];
  onCampaignChange: (campaign: CampaignConfig) => void;
  onAdGroupsChange: (adGroups: AdGroupConfig[]) => void;
  availableVariables: string[];
  platformLimits: { headline: number; description: number };
  ctaOptions: string[];
  errors?: Record<string, string>;
  onFieldFocus?: (fieldId: string) => void;
}

const OBJECTIVE_OPTIONS = [
  { value: "CONVERSIONS", label: "Conversions" },
  { value: "TRAFFIC", label: "Traffic" },
  { value: "BRAND_AWARENESS", label: "Brand Awareness" },
  { value: "REACH", label: "Reach" },
  { value: "APP_INSTALLS", label: "App Installs" },
  { value: "VIDEO_VIEWS", label: "Video Views" },
];

let adGroupCounter = 1;
let adCounter = 1;

function generateAdGroupId(): string {
  return `ag-${Date.now()}-${adGroupCounter++}`;
}

function generateAdId(): string {
  return `ad-${Date.now()}-${adCounter++}`;
}

export function CampaignStructureBuilder({
  campaign,
  adGroups,
  onCampaignChange,
  onAdGroupsChange,
  availableVariables,
  platformLimits,
  ctaOptions,
  errors = {},
  onFieldFocus,
}: CampaignStructureBuilderProps) {
  const handleCampaignFieldChange = useCallback(
    (field: keyof CampaignConfig, value: string) => {
      onCampaignChange({ ...campaign, [field]: value });
    },
    [campaign, onCampaignChange]
  );

  const handleAddAdGroup = useCallback(() => {
    const newAdGroup: AdGroupConfig = {
      id: generateAdGroupId(),
      name: `Ad Group ${adGroups.length + 1}`,
      ads: [
        {
          id: generateAdId(),
          headline: "",
          description: "",
          displayUrl: "",
          finalUrl: "",
          callToAction: "",
        },
      ],
    };
    onAdGroupsChange([...adGroups, newAdGroup]);
  }, [adGroups, onAdGroupsChange]);

  const handleRemoveAdGroup = useCallback(
    (adGroupId: string) => {
      if (adGroups.length <= 1) return; // Keep at least one ad group
      onAdGroupsChange(adGroups.filter((ag) => ag.id !== adGroupId));
    },
    [adGroups, onAdGroupsChange]
  );

  const handleAdGroupNameChange = useCallback(
    (adGroupId: string, name: string) => {
      onAdGroupsChange(
        adGroups.map((ag) => (ag.id === adGroupId ? { ...ag, name } : ag))
      );
    },
    [adGroups, onAdGroupsChange]
  );

  const handleAddAd = useCallback(
    (adGroupId: string) => {
      const newAd: AdConfig = {
        id: generateAdId(),
        headline: "",
        description: "",
        displayUrl: "",
        finalUrl: "",
        callToAction: "",
      };
      onAdGroupsChange(
        adGroups.map((ag) =>
          ag.id === adGroupId ? { ...ag, ads: [...ag.ads, newAd] } : ag
        )
      );
    },
    [adGroups, onAdGroupsChange]
  );

  const handleRemoveAd = useCallback(
    (adGroupId: string, adId: string) => {
      onAdGroupsChange(
        adGroups.map((ag) => {
          if (ag.id !== adGroupId) return ag;
          if (ag.ads.length <= 1) return ag; // Keep at least one ad
          return { ...ag, ads: ag.ads.filter((ad) => ad.id !== adId) };
        })
      );
    },
    [adGroups, onAdGroupsChange]
  );

  const handleAdFieldChange = useCallback(
    (adGroupId: string, adId: string, field: keyof AdConfig, value: string) => {
      onAdGroupsChange(
        adGroups.map((ag) => {
          if (ag.id !== adGroupId) return ag;
          return {
            ...ag,
            ads: ag.ads.map((ad) =>
              ad.id === adId ? { ...ad, [field]: value } : ad
            ),
          };
        })
      );
    },
    [adGroups, onAdGroupsChange]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, type: "adGroup" | "ad", id: string, parentId?: string) => {
      e.dataTransfer.setData("type", type);
      e.dataTransfer.setData("id", id);
      if (parentId) {
        e.dataTransfer.setData("parentId", parentId);
      }
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDropAdGroup = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("type");
      const id = e.dataTransfer.getData("id");

      if (type !== "adGroup") return;

      const sourceIndex = adGroups.findIndex((ag) => ag.id === id);
      if (sourceIndex === -1 || sourceIndex === targetIndex) return;

      const newAdGroups = [...adGroups];
      const removed = newAdGroups.splice(sourceIndex, 1)[0];
      if (removed) {
        newAdGroups.splice(targetIndex, 0, removed);
        onAdGroupsChange(newAdGroups);
      }
    },
    [adGroups, onAdGroupsChange]
  );

  const handleDropAd = useCallback(
    (e: React.DragEvent, targetAdGroupId: string, targetIndex: number) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("type");
      const id = e.dataTransfer.getData("id");
      const sourceAdGroupId = e.dataTransfer.getData("parentId");

      if (type !== "ad") return;

      const sourceAdGroup = adGroups.find((ag) => ag.id === sourceAdGroupId);
      if (!sourceAdGroup) return;

      const sourceAdIndex = sourceAdGroup.ads.findIndex((ad) => ad.id === id);
      if (sourceAdIndex === -1) return;

      const ad = sourceAdGroup.ads[sourceAdIndex];
      if (!ad) return;

      if (sourceAdGroupId === targetAdGroupId) {
        // Reorder within same ad group
        const newAds = [...sourceAdGroup.ads];
        newAds.splice(sourceAdIndex, 1);
        newAds.splice(targetIndex, 0, ad);
        onAdGroupsChange(
          adGroups.map((ag) =>
            ag.id === targetAdGroupId ? { ...ag, ads: newAds } : ag
          )
        );
      } else {
        // Move to different ad group
        onAdGroupsChange(
          adGroups.map((ag) => {
            if (ag.id === sourceAdGroupId) {
              return { ...ag, ads: ag.ads.filter((a) => a.id !== id) };
            }
            if (ag.id === targetAdGroupId) {
              const newAds = [...ag.ads];
              newAds.splice(targetIndex, 0, ad);
              return { ...ag, ads: newAds };
            }
            return ag;
          })
        );
      }
    },
    [adGroups, onAdGroupsChange]
  );

  return (
    <div className={styles.builder}>
      {/* Campaign Level Settings */}
      <section className={styles.campaignSection}>
        <h2 className={styles.sectionTitle}>Campaign Settings</h2>

        <div className={styles.formGroup}>
          <label htmlFor="campaign-name" className={styles.label}>
            Campaign Name <span className={styles.required}>*</span>
          </label>
          <input
            id="campaign-name"
            type="text"
            value={campaign.name}
            onChange={(e) => handleCampaignFieldChange("name", e.target.value)}
            onFocus={() => onFieldFocus?.("campaign-name")}
            placeholder="e.g., Holiday Sale 2024"
            className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "campaign-name-error" : undefined}
          />
          {errors.name && (
            <span id="campaign-name-error" className={styles.error} role="alert">
              {errors.name}
            </span>
          )}
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="campaign-objective" className={styles.label}>
              Objective
            </label>
            <select
              id="campaign-objective"
              value={campaign.objective}
              onChange={(e) => handleCampaignFieldChange("objective", e.target.value)}
              className={styles.select}
            >
              {OBJECTIVE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="campaign-budget" className={styles.label}>
              Daily Budget
            </label>
            <input
              id="campaign-budget"
              type="text"
              value={campaign.budget}
              onChange={(e) => handleCampaignFieldChange("budget", e.target.value)}
              placeholder="e.g., $100"
              className={styles.input}
            />
          </div>
        </div>
      </section>

      {/* Ad Groups */}
      <section className={styles.adGroupsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Ad Groups</h2>
          <button
            type="button"
            onClick={handleAddAdGroup}
            className={styles.addButton}
            aria-label="Add ad group"
          >
            <span className={styles.addIcon}>+</span>
            Add Ad Group
          </button>
        </div>

        <div className={styles.adGroupsList}>
          {adGroups.map((adGroup, agIndex) => (
            <div
              key={adGroup.id}
              className={styles.adGroupCard}
              draggable
              onDragStart={(e) => handleDragStart(e, "adGroup", adGroup.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropAdGroup(e, agIndex)}
            >
              <div className={styles.adGroupHeader}>
                <span className={styles.dragHandle} aria-hidden="true">
                  &#x2630;
                </span>
                <input
                  type="text"
                  value={adGroup.name}
                  onChange={(e) => handleAdGroupNameChange(adGroup.id, e.target.value)}
                  className={styles.adGroupNameInput}
                  aria-label={`Ad group ${agIndex + 1} name`}
                />
                {adGroups.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAdGroup(adGroup.id)}
                    className={styles.removeButton}
                    aria-label="Remove ad group"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Ads within Ad Group */}
              <div className={styles.adsList}>
                {adGroup.ads.map((ad, adIndex) => (
                  <div
                    key={ad.id}
                    className={styles.adCard}
                    draggable
                    onDragStart={(e) => handleDragStart(e, "ad", ad.id, adGroup.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                      e.stopPropagation();
                      handleDropAd(e, adGroup.id, adIndex);
                    }}
                  >
                    <div className={styles.adHeader}>
                      <span className={styles.dragHandle} aria-hidden="true">
                        &#x2630;
                      </span>
                      <span className={styles.adTitle}>Ad {adIndex + 1}</span>
                      {adGroup.ads.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAd(adGroup.id, ad.id)}
                          className={styles.removeButton}
                          aria-label="Remove ad"
                        >
                          &times;
                        </button>
                      )}
                    </div>

                    <div className={styles.adFields}>
                      <VariableInput
                        id={`headline-${ad.id}`}
                        label="Headline"
                        value={ad.headline}
                        onChange={(value) =>
                          handleAdFieldChange(adGroup.id, ad.id, "headline", value)
                        }
                        placeholder={`e.g., Shop {product_name} - {discount_percent}% Off!`}
                        availableVariables={availableVariables}
                        maxLength={platformLimits.headline}
                        required
                        error={errors[`headline-${ad.id}`]}
                      />

                      <VariableInput
                        id={`description-${ad.id}`}
                        label="Description"
                        value={ad.description}
                        onChange={(value) =>
                          handleAdFieldChange(adGroup.id, ad.id, "description", value)
                        }
                        placeholder={`e.g., Get the best deals at {brand}. Quality guaranteed.`}
                        availableVariables={availableVariables}
                        maxLength={platformLimits.description}
                        multiline
                        rows={2}
                        error={errors[`description-${ad.id}`]}
                      />

                      <div className={styles.adFieldRow}>
                        <div className={styles.formGroup}>
                          <label
                            htmlFor={`displayUrl-${ad.id}`}
                            className={styles.label}
                          >
                            Display URL
                          </label>
                          <input
                            id={`displayUrl-${ad.id}`}
                            type="text"
                            value={ad.displayUrl}
                            onChange={(e) =>
                              handleAdFieldChange(
                                adGroup.id,
                                ad.id,
                                "displayUrl",
                                e.target.value
                              )
                            }
                            placeholder="example.com/shop"
                            className={styles.input}
                            maxLength={25}
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label htmlFor={`finalUrl-${ad.id}`} className={styles.label}>
                            Final URL
                          </label>
                          <input
                            id={`finalUrl-${ad.id}`}
                            type="url"
                            value={ad.finalUrl}
                            onChange={(e) =>
                              handleAdFieldChange(
                                adGroup.id,
                                ad.id,
                                "finalUrl",
                                e.target.value
                              )
                            }
                            placeholder="https://example.com/products"
                            className={styles.input}
                          />
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor={`cta-${ad.id}`} className={styles.label}>
                          Call to Action
                        </label>
                        <select
                          id={`cta-${ad.id}`}
                          value={ad.callToAction}
                          onChange={(e) =>
                            handleAdFieldChange(
                              adGroup.id,
                              ad.id,
                              "callToAction",
                              e.target.value
                            )
                          }
                          className={styles.select}
                        >
                          <option value="">Select a CTA...</option>
                          {ctaOptions.map((cta) => (
                            <option key={cta} value={cta}>
                              {cta}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => handleAddAd(adGroup.id)}
                  className={styles.addAdButton}
                  aria-label="Add ad"
                >
                  <span className={styles.addIcon}>+</span>
                  Add Ad
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
