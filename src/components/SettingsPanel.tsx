import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun, Save, Download, Trash2, Upload, Link as LinkIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { SegmentedControl } from './ui/SegmentedControl';
import { useToast } from './ui/Toast';
import { getStoredTheme, setTheme, type Theme } from '../lib/theme';

export function SettingsPanel({ company }: { company: { name: string; email?: string; phone?: string; website?: string } }) {
  const toast = useToast();
  const [theme, setLocalTheme] = useState<Theme>('system');
  const [currency, setCurrency] = useState('INR');
  const [markup, setMarkup] = useState('10');
  const [provider, setProvider] = useState('claude');

  useEffect(() => {
    setLocalTheme(getStoredTheme());
    try {
      setCurrency(localStorage.getItem('qms-default-currency') || 'INR');
      setMarkup(localStorage.getItem('qms-default-markup') || '10');
      setProvider(localStorage.getItem('qms-default-provider') || 'claude');
    } catch {}
  }, []);

  function saveDefaults() {
    try {
      localStorage.setItem('qms-default-currency', currency);
      localStorage.setItem('qms-default-markup', markup);
      localStorage.setItem('qms-default-provider', provider);
      toast.show('Defaults saved', 'success');
    } catch {
      toast.show('Could not save (localStorage disabled)', 'error');
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Appearance */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Appearance</CardTitle>
            <p className="text-xs text-[color:var(--color-muted-ink)]">Theme and layout preferences</p>
          </div>
        </CardHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[color:var(--color-ink)] block mb-2">Theme</label>
            <SegmentedControl
              aria-label="Theme"
              value={theme}
              onChange={(v: Theme) => { setLocalTheme(v); setTheme(v); toast.show(`Theme: ${v}`, 'info', 1200); }}
              options={[
                { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
                { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
                { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> },
              ]}
            />
            <p className="mt-2 text-xs text-[color:var(--color-muted-ink)]">
              System follows your OS color scheme preference.
            </p>
          </div>
        </div>
      </Card>

      {/* Defaults */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Defaults</CardTitle>
            <p className="text-xs text-[color:var(--color-muted-ink)]">Starting values for new quotations</p>
          </div>
        </CardHeader>
        <div className="space-y-3">
          <Select label="Default currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="INR">INR — Indian Rupee</option>
            <option value="AED">AED — UAE Dirham</option>
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
          </Select>
          <Input label="Default markup (%)" type="number" min={0} max={100} value={markup} onChange={(e) => setMarkup(e.target.value)} />
          <Select label="Default AI provider" value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="claude">Claude (Anthropic)</option>
            <option value="openai">GPT (OpenAI)</option>
            <option value="groq">Groq</option>
            <option value="gemini">Gemini (Google)</option>
          </Select>
          <Button size="sm" leftIcon={<Save className="h-4 w-4" />} onClick={saveDefaults}>Save defaults</Button>
        </div>
      </Card>

      {/* Company */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Company</CardTitle>
            <p className="text-xs text-[color:var(--color-muted-ink)]">Shown on quotations</p>
          </div>
          <Badge variant="outline" size="sm">Read-only</Badge>
        </CardHeader>
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-xs font-semibold text-[color:var(--color-muted-ink)]">Name</div>
            <div className="text-[color:var(--color-ink)]">{company.name}</div>
          </div>
          {company.email && (
            <div>
              <div className="text-xs font-semibold text-[color:var(--color-muted-ink)]">Email</div>
              <div className="text-[color:var(--color-ink)]">{company.email}</div>
            </div>
          )}
          {company.phone && (
            <div>
              <div className="text-xs font-semibold text-[color:var(--color-muted-ink)]">Phone</div>
              <div className="text-[color:var(--color-ink)]">{company.phone}</div>
            </div>
          )}
          {company.website && (
            <div>
              <div className="text-xs font-semibold text-[color:var(--color-muted-ink)]">Website</div>
              <div className="text-[color:var(--color-ink)]">{company.website}</div>
            </div>
          )}
          <p className="text-xs text-[color:var(--color-muted-ink)]">Edit via <code className="font-mono">src/config/company.js</code>.</p>
        </div>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Integrations</CardTitle>
            <p className="text-xs text-[color:var(--color-muted-ink)]">External data sources</p>
          </div>
        </CardHeader>
        <ul className="space-y-2">
          <li className="flex items-center gap-3 rounded-xl border border-[color:var(--color-hairline)] p-3">
            <LinkIcon className="h-4 w-4 text-[color:var(--color-muted-ink)]" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Google Sheets</div>
              <div className="text-xs text-[color:var(--color-muted-ink)]">Lead sync source</div>
            </div>
            <Badge variant="success" size="sm">Configured</Badge>
          </li>
          <li className="flex items-center gap-3 rounded-xl border border-[color:var(--color-hairline)] p-3">
            <LinkIcon className="h-4 w-4 text-[color:var(--color-muted-ink)]" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Supabase</div>
              <div className="text-xs text-[color:var(--color-muted-ink)]">Lead storage</div>
            </div>
            <Badge variant="success" size="sm">Configured</Badge>
          </li>
          <li className="flex items-center gap-3 rounded-xl border border-[color:var(--color-hairline)] p-3">
            <LinkIcon className="h-4 w-4 text-[color:var(--color-muted-ink)]" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Facebook / Meta Ads</div>
              <div className="text-xs text-[color:var(--color-muted-ink)]">Webhook lead ingest</div>
            </div>
            <Badge variant="warning" size="sm">Check env</Badge>
          </li>
        </ul>
      </Card>

      {/* Data */}
      <Card className="md:col-span-2">
        <CardHeader>
          <div>
            <CardTitle>Data</CardTitle>
            <p className="text-xs text-[color:var(--color-muted-ink)]">Export, import, maintenance</p>
          </div>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => toast.show('Export coming soon', 'info')}>
            Export leads JSON
          </Button>
          <Button variant="outline" size="sm" leftIcon={<Upload className="h-4 w-4" />} onClick={() => toast.show('Import coming soon', 'info')}>
            Import catalog
          </Button>
          <Button variant="outline" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => {
            try { localStorage.clear(); toast.show('Local cache cleared', 'success'); } catch {}
          }}>
            Clear local cache
          </Button>
        </div>
      </Card>
    </div>
  );
}
