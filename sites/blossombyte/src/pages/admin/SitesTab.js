import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import {
  Save, Loader2, Plus, Trash2, Edit2, X, Check, Globe,
  ArrowRightCircle, MonitorSmartphone, RefreshCw, Upload, FileJson, Sparkles
} from 'lucide-react';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EMPTY_CFG = {
  site_id: '',
  prefix: '',
  brand_name: '',
  forward_url_qris: '',
  forward_url_va: '',
  forward_url_digiflazz: '',
  process_locally: false,
  active: true,
  notes: '',
};

const STARTER_THEME_TEMPLATE = JSON.stringify({
  id: 'mybrand',
  siteId: 'mybrand',
  orderPrefix: 'MYB',
  brand: { name: 'MyBrand', short: 'My', legalName: 'PT MY BRAND' },
  meta: {
    title: 'MyBrand | Top Up Game & Voucher',
    description: 'MyBrand - Top up game dan voucher digital terpercaya.',
    themeColor: '#2563EB',
  },
  assets: {
    logo: '/logo-mybrand.svg',
    heroBg: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&q=80',
  },
  copy: {
    hero: {
      titleLine1: 'Top Up Game',
      titleLine2: 'Cepat & Aman',
      subtitle: 'Layanan top-up game & voucher digital. Proses kilat, harga bersaing, support 24/7.',
      searchPlaceholder: 'Cari game atau voucher...',
    },
    features: [
      { label: 'Cepat', desc: 'Proses < 5 detik' },
      { label: 'Murah', desc: 'Harga terbaik' },
      { label: 'Aman', desc: '100% terpercaya' },
      { label: 'Support', desc: '24/7 via chat' },
    ],
    cta: {
      titlePrefix: 'Jadi ',
      titleHighlight: 'My',
      titleSuffix: 'Reseller!',
      subtitle: 'Daftar reseller untuk harga partner.',
      button: 'Daftar Reseller',
    },
    footer: { tagline: 'Platform top-up digital terpercaya — MyBrand.' },
  },
  colors: {
    primary: '#2563EB',
    secondary: '#FFFFFF',
    accent: '#F59E0B',
    background: '#0B1220',
    card: '#111827',
    border: '#1F2937',
    foreground: '#F3F4F6',
    success: '#22C55E',
    destructive: '#EF4444',
    gradientFrom: '#2563EB',
    gradientTo: '#F59E0B',
  },
  fonts: {
    display: "'Rajdhani', 'Space Grotesk', sans-serif",
    body: "'Plus Jakarta Sans', 'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  style: {
    heroVisual: 'controller-orb',
    mascotGlow: 'drop-shadow(0 0 30px rgba(37, 99, 235, 0.4))',
    heroAccent1: 'bg-primary/20',
    heroAccent2: 'bg-accent/20',
  },
}, null, 2);

