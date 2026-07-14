import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPencil, IconTrash2 } from '@/components/ui/icons';

interface ProviderListProps<T> {
  items: T[];
  loading: boolean;
  keyField: (item: T, index: number) => string;
  renderContent: (item: T, index: number) => ReactNode;
  onEdit: (item: T, index: number) => void;
  onDelete: (item: T, index: number) => void;
  emptyTitle: string;
  emptyDescription: string;
  deleteLabel?: string;
  actionsDisabled?: boolean;
  getRowDisabled?: (item: T, index: number) => boolean;
  renderPriority?: (item: T, index: number) => ReactNode;
  renderExtraActions?: (item: T, index: number) => ReactNode;
  listClassName?: string;
  rowClassName?: string;
  metaClassName?: string;
  actionsClassName?: string;
  actionButtonClassName?: string;
}

export function ProviderList<T>({
  items,
  loading,
  keyField,
  renderContent,
  onEdit,
  onDelete,
  emptyTitle,
  emptyDescription,
  deleteLabel,
  actionsDisabled = false,
  getRowDisabled,
  renderPriority,
  renderExtraActions,
  listClassName,
  rowClassName,
  metaClassName,
  actionsClassName,
  actionButtonClassName,
}: ProviderListProps<T>) {
  const { t } = useTranslation();

  if (loading && items.length === 0) {
    return <div className="hint">{t('common.loading')}</div>;
  }

  if (!items.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={listClassName ?? 'item-list'}>
      {items.map((item, index) => {
        const rowDisabled = getRowDisabled ? getRowDisabled(item, index) : false;
        return (
          <div
            key={keyField(item, index)}
            className={rowClassName ?? 'item-row'}
            data-provider-disabled={rowDisabled ? 'true' : undefined}
            style={actionsDisabled ? { opacity: 0.6 } : undefined}
          >
            <div className={metaClassName ?? 'item-meta'}>{renderContent(item, index)}</div>
            <div className={actionsClassName ?? 'item-actions'}>
              {renderPriority ? renderPriority(item, index) : null}
              <Button
                variant="secondary"
                size="sm"
                iconOnly
                onClick={() => onEdit(item, index)}
                disabled={actionsDisabled}
                className={actionButtonClassName}
                title={t('common.edit')}
                aria-label={t('common.edit')}
              >
                <IconPencil size={16} />
              </Button>
              <Button
                variant="danger"
                size="sm"
                iconOnly
                onClick={() => onDelete(item, index)}
                disabled={actionsDisabled}
                className={actionButtonClassName}
                title={deleteLabel || t('common.delete')}
                aria-label={deleteLabel || t('common.delete')}
              >
                <IconTrash2 size={16} />
              </Button>
              {renderExtraActions ? renderExtraActions(item, index) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
