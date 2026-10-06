export function formatPhone(raw?: string | null): string {
  if (!raw) return '';
  return String(raw).replace(/^\s*[pP]\s*:\s*/, '').trim();
}

export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function flashToast(msg: string) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText =
    'position:fixed;left:50%;top:24px;transform:translateX(-50%);background:#0f766e;color:#fff;padding:8px 14px;border-radius:8px;font-size:13px;z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.2);transition:opacity .3s;';
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 1200);
}

export async function copyAndToast(text: string, label = 'Copied') {
  const clean = text;
  if (!clean) return;
  const ok = await copyText(clean);
  flashToast(ok ? `${label}: ${clean}` : 'Copy failed');
}
