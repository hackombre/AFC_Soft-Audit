'use client';
import { useEffect, useState } from 'react';
import Modal from './Modal';
import { api, ApiError } from '@/lib/api';
import type { MissionMember, UserOut } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/types';

export default function MissionAccessModal({ open, missionId, onClose }: { open: boolean; missionId: string | null; onClose: () => void }) {
  const [users, setUsers] = useState<UserOut[]>([]); const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => {
    if (!open || !missionId) return; setLoading(true); setError('');
    Promise.all([api.listUsers(), api.listMissionMembers(missionId)]).then(([u, m]) => {
      setUsers(u as UserOut[]); setSelected(new Set((m as MissionMember[]).filter(x => x.role !== 'associe').map(x => x.id)));
    }).catch(e => setError(e instanceof ApiError ? e.message : 'Impossible de charger les accès.')).finally(() => setLoading(false));
  }, [open, missionId]);
  function toggle(id:string){ setSelected(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }); }
  async function save(){
    if(!missionId)return;
    setSaving(true);
    setError('');
    try{
      // Les membres sont enregistrés dans tous les cas ici — un
      // échec ne peut concerner que la synchronisation Google
      // Drive qui suit, jamais l'enregistrement lui-même.
      const result = await api.updateMissionMembers(missionId, Array.from(selected)) as { drive_sync_warning?: string | null };
      onClose();
      if (result?.drive_sync_warning) {
        window.alert(`Accès mis à jour. ${result.drive_sync_warning}`);
      }
    } catch(e){
      setError(e instanceof ApiError?e.message:'Impossible de modifier les accès.')
    } finally{
      setSaving(false)
    }
  }
  return <Modal open={open} onClose={onClose} title="Accès à la mission" subtitle="Tous les associés ont automatiquement accès à cette mission.">
    <div className="space-y-4">
      <div className="rounded-xl" style={{border:'1.5px solid #e2e8f0'}}>
        {loading ? <p className="p-4 text-sm" style={{color:'#94a3b8'}}>Chargement…</p> : users.map(u => <label key={u.id} className="flex items-center gap-3 px-4 py-3" style={{borderBottom:'1px solid #f1f5f9',opacity:u.role==='associe'?.6:1}}>
          <input type="checkbox" disabled={u.role==='associe'} checked={u.role==='associe'||selected.has(u.id)} onChange={()=>toggle(u.id)} className="accent-blue-600"/>
          <span className="flex-1 min-w-0"><b className="text-sm">{u.first_name} {u.last_name}</b><span className="block text-xs truncate" style={{color:'#64748b'}}>{u.email}</span></span>
          <span className="text-xs" style={{color:'#94a3b8'}}>{u.role==='associe'?'Accès obligatoire':ROLE_LABELS[u.role]}</span>
        </label>)}
      </div>
      {error && <p className="text-sm px-3 py-2 rounded-lg" style={{color:'#b91c1c',background:'#fef2f2'}}>{error}</p>}
      <div className="flex gap-3"><button onClick={save} disabled={saving||loading} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{background:'#2563eb',color:'white'}}>{saving?'Enregistrement…':'Enregistrer les accès'}</button><button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm" style={{border:'1px solid #e2e8f0'}}>Annuler</button></div>
    </div>
  </Modal>;
}