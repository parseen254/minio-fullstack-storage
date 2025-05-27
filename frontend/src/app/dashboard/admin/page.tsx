'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { authService, User } from '@/services/auth'
import { useUsers } from '@/hooks/use-users'
import { usePosts } from '@/hooks/use-posts'
import { useFiles } from '@/hooks/use-files'
import { AdminStatsCard } from '@/components/admin/admin-stats-card'
import { UserManagementTable } from '@/components/admin/user-management-table'
import { ContentModerationPanel } from '@/components/admin/content-moderation-panel'
import { SystemMonitoring } from '@/components/admin/system-monitoring'
import { 
  Users, 
  FileText, 
  HardDrive, 
  Activity, 
  Settings, 
  Shield,
  AlertTriangle,
  TrendingUp
} from 'lucide-react'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  
  const { data: usersData } = useUsers()
  const { data: postsData } = usePosts()
  const { data: filesData } = useFiles()

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/auth/login')
      return
    }

    const currentUser = authService.getCurrentUser()
    if (!currentUser || currentUser.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    setUser(currentUser)
  }, [router])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  const adminStats = [
    {
      title: 'Total Users',
      value: usersData?.pagination?.total || 0,
      change: '+12%',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total Posts',
      value: postsData?.pagination?.total || 0,
      change: '+8%',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Storage Used',
      value: '45.2 GB',
      change: '+15%',
      icon: HardDrive,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'System Load',
      value: '23%',
      change: '-5%',
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'content', label: 'Content Moderation', icon: Shield },
    { id: 'system', label: 'System Monitoring', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-red-600 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
                <div className="flex items-center space-x-2">
                  <Badge variant="destructive" className="text-xs">ADMIN</Badge>
                  <p className="text-sm text-gray-500">System Administration Panel</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
                User View
              </Button>
              <Button variant="outline" size="sm" onClick={authService.logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {adminStats.map((stat, index) => (
                <AdminStatsCard key={index} {...stat} />
              ))}
            </div>

            {/* Alerts and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span>System Alerts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800">High storage usage</p>
                    <p className="text-xs text-yellow-600">Storage is 85% full</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">Pending user approvals</p>
                    <p className="text-xs text-blue-600">5 users awaiting verification</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Admin Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>User deleted: suspicious.user@example.com</span>
                      <span className="text-xs text-gray-500">2h ago</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Post moderated: Inappropriate content</span>
                      <span className="text-xs text-gray-500">4h ago</span>
                    </div>
                    <div className="flex justify-between">
                      <span>System backup completed</span>
                      <span className="text-xs text-gray-500">6h ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'users' && <UserManagementTable />}
        {activeTab === 'content' && <ContentModerationPanel />}
        {activeTab === 'system' && <SystemMonitoring />}
        {activeTab === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure system-wide settings and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Settings panel coming soon...</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
