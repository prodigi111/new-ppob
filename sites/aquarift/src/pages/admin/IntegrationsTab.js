import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Save, Database, Loader2, Eye, EyeOff, Wifi, CheckCircle2, XCircle } from 'lucide-react';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SERVICE_FIELDS = {
  ayolinx: [
    { key: 'client_key', label: 'Client Key' },
    { key: 'client_secret', label: 'Client Secret', sensitive: true },
    { key: 'customer_no', label: 'Customer No' },
    {
      key: 'private_key_pem',
      label: 'Private Key (PEM)',
      sensitive: true,
      type: 'textarea',
      placeholder: '-----BEGIN PRIVATE KEY-----\n...isi PEM Anda...\n-----END PRIVATE KEY-----',
      hint: 'Paste full PEM content. Kosongkan untuk fallback ke env (path file).',
    },
    {
      key: 'public_key_pem',
      label: 'Public Key (PEM)',
      type: 'textarea',
      placeholder: '-----BEGIN PUBLIC KEY-----\n...isi PEM Anda...\n-----END PUBLIC KEY-----',
      hint: 'Paste full PEM content. Kosongkan untuk fallback ke env (path file).',
    },
    {
      key: 'mode',
      label: 'Mode',
      type: 'select',
      options: ['sandbox', 'production'],
    },
  ],
  digiflazz: [
    { key: 'username', label: 'Username' },
    { key: 'api_key', label: 'API Key', sensitive: true },
    { key: 'webhook_secret', label: 'Webhook Secret', sensitive: true },
    { key: 'webhook_id', label: 'Webhook ID' },
    {
      key: 'mode',
      label: 'Mode',
      type: 'select',
      options: ['development', 'production'],
    },
  ],
};

