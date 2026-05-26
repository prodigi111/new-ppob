import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Save, Database, Loader2, Eye, EyeOff } from 'lucide-react';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SERVICE_FIELDS = {
  ayolinx: [
    { key: 'client_key', label: 'Client Key' },
    { key: 'client_secret', label: 'Client Secret', sensitive: true },
    { key: 'customer_no', label: 'Customer No' },
    { key: 'private_key_path', label: 'Private Key Path' },
    { key: 'public_key_path', label: 'Public Key Path' },
    { key: 'mode', label: 'Mode (sandbox/production)' },
  ],
  digiflazz: [
    { key: 'username', label: 'Username' },
    { key: 'api_key', label: 'API Key', sensitive: true },
    { key: 'webhook_secret', label: 'Webhook Secret', sensitive: true },
    { key: 'webhook_id', label: 'Webhook ID' },
    { key: 'mode', label: 'Mode (development/production)' },
  ],
};

export default function IntegrationsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
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

  const ServiceCard = ({ service }) => {
    const fields = SERVICE_FIELDS[service];
    const current = settings[service]?.values || {};
    const source = settings[service]?.source || {};
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-rajdhani font-semibold text-lg text-white uppercase flex items-center gap-2">
              <Database className="w-5 h-5" /> {service.toUpperCase()} Integration
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Credentials saat ini (sumber: <span className="font-mono text-xs">env</span> = dari `.env`, <span className="font-mono text-xs">db</span> = override admin).
              Kosongkan kolom untuk fallback ke env.
            </p>
          </div>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90"
            onClick={() => save(service)}
            disabled={saving[service]}
          >
            {saving[service] ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Simpan {service}
          </Button>
        </div>
        <div className="p-6 grid md:grid-cols-2 gap-4">
          {fields.map(f => {
            const showKey = `${service}.${f.key}`;
            const isShown = !!show[showKey];
            return (
              <div key={f.key} className="space-y-1">
                <Label className="text-gray-300 text-sm flex items-center justify-between">
                  <span>{f.label}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${source[f.key] === 'db' ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}`}>
                    {source[f.key] || 'unset'}
                  </span>
                </Label>
                <div className="relative">
                  <Input
                    type={f.sensitive && !isShown ? 'password' : 'text'}
                    className="bg-black/50 border-white/10 text-white pr-10"
                    placeholder={current[f.key] || `(belum diset di env, masukkan ${f.label.toLowerCase()})`}
                    value={drafts[service]?.[f.key] || ''}
                    onChange={e => setDrafts(d => ({
                      ...d,
                      [service]: { ...(d[service] || {}), [f.key]: e.target.value }
                    }))}
                  />
                  {f.sensitive && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                      onClick={() => setShow(s => ({ ...s, [showKey]: !isShown }))}
                    >
                      {isShown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono">Current: {current[f.key] || '(empty)'}</p>
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
