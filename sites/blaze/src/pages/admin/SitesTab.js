import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import {
  Save, Loader2, Plus, Trash2, Edit2, X, Check, Globe,
  ArrowRightCircle, MonitorSmartphone, RefreshCw
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

export default function SitesTab() {
  const [configs, setConfigs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);  // site_id or '__new__'
  const [draft, setDraft] = useState(EMPTY_CFG);
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(null);

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
          <Button variant="ghost" size="sm" onClick={load} className="text-muted-foreground">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
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