export default function IntegrationsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [testing, setTesting] = useState({});
  const [testResult, setTestResult] = useState({});
  const [settings, setSettings] = useState({});
  const [drafts, setDrafts] = useState({});
  const [show, setShow] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/admin/integrations`);
      setSettings(data.settings || {});
      // Initialize drafts as empty (so admin only sends NEW values)
      const empty = {};
      for (const svc of Object.keys(SERVICE_FIELDS)) {
        empty[svc] = {};
      }
      setDrafts(empty);
    } catch (e) {
      toast.error('Gagal memuat pengaturan integrasi');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (service) => {
    setSaving(s => ({ ...s, [service]: true }));
    try {
      const payload = { config: drafts[service] || {} };
      await axios.put(`${API_BASE}/admin/integrations/${service}`, payload);
      toast.success(`${service.toUpperCase()} settings tersimpan`);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Gagal menyimpan');
    }
    setSaving(s => ({ ...s, [service]: false }));
  };

  const testConnection = async (service) => {
    setTesting(t => ({ ...t, [service]: true }));
    setTestResult(r => ({ ...r, [service]: null }));
    try {
      const { data } = await axios.post(`${API_BASE}/admin/integrations/${service}/test`);
      setTestResult(r => ({ ...r, [service]: data }));
      if (data.ok) toast.success(`Test ${service.toUpperCase()}: ${data.message}`);
      else toast.error(`Test ${service.toUpperCase()}: ${data.message}`);
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Network error';
      setTestResult(r => ({ ...r, [service]: { ok: false, message: msg, details: {} } }));
      toast.error(`Test ${service.toUpperCase()} gagal: ${msg}`);
    }
    setTesting(t => ({ ...t, [service]: false }));
  };

  const ServiceCard = ({ service }) => {
    const fields = SERVICE_FIELDS[service];
    const current = settings[service]?.values || {};
    const source = settings[service]?.source || {};
    const tres = testResult[service];
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-rajdhani font-semibold text-lg text-white uppercase flex items-center gap-2">
              <Database className="w-5 h-5" /> {service.toUpperCase()} Integration
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Credentials saat ini (sumber: <span className="font-mono text-xs">env</span> = dari `.env`, <span className="font-mono text-xs">db</span> = override admin).
              Kosongkan kolom untuk fallback ke env.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-accent/40 text-accent hover:bg-accent/10"
              onClick={() => testConnection(service)}
              disabled={testing[service]}
              data-testid={`test-${service}-btn`}
            >
              {testing[service] ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wifi className="w-4 h-4 mr-1" />}
              Test Koneksi
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90"
              onClick={() => save(service)}
              disabled={saving[service]}
              data-testid={`save-${service}-btn`}
            >
              {saving[service] ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Simpan {service}
            </Button>
          </div>
        </div>
        {tres && (
          <div
            data-testid={`test-result-${service}`}
            className={`px-6 py-3 border-b border-border text-sm flex items-start gap-2 ${tres.ok ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
          >
            {tres.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <div className="flex-1">
              <div className="font-semibold">{tres.message}</div>
              {tres.details && Object.keys(tres.details).length > 0 && (
                <div className="mt-1 text-xs font-mono opacity-80 break-all">
                  {Object.entries(tres.details).map(([k, v]) => (
                    <span key={k} className="mr-3">{k}=<b>{String(v)}</b></span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="p-6 grid md:grid-cols-2 gap-4">
          {fields.map(f => {
            const showKey = `${service}.${f.key}`;
            const isShown = !!show[showKey];
            const type = f.type || (f.sensitive ? 'password' : 'text');
            const value = drafts[service]?.[f.key] ?? '';
            const setValue = v => setDrafts(d => ({
              ...d,
              [service]: { ...(d[service] || {}), [f.key]: v }
            }));
            // Long fields span both columns
            const spanFull = type === 'textarea';
            return (
              <div key={f.key} className={`space-y-1 ${spanFull ? 'md:col-span-2' : ''}`}>
                <Label className="text-gray-300 text-sm flex items-center justify-between">
                  <span>{f.label}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${source[f.key] === 'db' ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}`}>
                    {source[f.key] || 'unset'}
                  </span>
                </Label>
                <div className="relative">
                  {type === 'textarea' ? (
                    <textarea
                      className={`w-full bg-black/50 border border-white/10 text-white rounded-md p-3 text-xs font-mono leading-relaxed min-h-[140px] ${f.sensitive && !isShown ? 'tracking-widest' : ''}`}
                      placeholder={f.placeholder || `Paste ${f.label.toLowerCase()} di sini...`}
                      value={value}
                      onChange={e => setValue(e.target.value)}
                      spellCheck={false}
                      style={f.sensitive && !isShown ? { WebkitTextSecurity: 'disc' } : undefined}
                      data-testid={`field-${service}-${f.key}`}
                    />
                  ) : type === 'select' ? (
                    <select
                      className="w-full h-10 bg-black/50 border border-white/10 text-white rounded-md px-3 text-sm"
                      value={value || (current[f.key] || '')}
                      onChange={e => setValue(e.target.value)}
                      data-testid={`field-${service}-${f.key}`}
                    >
                      <option value="">— pilih mode —</option>
                      {(f.options || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={f.sensitive && !isShown ? 'password' : 'text'}
                      className="bg-black/50 border-white/10 text-white pr-10"
                      placeholder={current[f.key] || `(belum diset di env, masukkan ${f.label.toLowerCase()})`}
                      value={value}
                      onChange={e => setValue(e.target.value)}
                      data-testid={`field-${service}-${f.key}`}
                    />
                  )}
                  {f.sensitive && type !== 'select' && (
                    <button
                      type="button"
                      className={`absolute ${type === 'textarea' ? 'right-2 top-2' : 'right-2 top-1/2 -translate-y-1/2'} text-muted-foreground hover:text-white`}
                      onClick={() => setShow(s => ({ ...s, [showKey]: !isShown }))}
                    >
                      {isShown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {f.hint && (
                  <p className="text-xs text-muted-foreground">{f.hint}</p>
                )}
                <p className="text-xs text-muted-foreground font-mono">
                  Current: {
                    typeof current[f.key] === 'string' && current[f.key].length > 60
                      ? current[f.key].slice(0, 40) + '...(truncated)'
                      : (current[f.key] || '(empty)')
                  }
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <ServiceCard service="ayolinx" />
      <ServiceCard service="digiflazz" />
    </div>
  );
}
