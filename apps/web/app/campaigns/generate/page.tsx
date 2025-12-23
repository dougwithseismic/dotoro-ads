"use client";

import { GenerateWizard } from "./components";
import styles from "./GenerateWizard.module.css";

export default function GenerateCampaignsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Generate Campaigns</h1>
        <p className={styles.subtitle}>
          Build ad campaigns from your data sources
        </p>
      </header>
      <GenerateWizard />
    </div>
  );
}
