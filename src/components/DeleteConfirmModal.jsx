export function DeleteConfirmModal({ entry, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal delete-modal" onClick={e => e.stopPropagation()}>

        {/* Icon */}
        <div className="delete-icon">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </div>

        {/* Text */}
        <div className="delete-title">Delete entry</div>
        <p className="delete-desc">
          <span className="delete-name">{entry.name}</span> will be permanently
          removed from your vault. This cannot be undone.
        </p>

        {/* Actions */}
        <div className="delete-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-delete" onClick={onConfirm}>Delete</button>
        </div>

      </div>
    </div>
  );
}
