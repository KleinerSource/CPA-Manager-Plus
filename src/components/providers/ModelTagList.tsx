import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconChevronDown, IconChevronUp } from '@/components/ui/icons';
import type { ModelAlias } from '@/types';
import styles from '@/features/aiProviders/AiProvidersPage.module.scss';

interface ModelTagListProps {
  models: ModelAlias[];
  countLabel: string;
}

export function ModelTagList({ models, countLabel }: ModelTagListProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.modelListSection}>
      <div className={styles.modelListToolbar}>
        <span className={styles.modelCountLabel}>
          {countLabel}: {models.length}
        </span>
        {models.length > 0 ? (
          <button
            type="button"
            className={`btn btn-ghost btn-xs ${styles.modelExpandButton}`}
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={expanded ? t('common.collapse') : t('common.expand')}
          >
            <span>
              {expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              {expanded ? t('common.collapse') : t('common.expand')}
            </span>
          </button>
        ) : null}
      </div>
      {expanded ? (
        <div className={styles.modelTagList}>
          {models.map((model) => (
            <span key={`${model.name}-${model.alias || 'default'}`} className={styles.modelTag}>
              <span className={styles.modelName}>{model.name}</span>
              {model.alias && model.alias !== model.name ? (
                <span className={styles.modelAlias}>{model.alias}</span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
