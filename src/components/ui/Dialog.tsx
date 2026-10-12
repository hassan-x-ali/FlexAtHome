'use client';

import { X } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useId, useRef } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Set false for destructive confirmations the user must acknowledge. */
  dismissible?: boolean;
};

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog. Uses the native `<dialog>` element, so focus trapping, the
 * top layer, and `inert` handling of the page behind come from the platform.
 * Escape and backdrop clicks close it; focus is restored to the opener.
 */
export const Dialog = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissible = true,
}: Props) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const requestClose = useCallback(() => {
    if (dismissible) onClose();
  }, [dismissible, onClose]);

  // `showModal` throws if the dialog is already open, so guard it.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Native cancel covers Escape. Block it when not dismissible.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onCancel = (event: Event) => {
      if (!dismissible) event.preventDefault();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, [dismissible]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === ref.current) requestClose();
      }}
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-lg border border-line bg-card p-0 text-fg backdrop:bg-bg/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line p-5">
        <div>
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-1 text-sm text-muted">
              {description}
            </p>
          ) : null}
        </div>
        {dismissible ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1 -mt-1 rounded-sm p-1.5 text-muted transition-colors hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-5">{children}</div>
      {footer ? <div className="flex justify-end gap-3 border-t border-line p-5">{footer}</div> : null}
    </dialog>
  );
};

/** Small helper for dialog bodies: a horizontally arranged action row. */
export const DialogActions = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-3">{children}</div>
);

export const focusFirst = (container: HTMLElement | null): void => {
  if (!container) return;
  const target = container.querySelector<HTMLElement>(FOCUSABLE);
  target?.focus();
};
