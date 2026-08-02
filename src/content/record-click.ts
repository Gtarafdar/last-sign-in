import { resolveCandidateFromEventPath } from './scan';
import { originFromUrl, siteKeyFromUrl } from '~/lib/domain';
import { sendMessage } from '~/lib/messages';

let attached = false;

export function attachClickRecorder(): void {
  if (attached) return;
  attached = true;

  document.addEventListener(
    'click',
    (event) => {
      const path = typeof event.composedPath === 'function'
        ? event.composedPath()
        : [];
      const targets =
        path.length > 0
          ? path
          : event.target
            ? [event.target]
            : [];

      const candidate = resolveCandidateFromEventPath(targets as EventTarget[]);
      if (!candidate) return;

      const url = location.href;
      const origin = originFromUrl(url);
      const siteKey = siteKeyFromUrl(url);

      void sendMessage({
        type: 'METHOD_SELECTED',
        payload: {
          origin,
          siteKey,
          methodId: candidate.methodId,
          methodLabel: candidate.methodLabel,
          selectedAt: new Date().toISOString(),
        },
      }).catch(() => {
        // Fail quietly — never block the page click.
      });
    },
    true,
  );
}
