'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Mail, RefreshCw, Search, Send, Upload, CheckCircle2, AlertTriangle,
  X, Edit3, Save, Trash2, Users,
} from 'lucide-react';
import { api } from '@/lib/api';

type Prospect = {
  id: string; company_name: string; country: string; emirate?: string | null;
  free_zone?: string | null; email?: string | null; phone?: string | null;
  website?: string | null; specialties?: string | null; status: string;
  invited_at?: string | null; invite_count: number;
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  prospect: { bg: '#F3F4F6', color: '#6B7280', label: 'Prospect' },
  invited: { bg: '#FEF3C7', color: '#92400E', label: 'Invited' },
  registered: { bg: '#D1FAE5', color: '#065F46', label: 'Registered' },
  declined: { bg: '#FEE2E2', color: '#991B1B', label: 'Declined' },
};

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [stats, setStats] = useState({ total: 0, invited: 0, registered: 0, with_email: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Prospect>>({});
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTarget, setComposeTarget] = useState<'selected' | 'all'>('selected');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senderName, setSenderName] = useState('');
  const [links, setLinks] = useState({ access_link: '', register_link: '', reset_link: '' });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; skipped_no_email: number } | null>(null);
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter) q.set('status', statusFilter);
      if (search) q.set('search', search);
      const res = await api.get<{ prospects: Prospect[]; stats: typeof stats }>(`/prospects?${q.toString()}`);
      setProspects(res.prospects);
      setStats(res.stats);
    } catch (e: any) { setNotice(e.message || 'Failed to load prospects'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const grouped = useMemo(() => {
    const byZone: Record<string, Prospect[]> = {};
    for (const p of prospects) {
      const key = `${p.country} — ${p.free_zone || 'Unspecified zone'}`;
      (byZone[key] ||= []).push(p);
    }
    return byZone;
  }, [prospects]);

  const toggleSelect = (id: string) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const startEdit = (p: Prospect) => { setEditingId(p.id); setEditDraft({ email: p.email || '', phone: p.phone || '' }); };
  const saveEdit = async (id: string) => {
    try {
      await api.patch(`/prospects/${id}`, editDraft);
      setEditingId(null);
      load();
    } catch (e: any) { setNotice(e.message || 'Update failed'); }
  };

  const removeProspect = async (id: string) => {
    if (!confirm('Remove this prospect from the directory?')) return;
    try { await api.delete(`/prospects/${id}`); load(); } catch (e: any) { setNotice(e.message || 'Delete failed'); }
  };

  const openCompose = async (target: 'selected' | 'all') => {
    setComposeTarget(target);
    setResult(null);
    try {
      const tpl = await api.get<{ subject: string; body: string; links: typeof links }>('/prospects/template');
      setSubject(tpl.subject); setBody(tpl.body); setLinks(tpl.links);
      setSenderName('The SnapHubTrade.com team');
      setComposeOpen(true);
    } catch (e: any) { setNotice(e.message || 'Could not load template'); }
  };

  const sendInvites = async () => {
    setSending(true); setResult(null);
    try {
      const payload: any = { subject, body, sender_name: senderName };
      if (composeTarget === 'all') payload.all = true;
      else payload.ids = Array.from(selected);
      const res = await api.post<{ sent: number; failed: number; skipped_no_email: number }>('/prospects/invite', payload);
      setResult(res);
      setSelected(new Set());
      load();
    } catch (e: any) { setNotice(e.message || 'Sending failed'); }
    finally { setSending(false); }
  };

  const syncRegistered = async () => {
    try { const r = await api.post<{ matched: number }>('/prospects/sync-registered', {}); setNotice(`${r.matched} prospect(s) matched to registered dealers.`); load(); }
    catch (e: any) { setNotice(e.message || 'Sync failed'); }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mail size={20} style={{ color: '#C1272D' }} /> Dealer Prospects
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>GCC free-zone dealer directory — complete contacts, then invite them to subscribe.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={syncRegistered} style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid #E5E7EB', background: 'white', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Sync registered
          </button>
          <button onClick={() => openCompose('all')} style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: '#C1272D', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Send size={14} /> Invite all
          </button>
        </div>
      </div>

      {notice && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#EFF6FF', color: '#1E40AF', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{notice}</span>
          <button onClick={() => setNotice('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1E40AF' }}><X size={14} /></button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total prospects', value: stats.total, color: '#111827' },
          { label: 'With email', value: stats.with_email, color: '#3B82F6' },
          { label: 'Invited', value: stats.invited, color: '#92400E' },
          { label: 'Registered', value: stats.registered, color: '#065F46' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: '0.74rem', color: '#9CA3AF', margin: '2px 0 0' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + bulk action */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search company name…" className="input-white" style={{ paddingLeft: 32, fontSize: '0.82rem' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-white" style={{ width: 160, fontSize: '0.82rem' }}>
          <option value="">All statuses</option>
          <option value="prospect">Prospect</option>
          <option value="invited">Invited</option>
          <option value="registered">Registered</option>
          <option value="declined">Declined</option>
        </select>
        {selected.size > 0 && (
          <button onClick={() => openCompose('selected')} style={{ padding: '9px 14px', borderRadius: 9, border: 'none', background: '#111827', color: 'white', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Send size={13} /> Invite {selected.size} selected
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><RefreshCw size={22} style={{ color: '#9CA3AF', animation: 'spin 1s linear infinite' }} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(grouped).map(([zone, list]) => (
            <div key={zone} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', background: '#FAFAFA', borderBottom: '1px solid #E5E7EB', fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>
                {zone} <span style={{ color: '#9CA3AF', fontWeight: 500 }}>({list.length})</span>
              </div>
              {list.map(p => {
                const st = STATUS_STYLE[p.status] || STATUS_STYLE.prospect;
                const editing = editingId === p.id;
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderTop: '1px solid #F3F4F6', fontSize: '0.82rem' }}>
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} disabled={!p.email} title={!p.email ? 'Add an email first' : ''} />
                    <div style={{ flex: '1 1 160px', fontWeight: 600, color: '#111827' }}>{p.company_name}</div>
                    <div style={{ flex: '1 1 200px' }}>
                      {editing ? (
                        <input value={editDraft.email || ''} onChange={e => setEditDraft(d => ({ ...d, email: e.target.value }))}
                          placeholder="email@company.com" className="input-white" style={{ fontSize: '0.78rem', padding: '5px 8px' }} />
                      ) : (
                        <span style={{ color: p.email ? '#374151' : '#D1D5DB' }}>{p.email || 'No email yet'}</span>
                      )}
                    </div>
                    <div style={{ flex: '0 0 130px' }}>
                      {editing ? (
                        <input value={editDraft.phone || ''} onChange={e => setEditDraft(d => ({ ...d, phone: e.target.value }))}
                          placeholder="+971…" className="input-white" style={{ fontSize: '0.78rem', padding: '5px 8px' }} />
                      ) : (
                        <span style={{ color: p.phone ? '#374151' : '#D1D5DB' }}>{p.phone || '—'}</span>
                      )}
                    </div>
                    <span style={{ flex: '0 0 90px', textAlign: 'center', padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color, fontSize: '0.7rem', fontWeight: 700 }}>{st.label}</span>
                    <div style={{ flex: '0 0 70px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {editing ? (
                        <button onClick={() => saveEdit(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669' }}><Save size={15} /></button>
                      ) : (
                        <button onClick={() => startEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><Edit3 size={14} /></button>
                      )}
                      <button onClick={() => removeProspect(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {!prospects.length && (
            <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
              <Users size={28} style={{ margin: '0 auto 8px' }} />
              <p>No prospects match these filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Compose modal */}
      {composeOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '88vh', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                Invite {composeTarget === 'all' ? 'all prospects with an email' : `${selected.size} selected prospect(s)`}
              </h2>
              <button onClick={() => setComposeOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {result ? (
              <div style={{ padding: 16, borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#065F46', margin: '0 0 8px' }}>
                  <CheckCircle2 size={16} /> {result.sent} invitation(s) sent
                </p>
                {result.failed > 0 && <p style={{ fontSize: '0.82rem', color: '#B91C1C', margin: '4px 0' }}>{result.failed} failed to send — check email provider config.</p>}
                {result.skipped_no_email > 0 && <p style={{ fontSize: '0.82rem', color: '#92400E', margin: '4px 0' }}>{result.skipped_no_email} skipped (no email on file).</p>}
                <button onClick={() => setComposeOpen(false)} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 9, border: 'none', background: '#111827', color: 'white', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Close</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Sender name</label>
                    <input value={senderName} onChange={e => setSenderName(e.target.value)} className="input-white" style={{ fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Subject</label>
                    <input value={subject} onChange={e => setSubject(e.target.value)} className="input-white" style={{ fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
                      Message — {'{{company_name}}'}, {'{{free_zone}}'} personalize per recipient
                    </label>
                    <textarea value={body} onChange={e => setBody(e.target.value)} rows={12}
                      className="input-white" style={{ fontSize: '0.8rem', fontFamily: 'monospace', lineHeight: 1.5 }} />
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: '#FAFAFA', border: '1px solid #E5E7EB', fontSize: '0.76rem', color: '#6B7280' }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#374151' }}>Links auto-inserted in every email:</p>
                    <p style={{ margin: '2px 0' }}>• Platform access: <code>{links.access_link}</code></p>
                    <p style={{ margin: '2px 0' }}>• Create account: <code>{links.register_link}</code></p>
                    <p style={{ margin: '2px 0' }}>• Reset password: <code>{links.reset_link}</code></p>
                  </div>
                  {error_hint(composeTarget, selected.size)}
                </div>
                <button onClick={sendInvites} disabled={sending}
                  style={{ marginTop: 18, width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: sending ? '#9CA3AF' : '#C1272D', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: sending ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {sending ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
                  {sending ? 'Sending…' : 'Send invitations'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function error_hint(target: 'selected' | 'all', count: number) {
  if (target === 'selected' && count === 0) {
    return <p style={{ fontSize: '0.78rem', color: '#B91C1C' }}>No prospects selected — go back and check some first.</p>;
  }
  return null;
}
