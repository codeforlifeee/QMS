import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Modal } from '../ui/Modal.js';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';
import { Textarea } from '../ui/Textarea.js';
import { Select } from '../ui/Select.js';
import { generateCustomWALink } from '../../lib/whatsapp.js';

interface WhatsAppComposerProps {
  open: boolean;
  onClose: () => void;
  defaultPhone?: string;
  vars: Record<string, string>;
}

const TEMPLATES = [
  {
    id: 'greeting',
    label: 'Greeting / Intro',
    text: (vars: Record<string, string>) =>
      `Hi ${vars.name || 'there'}! This is Traverse Globe. We received your travel inquiry for ${vars.destination || 'your trip'}. When would be a good time to discuss your travel plans?`,
  },
  {
    id: 'follow_up',
    label: 'Follow Up',
    text: (vars: Record<string, string>) =>
      `Hi ${vars.name || 'there'}! Just following up on your ${vars.destination || ''} travel inquiry. Have you had a chance to review the details? Let me know if you have any questions!`,
  },
  {
    id: 'quote_ready',
    label: 'Quote Ready',
    text: (vars: Record<string, string>) =>
      `Hi ${vars.name || 'there'}! Your travel quotation for ${vars.destination || 'your trip'} is ready. Let me know when we can review it together!`,
  },
  {
    id: 'blank',
    label: 'Blank Message',
    text: () => ``,
  }
];

export function WhatsAppComposer({
  open,
  onClose,
  defaultPhone = '',
  vars,
}: WhatsAppComposerProps) {
  const [phone, setPhone] = useState(defaultPhone);
  const [tplId, setTplId] = useState('greeting');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setPhone(defaultPhone);
    const initialTpl = TEMPLATES.find((t) => t.id === 'greeting');
    if (initialTpl) {
      setTplId('greeting');
      setMessage(initialTpl.text(vars));
    }
  }, [open, defaultPhone, vars]);

  function applyTemplate(id: string) {
    setTplId(id);
    const t = TEMPLATES.find((x) => x.id === id);
    if (t) {
      setMessage(t.text(vars));
    }
  }

  function send() {
    if (!phone.trim() || !message.trim()) return;
    const waUrl = generateCustomWALink(phone, message);
    window.open(waUrl, '_blank');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send WhatsApp Message"
      size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button leftIcon={<MessageCircle className="h-4 w-4" />} onClick={send}>Open WhatsApp</Button>
      </>}
    >
      <div className="space-y-3">
        <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Select label="Template" value={tplId} onChange={(e) => applyTemplate(e.target.value)}>
          {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </Select>
        <Textarea label="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={6} />
      </div>
    </Modal>
  );
}
