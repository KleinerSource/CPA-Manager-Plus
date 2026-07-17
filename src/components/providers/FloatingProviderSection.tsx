import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '@/components/ui/Card';
import { usePageTransitionLayer } from '@/components/common/PageTransitionLayer';
import styles from '@/features/aiProviders/AiProvidersPage.module.scss';

interface FloatingToolbarStyle {
  left: number;
  top: number;
  width: number;
  visible: boolean;
}

interface FloatingProviderSectionProps {
  title: ReactNode;
  extra: ReactNode;
  children: ReactNode;
}

const INITIAL_STYLE: FloatingToolbarStyle = { left: 0, top: 0, width: 0, visible: false };

export function useFloatingProviderSection() {
  const pageTransitionLayer = usePageTransitionLayer();
  const isTransitionAnimating = pageTransitionLayer?.isAnimating ?? false;
  const [floatingToolbarStyle, setFloatingToolbarStyle] =
    useState<FloatingToolbarStyle>(INITIAL_STYLE);
  const sectionRef = useRef<HTMLDivElement>(null);
  const topToolbarAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTransitionAnimating) return;

    const updateFloatingToolbar = () => {
      const section = sectionRef.current;
      const anchor = topToolbarAnchorRef.current;
      if (!section || !anchor || window.innerWidth <= 768) {
        setFloatingToolbarStyle((previous) =>
          previous.visible ? { ...previous, visible: false } : previous
        );
        return;
      }

      const rootStyles = getComputedStyle(document.documentElement);
      const fixedTop = Number.parseFloat(rootStyles.getPropertyValue('--header-height')) || 64;
      const anchorHeight = anchor.getBoundingClientRect().height;
      const activeSections = Array.from(
        document.querySelectorAll<HTMLElement>('[data-provider-floating-section]')
      )
        .map((candidate) => {
          const rect = candidate.getBoundingClientRect();
          const header = candidate.querySelector<HTMLElement>('.card-header');
          return {
            element: candidate,
            rect,
            headerHeight: header?.getBoundingClientRect().height ?? anchorHeight,
          };
        })
        .filter(
          ({ rect, headerHeight }) =>
            rect.top <= fixedTop && rect.bottom > fixedTop + headerHeight
        )
        .sort((left, right) => left.rect.top - right.rect.top)
      const activeSection = activeSections[activeSections.length - 1];
      const sectionRect = section.getBoundingClientRect();
      const next = {
        left: sectionRect.left,
        top: fixedTop,
        width: sectionRect.width,
        visible: activeSection?.element === section,
      };

      setFloatingToolbarStyle((previous) =>
        previous.left === next.left &&
        previous.top === next.top &&
        previous.width === next.width &&
        previous.visible === next.visible
          ? previous
          : next
      );
    };

    updateFloatingToolbar();
    window.addEventListener('resize', updateFloatingToolbar);
    window.addEventListener('scroll', updateFloatingToolbar, true);
    return () => {
      window.removeEventListener('resize', updateFloatingToolbar);
      window.removeEventListener('scroll', updateFloatingToolbar, true);
    };
  }, [isTransitionAnimating]);

  return {
    sectionRef,
    topToolbarAnchorRef,
    floatingToolbarStyle,
    shouldRenderFloatingToolbar: !isTransitionAnimating && floatingToolbarStyle.visible,
  };
}

export function FloatingProviderSection({
  title,
  extra,
  children,
}: FloatingProviderSectionProps) {
  const {
    sectionRef,
    topToolbarAnchorRef,
    floatingToolbarStyle,
    shouldRenderFloatingToolbar,
  } = useFloatingProviderSection();

  return (
    <>
      <div ref={sectionRef} data-provider-floating-section>
        <Card
          title={title}
          extra={
            <div
              ref={topToolbarAnchorRef}
              className={
                shouldRenderFloatingToolbar ? styles.providerToolbarAnchorHidden : undefined
              }
            >
              {extra}
            </div>
          }
        >
          {children}
        </Card>
      </div>
      {typeof document !== 'undefined' && shouldRenderFloatingToolbar
        ? createPortal(
            <div
              className={'card ' + styles.providerFloatingToolbar}
              style={{
                left: floatingToolbarStyle.left,
                top: floatingToolbarStyle.top,
                width: floatingToolbarStyle.width,
              }}
            >
              <div className="card-header">
                <div className="title">{title}</div>
                {extra}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
