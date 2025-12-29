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

  // Meta (infinity logo)
  if (platform === "facebook") {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5.5 10c0-1.5.8-2.8 2-3.5-.6-.3-1.3-.5-2-.5C3 6 1 8 1 10s2 4 4.5 4c.7 0 1.4-.2 2-.5-1.2-.7-2-2-2-3.5zm9 0c0 1.5-.8 2.8-2 3.5.6.3 1.3.5 2 .5 2.5 0 4.5-2 4.5-4s-2-4-4.5-4c-.7 0-1.4.2-2 .5 1.2.7 2 2 2 3.5zm-4.5 0c0 1.7-1.3 3-3 3s-3-1.3-3-3 1.3-3 3-3 3 1.3 3 3zm1 0c0-1.7 1.3-3 3-3s3 1.3 3 3-1.3 3-3 3-3-1.3-3-3z"
          fill="currentColor"
        />
      </svg>
    );
  }

  // Default icon
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