export default function SitesTab() {
  const [configs, setConfigs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);  // site_id or '__new__'
  const [draft, setDraft] = useState(EMPTY_CFG);
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(null);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneJsonText, setCloneJsonText] = useState('');
  const [cloning, setCloning] = useState(false);
  const [cloneLog, setCloneLog] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cfgRes, sitesRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/site-configs`),
        axios.get(`${API_BASE}/admin/sites/available`),
      ]);
      setConfigs(cfgRes.data.items || []);
      setFolders(sitesRes.data.sites || []);
      setActiveFolder(sitesRes.data.active || null);
    } catch (e) {
      toast.error('Gagal memuat data site');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (cfg) => {
    setEditing(cfg.site_id);
    setDraft({ ...EMPTY_CFG, ...cfg });
  };

  const startNew = () => {
    setEditing('__new__');
    setDraft(EMPTY_CFG);
  };

  const cancel = () => { setEditing(null); setDraft(EMPTY_CFG); };

  const save = async () => {
    const prefix = (draft.prefix || '').trim().toUpperCase().slice(0, 3);
    if (!draft.site_id?.trim()) { toast.error('site_id wajib diisi'); return; }
    if (prefix.length !== 3 || !/^[A-Z0-9]+$/.test(prefix)) { toast.error('Prefix harus 3 karakter alfanumerik'); return; }
    setSaving(true);
    try {
      const payload = { ...draft, prefix };
      if (editing === '__new__') {
        await axios.post(`${API_BASE}/admin/site-configs`, payload);
        toast.success(`Site ${payload.site_id} dibuat`);
      } else {
        await axios.put(`${API_BASE}/admin/site-configs/${editing}`, payload);
        toast.success(`Site ${editing} diupdate`);
      }
      await load();
      cancel();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Gagal menyimpan');
    }
    setSaving(false);
  };

  const remove = async (site_id) => {
    if (!window.confirm(`Hapus konfigurasi site '${site_id}'? Order yang sudah ada tidak terpengaruh.`)) return;
    try {
      await axios.delete(`${API_BASE}/admin/site-configs/${site_id}`);
      toast.success('Konfigurasi dihapus');
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Gagal menghapus');
    }
  };

  const switchFrontend = async (name) => {
    if (!window.confirm(`Switch tampilan frontend ke '${name}'? Frontend akan restart, halaman ini akan reload otomatis.`)) return;
    setSwitching(name);
    try {
      const { data } = await axios.post(`${API_BASE}/admin/sites/switch`, { name });
      if (data.ok) {
        toast.success(`Frontend di-switch ke ${name}. Reloading...`);
        setTimeout(() => window.location.reload(), 4000);
      } else {
        toast.error(`Switch gagal: ${data.stderr || 'unknown error'}`);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Gagal switch frontend');
    }
    setSwitching(null);
  };

  const openCloneDialog = () => {
    setCloneOpen(true);
    setCloneLog(null);
    if (!cloneJsonText) setCloneJsonText(STARTER_THEME_TEMPLATE);
  };

  const handleJsonFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const obj = JSON.parse(ev.target.result);
        setCloneJsonText(JSON.stringify(obj, null, 2));
      } catch (e) {
        toast.error('File bukan JSON valid');
      }
    };
    reader.readAsText(file);
  };

  const submitClone = async () => {
    let theme;
    try {
      theme = JSON.parse(cloneJsonText);
    } catch (e) {
      toast.error('JSON theme tidak valid: ' + e.message);
      return;
    }
    setCloning(true);
    setCloneLog(null);
    try {
      const { data } = await axios.post(`${API_BASE}/admin/sites/clone-new`, { theme });
      setCloneLog(data);
      if (data.ok) {
        toast.success(`Site '${data.site_id}' berhasil dibuat (prefix ${data.prefix})`);
        await load();
      } else {
        toast.error(`Clone gagal: ${data.message || 'unknown'}`);
      }
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      setCloneLog({ ok: false, message: msg });
      toast.error(`Clone gagal: ${msg}`);
    }
    setCloning(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ============ FRONTEND SWITCHER ============ */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-rajdhani font-semibold text-lg text-white uppercase flex items-center gap-2">
              <MonitorSmartphone className="w-5 h-5" /> Frontend Aktif
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Pilih tema/site yang ditampilkan ke pengunjung. Klik switch untuk ganti.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={openCloneDialog}
              className="bg-accent hover:bg-accent/90 text-background"
              data-testid="open-clone-site-btn"
            >
              <Sparkles className="w-4 h-4 mr-1" /> Tambah Tema / Brand Baru
            </Button>
            <Button variant="ghost" size="sm" onClick={load} className="text-muted-foreground">
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>
        <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {folders.length === 0 && (
            <div className="text-muted-foreground text-sm col-span-full">
              Tidak ada folder site ditemukan di /app/sites/.
            </div>
          )}
          {folders.map(f => {
            const isActive = f.name === activeFolder;
            return (
              <div key={f.name} className={`p-4 rounded-lg border ${isActive ? 'border-primary bg-primary/10' : 'border-border bg-black/40'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-rajdhani font-semibold text-white">{f.brand}</h3>
                  {isActive && <span className="text-xs px-2 py-0.5 bg-primary text-white rounded font-mono">ACTIVE</span>}
                </div>
                <p className="text-xs text-muted-foreground font-mono mb-3">/app/sites/{f.name}</p>
                <Button
                  size="sm"
                  variant={isActive ? 'ghost' : 'default'}
                  className={isActive ? 'text-muted-foreground' : 'bg-primary hover:bg-primary/90 w-full'}
                  disabled={isActive || switching === f.name}
                  onClick={() => switchFrontend(f.name)}
                >
                  {switching === f.name
                    ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Switching...</>
                    : isActive
                      ? 'Sedang aktif'
                      : <><ArrowRightCircle className="w-3 h-3 mr-1" /> Switch ke {f.name}</>}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ SITE CONFIGS REGISTRY ============ */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-rajdhani font-semibold text-lg text-white uppercase flex items-center gap-2">
              <Globe className="w-5 h-5" /> Prefix & Proxy Forward Settings
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Setiap site punya prefix order_id (3 huruf) + URL forward callback ke proxy Anda.
              Format order: <span className="font-mono text-xs">LLL + YYYYMMDDHHMMSS + 4 hex</span> (mis. <span className="font-mono text-xs">NEO20260416070531D54F</span>)
            </p>
          </div>
          <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={startNew} disabled={editing === '__new__'}>
            <Plus className="w-4 h-4 mr-1" /> Site Baru
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/40 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-3">Site ID</th>
                <th className="text-left px-4 py-3">Prefix</th>
                <th className="text-left px-4 py-3">Brand</th>
                <th className="text-left px-4 py-3">QRIS Forward</th>
                <th className="text-left px-4 py-3">VA Forward</th>
                <th className="text-left px-4 py-3">Local</th>
                <th className="text-left px-4 py-3">Aktif</th>
                <th className="text-right px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {editing === '__new__' && <EditRow draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} saving={saving} isNew />}
              {configs.map(cfg => editing === cfg.site_id ? (
                <EditRow key={cfg.site_id} draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} saving={saving} />
              ) : (
                <tr key={cfg.site_id} className="border-t border-border hover:bg-black/20">
                  <td className="px-4 py-3 font-mono text-white">{cfg.site_id}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-accent/20 text-accent rounded font-mono font-semibold">{cfg.prefix}</span></td>
                  <td className="px-4 py-3 text-white">{cfg.brand_name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate" title={cfg.forward_url_qris}>{cfg.forward_url_qris || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate" title={cfg.forward_url_va}>{cfg.forward_url_va || '—'}</td>
                  <td className="px-4 py-3">{cfg.process_locally ? <Check className="w-4 h-4 text-success" /> : <X className="w-4 h-4 text-muted-foreground" />}</td>
                  <td className="px-4 py-3">{cfg.active ? <Check className="w-4 h-4 text-success" /> : <X className="w-4 h-4 text-destructive" />}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" className="text-primary mr-1" onClick={() => startEdit(cfg)}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    {cfg.site_id !== 'blaze' && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(cfg.site_id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {configs.length === 0 && editing !== '__new__' && (
                <tr><td colSpan="8" className="text-center py-8 text-muted-foreground">Belum ada konfigurasi site.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* ============ CLONE-NEW-SITE DIALOG ============ */}
      {cloneOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !cloning && setCloneOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            data-testid="clone-site-dialog"
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-rajdhani font-semibold text-lg text-white uppercase flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" /> Tambah Tema & Brand Baru
                </h3>
                <p className="text-muted-foreground text-xs mt-1">
                  Upload file <span className="font-mono">.json</span> tema, atau edit langsung template di bawah. Backend akan otomatis clone site React baru.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => !cloning && setCloneOpen(false)} disabled={cloning}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => handleJsonFile(e.target.files?.[0])}
                    data-testid="clone-upload-input"
                  />
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary/20 text-primary hover:bg-primary/30 text-sm border border-primary/40">
                    <Upload className="w-4 h-4" /> Upload .json
                  </span>
                </label>
                <span className="text-muted-foreground text-xs">
                  Atau edit JSON template di textarea (default sudah terisi).
                </span>
              </div>

              <div>
                <Label className="text-gray-300 text-xs flex items-center gap-1">
                  <FileJson className="w-3 h-3" /> Theme JSON
                </Label>
                <textarea
                  className="w-full mt-1 h-80 bg-black/60 border border-white/10 rounded-md p-3 text-xs text-white font-mono leading-relaxed"
                  value={cloneJsonText}
                  onChange={(e) => setCloneJsonText(e.target.value)}
                  spellCheck={false}
                  data-testid="clone-json-textarea"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Wajib: <span className="font-mono">siteId</span>, <span className="font-mono">orderPrefix</span> (3 char), <span className="font-mono">brand.name</span>, <span className="font-mono">colors.primary</span>, <span className="font-mono">copy</span>, <span className="font-mono">fonts</span>. Gunakan <span className="font-mono">style.heroVisual</span> = <span className="font-mono">controller-orb | circuit-grid | pixel-tiles | gold-orbs | crosshair-radar</span> untuk visual hero unik.
                </p>
              </div>

              {cloneLog && (
                <div className={`p-3 rounded-md text-xs border ${cloneLog.ok ? 'bg-success/10 border-success/40 text-success' : 'bg-destructive/10 border-destructive/40 text-destructive'}`}>
                  <div className="font-semibold mb-1">{cloneLog.message || (cloneLog.ok ? 'OK' : 'Gagal')}</div>
                  {cloneLog.stderr && <pre className="whitespace-pre-wrap break-words opacity-80 mt-1 max-h-32 overflow-y-auto">{cloneLog.stderr}</pre>}
                  {cloneLog.stdout && cloneLog.ok && <pre className="whitespace-pre-wrap break-words opacity-80 mt-1 max-h-32 overflow-y-auto">{cloneLog.stdout}</pre>}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setCloneOpen(false)} disabled={cloning} className="text-muted-foreground">
                Batal
              </Button>
              <Button
                onClick={submitClone}
                disabled={cloning || !cloneJsonText.trim()}
                className="bg-accent hover:bg-accent/90 text-background"
                data-testid="submit-clone-btn"
              >
                {cloning ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Membuat...</> : <><Sparkles className="w-4 h-4 mr-1" /> Buat Site</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditRow({ draft, setDraft, onSave, onCancel, saving, isNew }) {
  const upd = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  return (
    <tr className="border-t border-primary/40 bg-primary/5">
      <td className="px-2 py-2">
        <Input className="bg-black/50 border-white/10 text-white h-9 font-mono text-xs" placeholder="neonforge" disabled={!isNew} value={draft.site_id} onChange={e => upd('site_id', e.target.value)} />
      </td>
      <td className="px-2 py-2">
        <Input className="bg-black/50 border-white/10 text-white h-9 font-mono text-xs uppercase" placeholder="NEO" maxLength={3} value={draft.prefix} onChange={e => upd('prefix', e.target.value.toUpperCase())} />
      </td>
      <td className="px-2 py-2">
        <Input className="bg-black/50 border-white/10 text-white h-9 text-xs" placeholder="NeonForge" value={draft.brand_name} onChange={e => upd('brand_name', e.target.value)} />
      </td>
      <td className="px-2 py-2">
        <Input className="bg-black/50 border-white/10 text-white h-9 text-xs" placeholder="https://proxy.example.com/qris" value={draft.forward_url_qris || ''} onChange={e => upd('forward_url_qris', e.target.value)} />
      </td>
      <td className="px-2 py-2">
        <Input className="bg-black/50 border-white/10 text-white h-9 text-xs" placeholder="https://proxy.example.com/va" value={draft.forward_url_va || ''} onChange={e => upd('forward_url_va', e.target.value)} />
      </td>
      <td className="px-2 py-2 text-center">
        <Switch checked={!!draft.process_locally} onCheckedChange={v => upd('process_locally', v)} />
      </td>
      <td className="px-2 py-2 text-center">
        <Switch checked={!!draft.active} onCheckedChange={v => upd('active', v)} />
      </td>
      <td className="px-2 py-2 text-right whitespace-nowrap">
        <Button size="sm" className="bg-success hover:bg-success/90 mr-1" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
        </Button>
        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onCancel}>
          <X className="w-3 h-3" />
        </Button>
      </td>
    </tr>
  );
}
