import { useEffect, useRef } from 'react';
export default function Modal({ title, onClose, busy, children }) {
    const ref = useRef(null);
    useEffect(() => {
        const dialog = ref.current;
        const previous = document.activeElement;
        dialog.showModal();
        return () => { dialog.close(); previous?.focus(); };
    }, []);
    return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
        <div className="dialog-heading"><h2 id="dialog-title">{title}</h2><button type="button" aria-label="Close dialog" disabled={busy} onClick={onClose}>×</button></div>
        {children}
    </dialog>;
}

