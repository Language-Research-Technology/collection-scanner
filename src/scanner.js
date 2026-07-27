import QrScanner from '../vendor/qr-scanner.min.js';
import { el } from './dom.js';

/**
 * Mounts a live camera QR scanner into `container`. Call `destroy()` to stop
 * the camera and remove the video element — there is no "paused" state,
 * mount/destroy is the only lifecycle, matching how it's used from render().
 *
 * A decode doesn't call `onScan` immediately: it shows a confirm bar ("Use
 * this" / "Scan again") first, with the camera still live underneath, giving
 * a chance to back out if the wrong code got picked up when several were in
 * view. Further decodes are ignored while one is pending, at the cost of an
 * extra tap per scan.
 */
export function mountScanner(container, onScan) {
  const video = el('video', { class: 'scanner-video', playsinline: true });
  video.muted = true; // the .muted property (not just the attribute) is what autoplay policies check
  const message = el('p', { class: 'scanner-message', hidden: true });
  const confirmCode = el('p', { class: 'scanner-confirm-code' });
  const confirmBar = el('div', { class: 'scanner-confirm', hidden: true }, [
    confirmCode,
    el('div', { class: 'scanner-confirm-actions' }, [
      el('button', { class: 'primary', onclick: () => confirmScan() }, 'Use this'),
      el('button', { onclick: () => rescan() }, 'Scan again'),
    ]),
  ]);
  const root = el('div', { class: 'scanner' }, [video, message, confirmBar]);
  container.appendChild(root);

  let pendingCode = null;

  const scanner = new QrScanner(video, (result) => handleDecode(result.data), {
    preferredCamera: 'environment',
    highlightScanRegion: true,
    highlightCodeOutline: true,
    maxScansPerSecond: 5,
  });

  function handleDecode(code) {
    if (pendingCode !== null) return;
    pendingCode = code;
    confirmCode.textContent = code;
    confirmBar.hidden = false;
  }

  function confirmScan() {
    const code = pendingCode;
    pendingCode = null;
    confirmBar.hidden = true;
    onScan(code);
  }

  function rescan() {
    pendingCode = null;
    confirmBar.hidden = true;
  }

  function showMessage(text, isError) {
    message.textContent = text;
    message.hidden = !text;
    message.classList.toggle('scanner-error', Boolean(isError));
  }

  QrScanner.hasCamera().then((hasCamera) => {
    if (!hasCamera) showMessage('No camera was found on this device.', false);
  });

  scanner.start().catch((err) => {
    showMessage(err instanceof Error ? err.message : String(err), true);
  });

  return {
    destroy() {
      scanner.stop();
      scanner.destroy();
      root.remove();
    },
  };
}
