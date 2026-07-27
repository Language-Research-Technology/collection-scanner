import QrScanner from '../vendor/qr-scanner.min.js';
import { el } from './dom.js';

/**
 * Mounts a live camera QR scanner into `container`. Call `destroy()` to stop
 * the camera and remove the video element — there is no "paused" state,
 * mount/destroy is the only lifecycle, matching how it's used from render().
 */
export function mountScanner(container, onScan) {
  const video = el('video', { class: 'scanner-video', playsinline: true });
  video.muted = true; // the .muted property (not just the attribute) is what autoplay policies check
  const message = el('p', { class: 'scanner-message', hidden: true });
  const root = el('div', { class: 'scanner' }, [video, message]);
  container.appendChild(root);

  const scanner = new QrScanner(video, (result) => onScan(result.data), {
    preferredCamera: 'environment',
    highlightScanRegion: true,
    highlightCodeOutline: true,
    maxScansPerSecond: 5,
  });

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
