'use client';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useLocale } from '@/contexts/LocaleContext';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { Globe, Globe2, Lock, Users, Building2, Share2, X, Check, RefreshCw, Search, Copy, Link2, MessageCircle, ArrowRight, ChevronDown, Plus, Trash2, Eye, QrCode, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { usePriceFormatter } from '@/components/common/Price';

// ─── Types ─────────────────────────────────────────────────────────────────

interface DealerResult { id:string; company_name:string; slug:string; phone?:string; whatsapp?:string; rating:number; address?:string; verified:boolean }
interface BrokerResult { id:string; full_name:string; company_name?:string; tier?:string; city?:string; country?:string }
interface Vehicle { id:string; make:string; model:string; year:number; status:string; price_aed:number; trim?:string; vehicle_images?:{cdn_url:string;is_primary:boolean}[] }

const VIS_CFG = {
  private:     { label:'Private',                    icon:Lock,      color:'#6B7280', bg:'#F3F4F6', desc:'Only you' },
  selected:    { label:'Selected dealers & brokers',  icon:Users,     color:'#3B82F6', bg:'#DBEAFE', desc:'Invited only' },
  network:     { label:'Full network',                icon:Globe,     color:'#007A3D', bg:'#D1FAE5', desc:'All dealers' },
  network_all: { label:'Full network + brokers',      icon:Globe2,    color:'#0E7490', bg:'#CFFAFE', desc:'All dealers and brokers' },
  group:       { label:'Group only',                  icon:Building2, color:'#8B5CF6', bg:'#EDE9FE', desc:'Your group' },
};

const STATUS_CFG: Record<string,{label:string;color:string;bg:string}> = {
  available:{ label:'Available', color:'#065F46', bg:'#D1FAE5' },
  reserved: { label:'Reserved',  color:'#92400E', bg:'#FEF3C7' },
  sold:     { label:'Sold',      color:'#374151', bg:'#F3F4F6' },
  draft:    { label:'Draft',     color:'#5B21B6', bg:'#EDE9FE' },
};

function Tab({ active, onClick, children }: any) {
  return (
    <button onClick={onClick} style={{
      padding:'10px 18px', background:'none', border:'none',
      borderBottom: active ? '2px solid #C1272D' : '2px solid transparent',
      fontWeight: active ? 600 : 400, color: active ? '#C1272D' : '#6B7280',
      cursor:'pointer', fontSize:'0.875rem', whiteSpace:'nowrap',
    }}>
      {children}
    </button>
  );
}

// ─── Dealer Search Component ────────────────────────────────────────────────

function DealerSearch({ selected, onChange }: { selected: DealerResult[]; onChange: (dealers: DealerResult[]) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<DealerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<any>(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<any>(`/dealers?search=${encodeURIComponent(q)}&limit=8`);
        setResults(data.items || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
  }, [q]);

  const toggle = (d: DealerResult) => {
    if (selected.find(s => s.id === d.id)) onChange(selected.filter(s => s.id !== d.id));
    else onChange([...selected, d]);
  };

  return (
    <div>
      <div style={{ position:'relative' }}>
        <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search dealer name, zone…"
          className="input-white" style={{ paddingLeft:32, fontSize:'0.875rem' }} />
        {loading && <RefreshCw size={13} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF', animation:'spin 1s linear infinite' }} />}
      </div>

      {/* Search results dropdown */}
      {results.length > 0 && (
        <div style={{ border:'1px solid #E5E7EB', borderTop:'none', borderRadius:'0 0 10px 10px', background:'white', maxHeight:220, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,0.08)' }}>
          {results.map(d => {
            const isSelected = !!selected.find(s => s.id === d.id);
            return (
              <button key={d.id} onClick={() => toggle(d)}
                style={{ width:'100%', padding:'10px 14px', display:'flex', alignItems:'center', gap:10, background: isSelected ? '#FFF1F2' : 'white', border:'none', borderBottom:'1px solid #F3F4F6', cursor:'pointer', textAlign:'left' }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', fontWeight:700, color:'#374151', flexShrink:0 }}>
                  {d.company_name.charAt(0)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:600, color:'#111827', margin:0, fontSize:'0.875rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.company_name}</p>
                  <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.75rem' }}>{d.address?.split(',')[0] || 'UAE'} {d.verified ? '✓ Verified' : ''}</p>
                </div>
                {isSelected
                  ? <Check size={15} color="#C1272D" style={{ flexShrink:0 }} />
                  : <Plus size={15} color="#9CA3AF" style={{ flexShrink:0 }} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
          {selected.map(d => (
            <div key={d.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:20, background:'#FFF1F2', border:'1px solid #FECACA' }}>
              <span style={{ fontSize:'0.8rem', color:'#C1272D', fontWeight:500 }}>{d.company_name}</span>
              <button onClick={() => toggle(d)} style={{ background:'none', border:'none', cursor:'pointer', padding:0, color:'#C1272D', display:'flex' }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { from{transform:translateY(-50%) rotate(0deg)}to{transform:translateY(-50%) rotate(360deg)} }`}</style>
    </div>
  );
}

function BrokerSearch({ selected, onChange }: { selected: BrokerResult[]; onChange: (brokers: BrokerResult[]) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<BrokerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<any>(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<any>(`/broker/search?query=${encodeURIComponent(q)}&limit=8`);
        setResults(data.items || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
  }, [q]);

  const toggle = (b: BrokerResult) => {
    if (selected.find(s => s.id === b.id)) onChange(selected.filter(s => s.id !== b.id));
    else onChange([...selected, b]);
  };

  return (
    <div>
      <div style={{ position:'relative' }}>
        <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search broker name, code…"
          className="input-white" style={{ paddingLeft:32, fontSize:'0.875rem' }} />
        {loading && <RefreshCw size={13} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF', animation:'spin 1s linear infinite' }} />}
      </div>

      {results.length > 0 && (
        <div style={{ border:'1px solid #E5E7EB', borderTop:'none', borderRadius:'0 0 10px 10px', background:'white', maxHeight:220, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,0.08)' }}>
          {results.map(b => {
            const isSelected = !!selected.find(s => s.id === b.id);
            return (
              <button key={b.id} onClick={() => toggle(b)}
                style={{ width:'100%', padding:'10px 14px', display:'flex', alignItems:'center', gap:10, background: isSelected ? '#ECFEFF' : 'white', border:'none', borderBottom:'1px solid #F3F4F6', cursor:'pointer', textAlign:'left' }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'#CFFAFE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', fontWeight:700, color:'#0E7490', flexShrink:0 }}>
                  {b.full_name.charAt(0)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:600, color:'#111827', margin:0, fontSize:'0.875rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.full_name}</p>
                  <p style={{ color:'#9CA3AF', margin:0, fontSize:'0.75rem' }}>{b.company_name || 'Broker'} {b.tier ? `· ${b.tier}` : ''}</p>
                </div>
                {isSelected
                  ? <Check size={15} color="#0E7490" style={{ flexShrink:0 }} />
                  : <Plus size={15} color="#9CA3AF" style={{ flexShrink:0 }} />}
              </button>
            );
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
          {selected.map(b => (
            <div key={b.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:20, background:'#ECFEFF', border:'1px solid #A5F3FC' }}>
              <span style={{ fontSize:'0.8rem', color:'#0E7490', fontWeight:500 }}>{b.full_name}</span>
              <button onClick={() => toggle(b)} style={{ background:'none', border:'none', cursor:'pointer', padding:0, color:'#0E7490', display:'flex' }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Share Modal ────────────────────────────────────────────────────────────

function ShareModal({ vehicle, dealerId, onClose, onDone }: { vehicle:Vehicle; dealerId:string; onClose:()=>void; onDone:()=>void }) {
  const { t } = useLocale();
  const [visibility, setVisibility] = useState<'private'|'selected'|'network'|'network_all'|'group'>('network');
  const [selectedDealers, setSelectedDealers] = useState<DealerResult[]>([]);
  const [selectedBrokers, setSelectedBrokers] = useState<BrokerResult[]>([]);
  const [perms, setPerms] = useState({ can_propose:true, can_reserve:true, can_transfer:false, can_negotiate:true });
  const [endsAt, setEndsAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.post(`/collaborative/vehicles/${vehicle.id}/share`, {
        owner_dealer_id: dealerId, visibility,
        dealer_ids: visibility === 'selected' ? selectedDealers.map(d => d.id) : undefined,
        broker_ids: visibility === 'selected' ? selectedBrokers.map(b => b.id) : undefined,
        permissions: perms,
        ends_at: endsAt || undefined,
      });
      // Generate invite link
      const link = `${window.location.origin}/dealer/shared?invite=${vehicle.id}&from=${dealerId}`;
      setInviteLink(link);
      onDone();
    } catch (e:any) { setError(e.message || 'Failed'); setSaving(false); }
  };

  const copyLink = () => {
    const link = inviteLink || `${window.location.origin}/dealer/shared?invite=${vehicle.id}&from=${dealerId}`;
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const PERM_LIST = [
    { key:'can_propose', label:'Propose a client' },
    { key:'can_reserve', label:'Reserve vehicle' },
    { key:'can_transfer', label:'Request transfer' },
    { key:'can_negotiate', label:'Make an offer' },
  ];

  if (inviteLink) return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:440, padding:28, textAlign:'center' }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:'#D1FAE5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <Check size={26} color="#065F46" />
        </div>
        <h2 style={{ fontWeight:700, color:'#111827', marginBottom:6 }}>{t('dealer.shared.success')}</h2>
        <p style={{ color:'#6B7280', fontSize:'0.875rem', marginBottom:20 }}>Share this link with other dealers so they can access the vehicle</p>
        <div style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:10, padding:'10px 14px', marginBottom:12, display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ flex:1, fontSize:'0.75rem', color:'#374151', wordBreak:'break-all', textAlign:'left' }}>{inviteLink}</span>
          <button onClick={copyLink} style={{ background:'#C1272D', color:'white', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontWeight:600, fontSize:'0.8rem', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            {copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
          </button>
        </div>
        {vehicle && vehicle.id && (
          <a href={`https://wa.me/?text=${encodeURIComponent(`I've shared a vehicle with you on SnapHubTrade.com: ${vehicle.year} ${vehicle.make} ${vehicle.model} — ${inviteLink}`)}`}
            target="_blank" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px 20px', background:'#25D366', color:'white', textDecoration:'none', borderRadius:10, fontWeight:600, fontSize:'0.875rem', marginBottom:12 }}>
            <MessageCircle size={15} /> Share via WhatsApp
          </a>
        )}
        <button onClick={onClose} style={{ width:'100%', padding:'10px 0', border:'1.5px solid #E5E7EB', borderRadius:10, background:'white', cursor:'pointer', color:'#374151', fontWeight:500 }}>
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:500, maxHeight:'92vh', overflowY:'auto' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #F3F4F6', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'white', zIndex:1 }}>
          <div>
            <p style={{ fontWeight:700, color:'#111827', margin:0 }}>Share vehicle</p>
            <p style={{ fontSize:'0.8rem', color:'#6B7280', margin:0 }}>{vehicle.year} {vehicle.make} {vehicle.model}</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={18} color="#9CA3AF" /></button>
        </div>

        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:18 }}>
          {error && <div style={{ background:'#FEE2E2', color:'#991B1B', padding:'10px 14px', borderRadius:8, fontSize:'0.875rem' }}>{error}</div>}

          {/* Visibility */}
          <div>
            <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Visibility</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(Object.entries(VIS_CFG) as any[]).map(([v, cfg]) => {
                const Icon = cfg.icon;
                const active = visibility === v;
                return (
                  <button key={v} onClick={() => setVisibility(v as any)}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:10, border:`2px solid ${active ? cfg.color : '#E5E7EB'}`, background: active ? cfg.color+'0A' : 'white', cursor:'pointer', textAlign:'left' }}>
                    <div style={{ width:36, height:36, borderRadius:8, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon size={16} style={{ color:cfg.color }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:600, color:'#111827', margin:'0 0 2px', fontSize:'0.875rem' }}>{cfg.label}</p>
                      <p style={{ color:'#6B7280', margin:0, fontSize:'0.75rem' }}>{cfg.desc}</p>
                    </div>
                    {active && <Check size={16} style={{ color:cfg.color, flexShrink:0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dealer + broker search for 'selected' */}
          {visibility === 'selected' && (
            <>
              <div>
                <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                  Search and select dealers
                </p>
                <DealerSearch selected={selectedDealers} onChange={setSelectedDealers} />
              </div>
              <div>
                <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                  Search and select brokers
                </p>
                <BrokerSearch selected={selectedBrokers} onChange={setSelectedBrokers} />
              </div>
              {selectedDealers.length === 0 && selectedBrokers.length === 0 && (
                <p style={{ fontSize:'0.8rem', color:'#F59E0B', margin:0 }}>⚠ Add at least one dealer or broker</p>
              )}
            </>
          )}

          {/* Permissions */}
          <div>
            <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Guest permissions</p>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {PERM_LIST.map(p => (
                <label key={p.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, border:'1px solid #E5E7EB', cursor:'pointer', background:(perms as any)[p.key] ? '#FFF1F2' : 'white' }}>
                  <input type="checkbox" checked={(perms as any)[p.key]}
                    onChange={e => setPerms(prev => ({ ...prev, [p.key]: e.target.checked }))}
                    style={{ accentColor:'#C1272D', width:15, height:15 }} />
                  <span style={{ fontSize:'0.875rem', color:'#374151' }}>{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div>
            <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Share expires (optional)</p>
            <input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="input-white" style={{ fontSize:'0.875rem' }} />
          </div>

          {/* Invite link preview */}
          <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10, padding:'10px 14px', display:'flex', gap:8, alignItems:'center' }}>
            <Link2 size={14} color="#007A3D" style={{ flexShrink:0 }} />
            <p style={{ fontSize:'0.8rem', color:'#065F46', margin:0 }}>An invite link will be generated after sharing — shareable via WhatsApp or copy-paste</p>
          </div>
        </div>

        <div style={{ padding:'14px 20px', borderTop:'1px solid #F3F4F6', display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px 0', border:'1.5px solid #E5E7EB', borderRadius:10, background:'white', cursor:'pointer', fontWeight:500, color:'#374151' }}>Cancel</button>
          <button onClick={save} disabled={saving || (visibility==='selected' && selectedDealers.length===0 && selectedBrokers.length===0)}
            style={{ flex:2, padding:'11px 0', background:'#C1272D', color:'white', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:(saving||(visibility==='selected'&&selectedDealers.length===0&&selectedBrokers.length===0))?0.6:1 }}>
            {saving ? <RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }} /> : <Share2 size={14} />}
            {saving ? 'Sharing…' : 'Share vehicle'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Collaboration actions ─────────────────────────────────────────────────

function CollabActions({ vehicle, dealerId }: { vehicle:any; dealerId:string }) {
  const [offer, setOffer] = useState('');
  const [sending, setSending] = useState('');
  const [done, setDone] = useState('');

  const send = async (type: string, extra: any = {}) => {
    setSending(type);
    try {
      await api.post(`/collaborative/vehicles/${vehicle.id}/messages`, {
        from_dealer_id: dealerId,
        to_dealer_id: vehicle.dealer?.id || '',
        msg_type: type,
        content: `${type.replace(/_/g,' ')} request for ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        offer_price_aed: extra.price,
      });
      setDone(type);
      setTimeout(() => setDone(''), 3000);
    } catch { /* */ }
    finally { setSending(''); }
  };

  const p = vehicle.my_permissions || {};
  return (
    <div style={{ padding:'10px 14px', borderTop:'1px solid #F3F4F6', display:'flex', flexWrap:'wrap', gap:6 }}>
      {done && <div style={{ width:'100%', background:'#D1FAE5', color:'#065F46', padding:'5px 10px', borderRadius:6, fontSize:'0.75rem', display:'flex', alignItems:'center', gap:5 }}><Check size={11}/> Sent!</div>}
      {p.can_reserve && <button onClick={() => send('reserve_request')} disabled={!!sending} style={{ fontSize:'0.75rem', padding:'5px 11px', borderRadius:8, background:'#FEF3C7', color:'#92400E', border:'1px solid #FDE68A', cursor:'pointer', fontWeight:500 }}>Reserve</button>}
      {p.can_propose && <button onClick={() => send('message')} disabled={!!sending} style={{ fontSize:'0.75rem', padding:'5px 11px', borderRadius:8, background:'#DBEAFE', color:'#1E40AF', border:'1px solid #BFDBFE', cursor:'pointer', fontWeight:500 }}>Propose client</button>}
      {p.can_negotiate && (
        <div style={{ display:'flex', gap:4 }}>
          <input type="number" value={offer} onChange={e => setOffer(e.target.value)}
            placeholder="Offer AED" style={{ width:100, padding:'5px 8px', border:'1px solid #E5E7EB', borderRadius:7, fontSize:'0.75rem', color:'#111827' }} />
          <button onClick={() => send('offer', { price:+offer })} disabled={!offer||!!sending}
            style={{ fontSize:'0.75rem', padding:'5px 10px', borderRadius:8, background:'#007A3D', color:'white', border:'none', cursor:'pointer', fontWeight:500 }}>Offer</button>
        </div>
      )}
      {p.can_transfer && <button onClick={() => send('transfer_request')} disabled={!!sending} style={{ fontSize:'0.75rem', padding:'5px 11px', borderRadius:8, background:'#EDE9FE', color:'#5B21B6', border:'1px solid #DDD6FE', cursor:'pointer', fontWeight:500 }}>Transfer</button>}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function SharedInventoryPage() {
  const { t } = useLocale();
  const formatPrice = usePriceFormatter();
  const [tab, setTab] = useState<'my-shares'|'shared-with-me'|'network'|'requests'>('my-shares');
  const [myShares, setMyShares] = useState<any[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<any[]>([]);
  const [network, setNetwork] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [myVehicles, setMyVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [dealerId, setDealerId] = useState('');
  const [shareTarget, setShareTarget] = useState<Vehicle|null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const did = localStorage.getItem('dealer_id') || '';
    setDealerId(did);
  }, []);

  useEffect(() => { if (dealerId) load(); }, [tab, dealerId]);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'my-shares') {
        const [shares, inv] = await Promise.all([
          api.get<any>(`/collaborative/dealer/${dealerId}/my-shares`),
          api.get<any>(`/dealer-dashboard/${dealerId}/inventory?limit=100`),
        ]);
        setMyShares(shares || []);
        setMyVehicles(inv?.items || []);
      } else if (tab === 'shared-with-me') {
        const data = await api.get<any>(`/collaborative/dealer/${dealerId}/shared-with-me`);
        setSharedWithMe(data || []);
      } else if (tab === 'requests') {
        const data = await api.get<any>(`/collaborative/dealer/${dealerId}/incoming-requests`);
        setIncomingRequests(Array.isArray(data) ? data : []);
      } else {
        const params = search ? `?search=${search}` : '';
        const data = await api.get<any>(`/collaborative/dealer/${dealerId}/network${params}`);
        setNetwork(data?.items || []);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  };

  const revoke = async (vehicleId: string) => {
    if (!confirm('Remove all shares for this vehicle?')) return;
    try {
      await fetch(`/api/v1/collaborative/vehicles/${vehicleId}/share`, {
        method:'DELETE', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ owner_dealer_id: dealerId }),
      });
      load();
    } catch { /* */ }
  };

  const unshared = myVehicles.filter(v => !myShares.find((s:any) => s.vehicle?.id === v.id) && v.status !== 'sold');

  const [outcomeNotice, setOutcomeNotice] = useState<{ kind:string; invoiceNumber?:string } | null>(null);

  const respondToRequest = async (messageId: string, response: 'accepted'|'declined') => {
    setRespondingId(messageId);
    try {
      const res = await fetch(`/api/v1/collaborative/messages/${messageId}/respond`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, dealer_id: dealerId }),
      });
      const data = await res.json().catch(() => null);
      setIncomingRequests(reqs => reqs.map(r => r.id === messageId ? { ...r, status: response } : r));

      const outcome = data?.outcome;
      if (outcome?.kind === 'sold') {
        setOutcomeNotice({ kind: 'sold', invoiceNumber: outcome.auto_invoice?.invoice_number });
        load();
      } else if (outcome?.kind === 'reserved') {
        setOutcomeNotice({ kind: 'reserved' });
        load();
      } else if (outcome?.kind === 'error') {
        setOutcomeNotice({ kind: 'error' });
      }
      setTimeout(() => setOutcomeNotice(null), 6000);
    } catch { /* */ }
    finally { setRespondingId(null); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB' }}>
      {shareTarget && <ShareModal vehicle={shareTarget} dealerId={dealerId} onClose={() => setShareTarget(null)} onDone={load} />}

      {/* Header */}
      <div style={{ background:'white', borderBottom:'1px solid #E5E7EB', padding:'16px 24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', maxWidth:1200, margin:'0 auto' }}>
          <div>
            <h1 style={{ fontWeight:700, fontSize:'1.1rem', color:'#111827', margin:0 }}>{t('dealer.shared.title')}</h1>
            <p style={{ fontSize:'0.8rem', color:'#6B7280', margin:0 }}>Collaborate with other dealers on your stock</p>
          </div>
          <button onClick={load} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #E5E7EB', background:'white', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:'0.875rem', color:'#374151' }}>
            <RefreshCw size={13}/> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:'white', borderBottom:'1px solid #E5E7EB', paddingLeft:24, display:'flex', overflowX:'auto' }}>
        <Tab active={tab==='my-shares'} onClick={() => setTab('my-shares')}>My shares ({myShares.length})</Tab>
        <Tab active={tab==='shared-with-me'} onClick={() => setTab('shared-with-me')}>Shared with me ({sharedWithMe.length})</Tab>
        <Tab active={tab==='network'} onClick={() => setTab('network')}>Network ({network.length})</Tab>
        <Tab active={tab==='requests'} onClick={() => setTab('requests')}>📥 Requests ({incomingRequests.filter((r:any)=>r.status==='pending').length})</Tab>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px 16px' }}>
        {outcomeNotice && (
          <div style={{
            marginBottom: 16, padding: '12px 16px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600,
            background: outcomeNotice.kind === 'error' ? '#FEE2E2' : outcomeNotice.kind === 'sold' ? '#D1FAE5' : '#FEF3C7',
            color: outcomeNotice.kind === 'error' ? '#991B1B' : outcomeNotice.kind === 'sold' ? '#065F46' : '#92400E',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <span>
              {outcomeNotice.kind === 'sold' && `✅ Vehicle marked as sold${outcomeNotice.invoiceNumber ? ` — invoice ${outcomeNotice.invoiceNumber} created as draft` : ''}.`}
              {outcomeNotice.kind === 'reserved' && '🔖 Vehicle reserved for the requester.'}
              {outcomeNotice.kind === 'error' && '⚠ Accepted, but the vehicle could not be updated (it may no longer be available). Check its status manually.'}
            </span>
            {outcomeNotice.kind === 'sold' && (
              <a href="/dealer/billing" style={{ color: '#065F46', fontWeight: 700, textDecoration: 'underline', whiteSpace: 'nowrap' }}>View invoice →</a>
            )}
          </div>
        )}

        {tab === 'requests' && !loading && (
          <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #F3F4F6' }}>
              <p style={{ fontWeight:700, color:'#111827', margin:0 }}>Incoming requests</p>
              <p style={{ fontSize:'0.78rem', color:'#6B7280', margin:'2px 0 0' }}>Brokers and dealers asking to transfer, propose, or negotiate on your shared vehicles.</p>
            </div>
            {incomingRequests.length === 0 ? (
              <div style={{ padding:'32px 20px', textAlign:'center', color:'#9CA3AF' }}>
                <p style={{ margin:0, fontSize:'0.85rem' }}>No requests yet.</p>
              </div>
            ) : incomingRequests.map((r:any) => {
              const from = r.from_broker ? `${r.from_broker.full_name} (broker)` : r.from_dealer ? r.from_dealer.company_name : 'Someone';
              const statusCfg: Record<string, {bg:string; color:string; label:string}> = {
                pending:  { bg:'#FEF3C7', color:'#92400E', label:'Pending' },
                accepted: { bg:'#D1FAE5', color:'#065F46', label:'Accepted' },
                declined: { bg:'#FEE2E2', color:'#991B1B', label:'Declined' },
              };
              const cfg = statusCfg[r.status] || statusCfg.pending;
              return (
                <div key={r.id} style={{ padding:'14px 20px', borderTop:'1px solid #F9FAFB', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:200 }}>
                    <p style={{ fontWeight:600, color:'#111827', margin:'0 0 2px', fontSize:'0.86rem' }}>
                      {r.vehicle ? `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}` : 'Vehicle'}
                    </p>
                    <p style={{ fontSize:'0.76rem', color:'#9CA3AF', margin:0 }}>
                      {r.msg_type === 'transfer_request' ? 'Transfer request' : r.msg_type} from {from} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {r.status === 'pending' ? (
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => respondToRequest(r.id, 'accepted')} disabled={respondingId===r.id}
                        style={{ padding:'7px 14px', borderRadius:9, border:'none', background:'#059669', color:'white', fontWeight:700, fontSize:'0.78rem', cursor:'pointer' }}>
                        Accept
                      </button>
                      <button onClick={() => respondToRequest(r.id, 'declined')} disabled={respondingId===r.id}
                        style={{ padding:'7px 14px', borderRadius:9, border:'1px solid #E5E7EB', background:'white', color:'#6B7280', fontWeight:700, fontSize:'0.78rem', cursor:'pointer' }}>
                        Decline
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize:'0.72rem', padding:'4px 12px', borderRadius:20, fontWeight:700, background:cfg.bg, color:cfg.color }}>{cfg.label}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'#9CA3AF' }}>
            <RefreshCw size={24} style={{ margin:'0 auto 12px', display:'block', animation:'spin 1s linear infinite' }} />
            <p>Loading…</p>
          </div>
        ) : tab === 'my-shares' ? (
          <>
            {/* Share a vehicle */}
            {unshared.length > 0 && (
              <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, padding:16, marginBottom:20 }}>
                <p style={{ fontWeight:700, color:'#111827', marginBottom:10, fontSize:'0.875rem' }}>
                  🔗 Share a vehicle with the network
                </p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {unshared.slice(0,8).map(v => (
                    <button key={v.id} onClick={() => setShareTarget(v)}
                      style={{ padding:'7px 13px', borderRadius:8, border:'1px solid #E5E7EB', background:'white', cursor:'pointer', fontSize:'0.8rem', color:'#374151', display:'flex', alignItems:'center', gap:6 }}>
                      <Share2 size={11} color="#C1272D" />
                      {v.year} {v.make} {v.model}{v.trim ? ' '+v.trim : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {myShares.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 0', color:'#9CA3AF' }}>
                <Share2 size={40} style={{ margin:'0 auto 12px', display:'block', opacity:0.3 }} />
                <p style={{ fontWeight:500, marginBottom:4 }}>No shared vehicles</p>
                <p style={{ fontSize:'0.875rem' }}>Select a vehicle above to share it with other dealers</p>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:14 }}>
                {myShares.map((share:any) => {
                  const v = share.vehicle;
                  const cfg = (VIS_CFG as any)[share.visibility] || VIS_CFG.private;
                  const Icon = cfg.icon;
                  const st = STATUS_CFG[v?.status] || STATUS_CFG.available;
                  return (
                    <div key={share.id} style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
                      <div style={{ padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div>
                          <p style={{ fontWeight:700, color:'#111827', margin:'0 0 4px', fontSize:'0.9rem' }}>{v?.year} {v?.make} {v?.model}</p>
                          <span style={{ fontSize:'0.72rem', padding:'2px 8px', borderRadius:20, fontWeight:500, background:st.bg, color:st.color }}>{st.label}</span>
                        </div>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => setShareTarget(v)} title="Edit share" style={{ padding:6, borderRadius:7, border:'1px solid #E5E7EB', background:'white', cursor:'pointer' }}>
                            <Share2 size={13} color="#6B7280" />
                          </button>
                          <a href={`/dealer/timeline/${v?.id}`} title="Timeline" style={{ padding:6, borderRadius:7, border:'1px solid #E5E7EB', background:'white', display:'flex', alignItems:'center' }}>
                            <Clock size={13} color="#6B7280" />
                          </a>
                          <button onClick={() => revoke(v?.id)} title="Revoke" style={{ padding:6, borderRadius:7, border:'1px solid #FECACA', background:'#FEF2F2', cursor:'pointer' }}>
                            <X size={13} color="#DC2626" />
                          </button>
                        </div>
                      </div>
                      <div style={{ padding:'8px 16px', background:'#F9FAFB', borderTop:'1px solid #F3F4F6', display:'flex', alignItems:'center', gap:8 }}>
                        <Icon size={13} style={{ color:cfg.color }} />
                        <span style={{ fontSize:'0.8rem', color:cfg.color, fontWeight:500 }}>{cfg.label}</span>
                        <span style={{ fontSize:'0.75rem', color:'#9CA3AF', marginLeft:'auto' }}>{share.permissions?.length || 0} dealers</span>
                      </div>
                      {share.permissions?.length > 0 && (
                        <div style={{ padding:'8px 16px', borderTop:'1px solid #F3F4F6' }}>
                          {share.permissions.slice(0,3).map((p:any) => (
                            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                              <div style={{ width:22, height:22, borderRadius:'50%', background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:700, color:'#374151' }}>
                                {p.dealer?.company_name?.charAt(0) || '?'}
                              </div>
                              <span style={{ fontSize:'0.78rem', color:'#374151' }}>{p.dealer?.company_name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : tab === 'shared-with-me' ? (
          sharedWithMe.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 0', color:'#9CA3AF' }}>
              <Users size={40} style={{ margin:'0 auto 12px', display:'block', opacity:0.3 }} />
              <p style={{ fontWeight:500 }}>No vehicles shared with you</p>
              <p style={{ fontSize:'0.875rem' }}>Other dealers can share vehicles with you and you'll see them here</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14 }}>
              {sharedWithMe.map((v:any) => {
                const img = v.vehicle_images?.[0]?.cdn_url;
                const st = STATUS_CFG[v.status] || STATUS_CFG.available;
                return (
                  <div key={v.id} style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
                    <div style={{ height:140, background:'#F3F4F6', overflow:'hidden', position:'relative' }}>
                      {img
                        ? <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>🚗</div>}
                      <span style={{ position:'absolute', top:8, right:8, fontSize:'0.72rem', padding:'3px 8px', borderRadius:20, background:st.bg, color:st.color, fontWeight:600 }}>{st.label}</span>
                      <span style={{ position:'absolute', bottom:8, left:8, background:'rgba(0,0,0,0.7)', color:'white', padding:'4px 10px', borderRadius:6, fontSize:'0.8rem', fontWeight:700 }}>
                        {formatPrice(Number(v.price_aed))}
                      </span>
                    </div>
                    <div style={{ padding:'12px 14px' }}>
                      <p style={{ fontWeight:700, color:'#111827', margin:'0 0 2px' }}>{v.year} {v.make} {v.model}{v.trim ? ' '+v.trim : ''}</p>
                      <p style={{ fontSize:'0.78rem', color:'#6B7280', margin:'0 0 6px' }}>{v.mileage_km===0?'New':`${v.mileage_km.toLocaleString()} km`}{v.color_exterior ? ` · ${v.color_exterior}` : ''}</p>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <Building2 size={11} color="#9CA3AF" />
                        <span style={{ fontSize:'0.75rem', color:'#9CA3AF' }}>{v.dealer?.company_name}</span>
                        {v.dealer?.whatsapp && (
                          <a href={`https://wa.me/${v.dealer.whatsapp.replace(/\D/g,'')}`} target="_blank" style={{ marginLeft:'auto', color:'#25D366' }}><MessageCircle size={14}/></a>
                        )}
                      </div>
                    </div>
                    <CollabActions vehicle={v} dealerId={dealerId} />
                  </div>
                );
              })}
            </div>
          )
        ) : tab === 'network' ? (
          /* Network tab */
          <>
            <div style={{ display:'flex', gap:10, marginBottom:16 }}>
              <div style={{ position:'relative', flex:1, maxWidth:320 }}>
                <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} />
                <input value={search} onChange={e => { setSearch(e.target.value); }} onKeyDown={e => { if(e.key==='Enter') load(); }}
                  placeholder="Search make, model…" className="input-white" style={{ paddingLeft:30, fontSize:'0.875rem' }} />
              </div>
              <button onClick={load} style={{ padding:'9px 16px', background:'#C1272D', color:'white', border:'none', borderRadius:10, fontWeight:600, cursor:'pointer', fontSize:'0.875rem' }}>Search</button>
            </div>
            {network.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 0', color:'#9CA3AF' }}>
                <Globe size={40} style={{ margin:'0 auto 12px', display:'block', opacity:0.3 }} />
                <p>No network vehicles available</p>
                <p style={{ fontSize:'0.875rem' }}>Dealers sharing with the full network will appear here</p>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:14 }}>
                {network.map((v:any) => {
                  const img = v.vehicle_images?.[0]?.cdn_url;
                  return (
                    <div key={v.id} style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
                      <div style={{ height:120, background:'#F3F4F6', overflow:'hidden' }}>
                        {img ? <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}>🚗</div>}
                      </div>
                      <div style={{ padding:'12px 14px' }}>
                        <p style={{ fontWeight:700, color:'#111827', margin:'0 0 2px', fontSize:'0.875rem' }}>{v.year} {v.make} {v.model}</p>
                        <p style={{ color:'#C1272D', fontWeight:700, margin:'0 0 4px' }}>{formatPrice(Number(v.price_aed))}</p>
                        <p style={{ fontSize:'0.75rem', color:'#9CA3AF', margin:0 }}>{v.dealer?.company_name}</p>
                        <a href={`/vehicle/${v.id}`} style={{ display:'flex', alignItems:'center', gap:4, color:'#C1272D', fontSize:'0.8rem', fontWeight:500, marginTop:8, textDecoration:'none' }}>
                          View details <ArrowRight size={12}/>
                        </a>
                      </div>
                      <CollabActions vehicle={v} dealerId={dealerId} />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
