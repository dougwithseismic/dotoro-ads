import type { PlatformConfig } from "../types";
import { PLATFORM_COLORS } from "../types";
import styles from "./ConnectButton.module.css";

interface ConnectButtonProps {
  config: PlatformConfig;
  onClick?: () => void;
  isLoading?: boolean;
}

function PlatformIcon({ platform }: { platform: PlatformConfig["platform"] }) {
  if (platform === "reddit") {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="7" cy="9" r="1.5" fill="currentColor" />
        <circle cx="13" cy="9" r="1.5" fill="currentColor" />
        <path
          d="M6.5 12.5C7.5 14 8.5 14.5 10 14.5C11.5 14.5 12.5 14 13.5 12.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (platform === "google") {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M18 10.2c0-.63-.06-1.25-.16-1.84H10v3.48h4.5a3.86 3.86 0 01-1.67 2.53v2.1h2.7c1.58-1.46 2.49-3.6 2.49-6.27z"
          fill="currentColor"
        />
        <path
          d="M10 18.5c2.25 0 4.14-.75 5.52-2.03l-2.7-2.1c-.75.5-1.7.8-2.82.8-2.17 0-4-1.46-4.66-3.43H2.56v2.17A8.5 8.5 0 0010 18.5z"
          fill="currentColor"
        />
        <path
          d="M5.34 11.74a5.1 5.1 0 010-3.25V6.32H2.56a8.5 8.5 0 000 7.59l2.78-2.17z"
          fill="currentColor"
        />
        <path
          d="M10 5.06c1.22 0 2.32.42 3.18 1.25l2.39-2.39A8.5 8.5 0 002.56 6.32l2.78 2.17c.65-1.97 2.49-3.43 4.66-3.43z"
          fill="currentColor"
        />
      </svg>
    );
  }

  // facebook
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.5 10a7.5 7.5 0 10-8.67 7.41v-5.24H6.77V10h2.06V8.23c0-2.03 1.21-3.15 3.06-3.15.89 0 1.82.16 1.82.16v2h-1.03c-1.01 0-1.32.63-1.32 1.27V10h2.25l-.36 2.17h-1.9v5.24A7.5 7.5 0 0017.5 10z"
        fill="currentColor"
      />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className={styles.spinner}
    >
      <circle
        cx="9"
        cy="9"
        r="7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="32"
        strokeDashoffset="8"
      />
    </svg>
  );
}

export function ConnectButton({ config, onClick, isLoading = false }: ConnectButtonProps) {
  const { platform, name, available } = config;
  const isDisabled = !available || isLoading;

  return (
    <button
      className={styles.button}
      data-platform={platform}
      data-available={available}
      data-loading={isLoading}
      disabled={isDisabled}
      onClick={available && !isLoading ? onClick : undefined}
      style={
        {
          "--platform-color": PLATFORM_COLORS[platform],
        } as React.CSSProperties
      }
    >
      {isLoading ? <LoadingSpinner /> : <PlatformIcon platform={platform} />}
      <span className={styles.text}>
        {isLoading ? "Connecting..." : available ? `Connect ${name}` : name}
      </span>
      {!available && !isLoading && <span className={styles.badge}>Coming Soon</span>}
    </button>
  );
}
