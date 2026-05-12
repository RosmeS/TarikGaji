'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface SidebarProps {
  activeGroupId?: string
}

export function Sidebar({ activeGroupId }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (pathname === '/login') return null

  const navItems = [
    { href: '/overview', label: 'Overview', icon: '◈' },
    { href: '/dashboard', label: 'Dashboard', icon: '▤' },
    { href: '/payments', label: 'Payments', icon: '$' },
    { href: '/members', label: 'Members', icon: '☺' },
    { href: '/history', label: 'History', icon: '⌚' },
    { href: '/admin/setup', label: 'Setup', icon: '⚙' },
  ]

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-56'} bg-white border-r border-slate-200 flex flex-col h-full transition-all duration-300 shrink-0`}>
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h1 className={`text-lg font-bold text-slate-900 tracking-tight ${isCollapsed ? 'text-sm' : ''}`}>
            {isCollapsed ? 'TG' : 'Tarik Gaji'}
          </h1>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
          >
            <span className={`transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}>
              ◀
            </span>
          </button>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {!isCollapsed && navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={activeGroupId ? `${item.href}?group=${activeGroupId}` : item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
            >
              <span className="w-5 text-center text-sm">{item.icon}</span>
              <span className={`${isCollapsed ? 'hidden' : ''}`}>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-4 border-t border-slate-200">
        <Link
          href="/login"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <span className="w-5 text-center">⎋</span>
          <span className={`${isCollapsed ? 'hidden' : ''}`}>Logout</span>
        </Link>
      </div>
    </aside>
  )
}
