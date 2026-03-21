'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { User, Building2, Copy, Wallet } from 'lucide-react'

export default function SettingsPage() {
  const { getAccessToken, user: privyUser } = usePrivy()
  const [profile, setProfile] = useState({ name: '', phone: '' })
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const token = await getAccessToken()
      const [profileRes, banksRes] = await Promise.all([
        fetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/bank-accounts', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (profileRes.ok) {
        const d = await profileRes.json()
        setProfile({ name: d?.name || '', phone: d?.phone || '' })
      }
      if (banksRes.ok) setBankAccounts((await banksRes.json()).bankAccounts)
      setIsLoading(false)
    }
    load()
  }, [getAccessToken])

  const saveProfile = async () => {
    setIsSaving(true)
    const token = await getAccessToken()
    await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(profile),
    })
    setIsSaving(false)
  }

  const copyWallet = () => navigator.clipboard.writeText(privyUser?.wallet?.address || '')

  if (isLoading) return <div className="animate-pulse">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-brand-black">Settings</h1>

      {/* Wallet Section */}
      <section className="bg-white rounded-xl border border-brand-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="w-5 h-5 text-brand-gray" />
          <h2 className="text-lg font-semibold">Wallet</h2>
        </div>
        <div className="flex items-center gap-2 p-3 bg-brand-light rounded-lg">
          <code className="flex-1 text-sm break-all">{privyUser?.wallet?.address || 'No wallet'}</code>
          <button onClick={copyWallet} className="p-2 hover:bg-white rounded-lg shrink-0">
            <Copy className="w-4 h-4 text-brand-gray" />
          </button>
        </div>
      </section>

      {/* Profile Section */}
      <section className="bg-white rounded-xl border border-brand-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-brand-gray" />
          <h2 className="text-lg font-semibold">Profile</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={privyUser?.email?.address || ''}
              disabled
              className="w-full px-4 py-2 border border-brand-border rounded-lg bg-brand-light text-brand-gray"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-2 border border-brand-border rounded-lg"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              className="w-full px-4 py-2 border border-brand-border rounded-lg"
              placeholder="+234..."
            />
          </div>
          <button
            onClick={saveProfile}
            disabled={isSaving}
            className="px-6 py-2 bg-brand-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </section>

      {/* Bank Accounts Section */}
      <section className="bg-white rounded-xl border border-brand-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-5 h-5 text-brand-gray" />
          <h2 className="text-lg font-semibold">Bank Accounts</h2>
        </div>
        {bankAccounts.length === 0 ? (
          <p className="text-brand-gray">No bank accounts added yet. Add one from the Withdrawals page.</p>
        ) : (
          <ul className="space-y-2">
            {bankAccounts.map(bank => (
              <li
                key={bank.id}
                className="p-3 bg-brand-light rounded-lg flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{bank.bankName}</p>
                  <p className="text-sm text-brand-gray">
                    {bank.accountName} • ****{bank.accountNumber.slice(-4)}
                  </p>
                </div>
                {bank.isDefault && (
                  <span className="text-xs bg-brand-black text-white px-2 py-1 rounded">Default</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
