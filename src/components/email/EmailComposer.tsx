import { useEffect, useState } from 'react';
import { Send, Mail, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { showToast } from '../ui/Toast';

interface EmailTemplate {
  id: string;
  label: string;
  description: string;
  subject: string;
  body: string;
}

export function EmailComposer({
  open,
  onClose,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
}: {
  open: boolean;
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
}) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [tplId, setTplId] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTo(defaultTo); setSubject(defaultSubject); setBody(defaultBody); setTplId('');
    fetch('/api/email/templates').then((r) => r.json()).then((d) => setTemplates(d.templates || [])).catch(() => {});
  }, [open, defaultTo, defaultSubject, defaultBody]);

  function applyTemplate(id: string) {
    setTplId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    if (!subject.trim()) setSubject(t.subject);
    if (!body.trim()) setBody(t.body);
  }

  async function send() {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      return showToast('To, subject, and body are required', 'warning');
    }
    setSending(true);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to, subject, text: body }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Email sent', 'success');
        onClose();
      } else if (data.fallback === 'mailto' && data.mailto) {
        window.location.href = data.mailto;
        showToast('Opened your mail client (configure RESEND_API_KEY to send in-app)', 'info', 5000);
        onClose();
      } else {
        throw new Error(data.error || 'Failed to send');
      }
    } catch (e: any) {
      showToast(e.message || 'Send failed', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Compose email"
      size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button leftIcon={<Send className="h-4 w-4" />} onClick={send} loading={sending}>Send</Button>
      </>}
    >
      <div className="space-y-3">
        <Input leftIcon={<Mail className="h-4 w-4" />} label="To" type="email" value={to} onChange={(e) => setTo(e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          <Select label="Template" value={tplId} onChange={(e) => applyTemplate(e.target.value)} className="col-span-1">
            <option value="">— choose —</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
          <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="col-span-2" />
        </div>
        <Textarea label="Message" value={body} onChange={(e) => setBody(e.target.value)} rows={10} />
        <div className="text-xs text-[color:var(--color-muted-ink)] inline-flex items-center gap-1">
          <ExternalLink className="h-3 w-3" /> Without RESEND_API_KEY the Send button opens your mail client instead.
        </div>
      </div>
    </Modal>
  );
}
