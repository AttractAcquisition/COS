import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';
import { Users, Shield, Link, Copy } from 'lucide-react';

// Validates that a string is a well-formed UUID v4 before writing it to the DB.
// This prevents silent RLS failures caused by whitespace or malformed pastes.
function isValidUUID(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
}

export default function AdminControl() {
  const [clientRecords, setClientRecords] = useState<any[]>([]);
  const [profileRecords, setProfileRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleForm, setRoleForm] = useState({ userId: '', role: 'delivery', metadataId: '' });
  const [roleUpdating, setRoleUpdating] = useState(false);
  // Controlled state for Section 2 inputs: keyed by client.id → manager UUID string
  const [managerInputs, setManagerInputs] = useState<Record<string, string>>({});
  // After a successful Section 1 role assignment, surface that UUID so admin can
  // carry it straight into the Section 2 mapping without re-typing.
  const [lastAssignedUUID, setLastAssignedUUID] = useState<string>('');
  const toast = useToast() as any;
  const launchGoogleOAuth = () => {
    window.location.assign('/oauth/google/start')
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientsResult, profilesResult] = await Promise.all([
        (supabase as any)
          .from('clients')
          .select('id, business_name, owner_name, account_manager, account_manager_name')
          .order('business_name', { ascending: true }),
        (supabase as any)
          .from('profiles')
          .select('id, email, full_name, role, client_id')
          .in('role', ['admin', 'distribution', 'delivery'])
          .order('role', { ascending: true })
          .order('full_name', { ascending: true }),
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (profilesResult.error) throw profilesResult.error;
      setClientRecords(clientsResult.data || []);
      setProfileRecords(profilesResult.data || []);
    } catch (err: any) {
      console.error('Fetch error:', err.message);
      toast.addToast?.('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Seed controlled inputs whenever clientRecords are loaded / refreshed
  useEffect(() => {
    const seed: Record<string, string> = {}
    clientRecords.forEach(c => { seed[c.id] = c.account_manager || '' })
    setManagerInputs(seed)
  }, [clientRecords]);

  const updateRole = async (userId: string, newRole: string, metadataId?: string): Promise<boolean> => {
    if (!isValidUUID(userId)) {
      toast.addToast?.('Invalid Auth User UUID format.', 'error');
      return false;
    }
    if (newRole === 'client' && (!metadataId || !isValidUUID(metadataId))) {
      toast.addToast?.('Client role requires a valid metadata_id (clients.id UUID).', 'error');
      return false;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.functions.invoke('update-user-role', {
      body: { user_id: userId, role: newRole, metadata_id: metadataId ?? null },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });

    if (error) {
      toast.addToast?.('Error updating role: ' + error.message, 'error');
      return false;
    }
    toast.addToast?.('Role updated in auth metadata ✓', 'success');
    return true;
  };

  // account_manager is a uuid column — validate before writing to avoid silent RLS failures
  const updateMapping = async (clientId: string, managerId: string) => {
    const trimmed = managerId.trim()

    // Allow clearing the assignment (empty string → null) but reject non-empty non-UUIDs
    if (trimmed && !isValidUUID(trimmed)) {
      toast.addToast?.('Invalid UUID format. Paste the exact Auth User UUID from Section 1.', 'error');
      // Reset the input back to its last saved value
      setManagerInputs(prev => ({ ...prev, [clientId]: clientRecords.find(c => c.id === clientId)?.account_manager || '' }))
      return;
    }

    const { error } = await (supabase as any)
      .from('clients')
      .update({ account_manager: trimmed || null })
      .eq('id', clientId);

    if (error) {
      console.error('Mapping Error:', error.message);
      toast.addToast?.('Mapping failed: ' + error.message, 'error');
    } else {
      toast.addToast?.('Client assigned successfully ✓', 'success');
      setClientRecords(prev => prev.map(c =>
        c.id === clientId ? { ...c, account_manager: trimmed || null } : c
      ));
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-bg1">
      <div className="text-teal-500 font-mono animate-pulse uppercase tracking-widest">
        Initializing Command Center...
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex items-center justify-between border-b border-white/5 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
            <Shield className="text-teal-400" size={32} /> AA OS
          </h1>
          <p className="text-zinc-500 text-sm font-mono uppercase tracking-tighter">Infrastructure Management</p>
        </div>
        <button
          onClick={launchGoogleOAuth}
          className="px-4 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-widest transition-all"
          style={{ background: 'var(--teal)', color: 'var(--bg)' }}
        >
          Connect Gmail OAuth
        </button>
      </header>

      {/* Section 1: User Permissions — managed via JWT user_metadata */}
      <section className="bg-zinc-900/40 p-8 rounded-2xl border border-white/5 backdrop-blur-md shadow-2xl">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white">
          <Users size={20} className="text-teal-400" /> System Permissions
        </h2>
        <p className="text-zinc-600 font-mono text-xs mb-6">
          Roles live in JWT <code className="text-teal-500">user_metadata</code>. Changes take effect on the user's next session refresh.
        </p>
        <div className="grid grid-cols-1 gap-4 max-w-xl">
          <div>
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Auth User UUID *</label>
            <input
              type="text"
              placeholder="e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={roleForm.userId}
              onChange={e => setRoleForm(f => ({ ...f, userId: e.target.value.trim() }))}
              className="w-full bg-zinc-950 border border-white/10 text-xs text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500 font-mono placeholder-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">New Role *</label>
              <select
                value={roleForm.role}
                onChange={e => setRoleForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-zinc-950 border border-white/10 text-xs text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="admin">Admin</option>
                <option value="delivery">Delivery</option>
                <option value="distribution">Distribution</option>
                <option value="client">Client</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">metadata_id (UUID)</label>
              <input
                type="text"
                placeholder="clients.id for client role"
                value={roleForm.metadataId}
                onChange={e => setRoleForm(f => ({ ...f, metadataId: e.target.value.trim() }))}
                className="w-full bg-zinc-950 border border-white/10 text-xs text-zinc-400 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500 font-mono placeholder-zinc-700"
              />
            </div>
          </div>
          <button
            disabled={!roleForm.userId || roleUpdating}
            onClick={async () => {
              setRoleUpdating(true);
              const success = await updateRole(roleForm.userId, roleForm.role, roleForm.metadataId || undefined);
              if (success) {
                // For delivery/distribution: the auth UUID IS the metadata_id used in account_manager.
                // Surface it so admin can paste it directly into Section 2 without re-typing.
                if (roleForm.role === 'delivery' || roleForm.role === 'distribution') {
                  setLastAssignedUUID(roleForm.userId);
                }
                setRoleForm(f => ({ ...f, userId: '', metadataId: '' }));
              }
              setRoleUpdating(false);
            }}
            className="w-fit px-5 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--teal)', color: 'var(--bg)' }}
          >
            {roleUpdating ? 'Updating...' : 'Apply Role →'}
          </button>

          {lastAssignedUUID && (
            <div className="mt-2 p-3 rounded-lg border border-teal-500/20 bg-teal-500/5 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Manager UUID (copy into Section 2)</div>
                <div className="font-mono text-xs text-teal-400 break-all">{lastAssignedUUID}</div>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(lastAssignedUUID); toast.addToast?.('UUID copied', 'success'); }}
                className="text-[10px] font-mono text-zinc-400 border border-white/10 rounded px-2 py-1 hover:border-teal-500 hover:text-teal-400 transition-all whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Account Mapping — uses clients table as source of truth */}
      <section className="bg-zinc-900/40 p-8 rounded-2xl border border-white/5 backdrop-blur-md shadow-2xl">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white">
          <Link size={20} className="text-teal-400" /> Infrastructure Mapping
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
          {['admin', 'distribution', 'delivery'].map(role => (
            <div key={role} className="rounded-xl border border-white/5 bg-zinc-950/60 p-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">{role} UUIDs</div>
              <div className="space-y-3">
                {profileRecords.filter(p => p.role === role).map(profile => (
                  <div key={profile.id} className="rounded-lg border border-white/5 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-white font-medium">{profile.full_name || profile.email || 'Unnamed'}</div>
                        <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{profile.email}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(profile.id)
                          toast.addToast?.('UUID copied', 'success')
                        }}
                        className="shrink-0 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-zinc-400 border border-white/10 rounded px-2 py-1 hover:border-teal-500 hover:text-teal-400 transition-colors"
                      >
                        <Copy size={11} /> Copy
                      </button>
                    </div>
                    <div className="mt-3 text-[10px] font-mono text-teal-400 break-all leading-5">{profile.id}</div>
                  </div>
                ))}
                {profileRecords.filter(p => p.role === role).length === 0 && (
                  <div className="text-xs text-zinc-600 font-mono border border-dashed border-white/10 rounded-lg p-3">No {role} users yet.</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-zinc-600 border-b border-white/5 text-[11px] uppercase tracking-[0.2em]">
                <th className="pb-4 font-semibold">Client Brand</th>
                <th className="pb-4 font-semibold">Current Lead (UUID)</th>
                <th className="pb-4 text-right font-semibold">Assign Manager UUID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {clientRecords.map(client => (
                <tr key={client.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-5">
                    <div className="text-teal-400 font-medium">{client.business_name || '—'}</div>
                    <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{client.owner_name || 'FUNNEL ACTIVE'}</div>
                  </td>
                  <td className="py-5">
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {client.account_manager_name
                        ? <span className="text-zinc-300">{client.account_manager_name}</span>
                        : <span className="text-zinc-600">Unassigned</span>
                      }
                    </div>
                    {client.account_manager && (
                      <div className="text-[9px] text-zinc-700 font-mono mt-0.5 truncate max-w-[180px]">{client.account_manager}</div>
                    )}
                  </td>
                  <td className="py-5 text-right">
                    <input
                      type="text"
                      placeholder="Paste manager UUID..."
                      value={managerInputs[client.id] ?? ''}
                      onChange={e => setManagerInputs(prev => ({ ...prev, [client.id]: e.target.value }))}
                      onBlur={() => {
                        const current = managerInputs[client.id] ?? ''
                        if (current !== (client.account_manager || '')) {
                          updateMapping(client.id, current)
                        }
                      }}
                      className={`w-full max-w-xs bg-zinc-950 border text-xs rounded-lg px-3 py-1.5 focus:outline-none font-mono placeholder-zinc-700 transition-colors ${
                        managerInputs[client.id] && !isValidUUID(managerInputs[client.id])
                          ? 'border-red-500/50 text-red-400 focus:border-red-500'
                          : 'border-white/10 text-zinc-400 focus:border-teal-500'
                      }`}
                    />
                    {managerInputs[client.id] && !isValidUUID(managerInputs[client.id]) && (
                      <div className="text-[9px] text-red-400 font-mono mt-1 text-right">Invalid UUID format</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
