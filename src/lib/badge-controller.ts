import { getMethodAbbreviation } from './methods';
import type { SiteRecord } from './types';

export async function updateToolbarBadge(
  record: SiteRecord | null,
  show: boolean,
): Promise<void> {
  if (!show || !record || record.disabled) {
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setTitle({ title: 'Last Sign-in' });
    return;
  }

  const text = getMethodAbbreviation(record.methodId, record.profileLabel);
  const bg =
    record.confidence === 'pending' ? '#9A6814' : '#166B4A';

  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: bg });

  const confidenceLabel =
    record.confidence === 'pending'
      ? 'selected but not confirmed'
      : record.confidence === 'manual'
        ? 'set manually'
        : 'confirmed';

  const profile = record.profileLabel ? `, ${record.profileLabel}` : '';
  await chrome.action.setTitle({
    title: `Last Sign-in: ${record.methodLabel}${profile}, ${confidenceLabel}`,
  });
}
