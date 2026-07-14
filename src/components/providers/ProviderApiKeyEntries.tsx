import { IconCheck, IconX } from '@/components/ui/icons';
import { maskApiKey } from '@/utils/format';
import styles from '@/features/aiProviders/AiProvidersPage.module.scss';

export interface ProviderApiKeyEntry {
  apiKey: string;
  proxyUrl?: string;
  success: number;
  failure: number;
  key?: string;
}

interface ProviderApiKeyEntriesProps {
  entries: ProviderApiKeyEntry[];
  countLabel: string;
}

export function ProviderApiKeyEntries({
  entries,
  countLabel,
}: ProviderApiKeyEntriesProps) {
  return (
    <div className={styles.apiKeyEntriesSection}>
      <div className={styles.apiKeyEntriesLabel}>
        {countLabel}: {entries.length}
      </div>
      <div className={styles.apiKeyEntryList}>
        {entries.map((entry, entryIndex) => (
          <div
            key={entry.key ?? `api-key-entry-${entryIndex}`}
            className={styles.apiKeyEntryCard}
          >
            <span className={styles.apiKeyEntryIndex}>{entryIndex + 1}</span>
            <span className={styles.apiKeyEntryKey}>{maskApiKey(entry.apiKey)}</span>
            {entry.proxyUrl && (
              <span className={styles.apiKeyEntryProxy}>{entry.proxyUrl}</span>
            )}
            <div className={styles.apiKeyEntryStats}>
              <span className={`${styles.apiKeyEntryStat} ${styles.apiKeyEntryStatSuccess}`}>
                <IconCheck size={12} /> {entry.success}
              </span>
              <span className={`${styles.apiKeyEntryStat} ${styles.apiKeyEntryStatFailure}`}>
                <IconX size={12} /> {entry.failure}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
