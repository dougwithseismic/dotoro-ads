"use client";

import { useCallback } from "react";
import type { DeviceTarget, DeviceType, OperatingSystem, Browser } from "@repo/core";
import styles from "./DeviceTargeting.module.css";

export interface DeviceTargetingProps {
  devices: DeviceTarget | undefined;
  onChange: (devices: DeviceTarget | undefined) => void;
}

const DEVICE_TYPES: { id: DeviceType; label: string; icon: string }[] = [
  { id: "desktop", label: "Desktop", icon: "monitor" },
  { id: "mobile", label: "Mobile", icon: "phone" },
  { id: "tablet", label: "Tablet", icon: "tablet" },
];

const OPERATING_SYSTEMS: { id: OperatingSystem; label: string }[] = [
  { id: "windows", label: "Windows" },
  { id: "macos", label: "macOS" },
  { id: "ios", label: "iOS" },
  { id: "android", label: "Android" },
  { id: "linux", label: "Linux" },
  { id: "chrome_os", label: "Chrome OS" },
];

const BROWSERS: { id: Browser; label: string }[] = [
  { id: "chrome", label: "Chrome" },
  { id: "safari", label: "Safari" },
  { id: "firefox", label: "Firefox" },
  { id: "edge", label: "Edge" },
  { id: "opera", label: "Opera" },
];

function getDeviceIcon(icon: string) {
  switch (icon) {
    case "monitor":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      );
    case "tablet":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      );
    default:
      return null;
  }
}

export function DeviceTargeting({
  devices,
  onChange,
}: DeviceTargetingProps) {
  const handleDeviceTypeToggle = useCallback(
    (deviceType: DeviceType) => {
      const currentTypes = devices?.types || [];
      const newTypes = currentTypes.includes(deviceType)
        ? currentTypes.filter((t) => t !== deviceType)
        : [...currentTypes, deviceType];

      const newDevices = {
        ...devices,
        types: newTypes.length > 0 ? newTypes : undefined,
      };

      // Check if devices is empty
      const isEmpty =
        (!newDevices.types || newDevices.types.length === 0) &&
        (!newDevices.operatingSystems || newDevices.operatingSystems.length === 0) &&
        (!newDevices.browsers || newDevices.browsers.length === 0);

      onChange(isEmpty ? undefined : newDevices);
    },
    [devices, onChange]
  );

  const handleOSToggle = useCallback(
    (os: OperatingSystem) => {
      const currentOS = devices?.operatingSystems || [];
      const newOS = currentOS.includes(os)
        ? currentOS.filter((o) => o !== os)
        : [...currentOS, os];

      const newDevices = {
        ...devices,
        operatingSystems: newOS.length > 0 ? newOS : undefined,
      };

      // Check if devices is empty
      const isEmpty =
        (!newDevices.types || newDevices.types.length === 0) &&
        (!newDevices.operatingSystems || newDevices.operatingSystems.length === 0) &&
        (!newDevices.browsers || newDevices.browsers.length === 0);

      onChange(isEmpty ? undefined : newDevices);
    },
    [devices, onChange]
  );

  const handleBrowserToggle = useCallback(
    (browser: Browser) => {
      const currentBrowsers = devices?.browsers || [];
      const newBrowsers = currentBrowsers.includes(browser)
        ? currentBrowsers.filter((b) => b !== browser)
        : [...currentBrowsers, browser];

      const newDevices = {
        ...devices,
        browsers: newBrowsers.length > 0 ? newBrowsers : undefined,
      };

      // Check if devices is empty
      const isEmpty =
        (!newDevices.types || newDevices.types.length === 0) &&
        (!newDevices.operatingSystems || newDevices.operatingSystems.length === 0) &&
        (!newDevices.browsers || newDevices.browsers.length === 0);

      onChange(isEmpty ? undefined : newDevices);
    },
    [devices, onChange]
  );

  return (
    <div className={styles.container}>
      {/* Device Types */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Device Types</label>
        <div className={styles.deviceGrid}>
          {DEVICE_TYPES.map((device) => (
            <button
              key={device.id}
              type="button"
              className={`${styles.deviceButton} ${
                devices?.types?.includes(device.id) ? styles.deviceActive : ""
              }`}
              onClick={() => handleDeviceTypeToggle(device.id)}
              data-testid={`device-${device.id}`}
            >
              <span className={styles.deviceIcon}>{getDeviceIcon(device.icon)}</span>
              <span className={styles.deviceLabel}>{device.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Operating Systems */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Operating Systems</label>
        <div className={styles.optionGrid}>
          {OPERATING_SYSTEMS.map((os) => (
            <button
              key={os.id}
              type="button"
              className={`${styles.optionButton} ${
                devices?.operatingSystems?.includes(os.id) ? styles.optionActive : ""
              }`}
              onClick={() => handleOSToggle(os.id)}
            >
              {os.label}
            </button>
          ))}
        </div>
      </div>

      {/* Browsers */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Browsers</label>
        <div className={styles.optionGrid}>
          {BROWSERS.map((browser) => (
            <button
              key={browser.id}
              type="button"
              className={`${styles.optionButton} ${
                devices?.browsers?.includes(browser.id) ? styles.optionActive : ""
              }`}
              onClick={() => handleBrowserToggle(browser.id)}
            >
              {browser.label}
            </button>
          ))}
        </div>
      </div>

      {/* Help text */}
      <p className={styles.helpText}>
        Leave all options unselected to target all devices.
      </p>
    </div>
  );
}
