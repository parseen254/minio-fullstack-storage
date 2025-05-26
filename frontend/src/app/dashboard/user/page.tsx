'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { authService } from '@/services/auth'
import { useUserPosts } from '@/hooks/use-posts'
import { useUserFiles } from '@/hooks/use-files'
import { UserProfileCard } from '@/components/user/user-profile-card'
import { UserFileManager } from '@/components/user/user-file-manager'
import { UserPostManager } from '@/components/user/user-post-manager'
import { UserSettings } from '@/components/user/user-settings'
import { 
  User, 
  FileText, 
  Upload, 
  Settings, 
  PlusCircle,
  Download,
  Eye,
  Edit
} from 'lucide-react'

export default function UserDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/auth/login')
      return
    }

    const currentUser = authService.getCurrentUser()
    setUser(currentUser)
  }, [router])

  const { data: userPosts } = useUserPosts({ userId: user?.id })
  const { data: userFiles } = useUserFiles({ userId: user?.id })

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const userStats = [
    {
      title: 'My Posts',
      value: userPosts?.pagination?.total || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      action: () => setActiveTab('posts')
    },
    {
      title: 'My Files',
      value: userFiles?.pagination?.total || 0,
      icon: Upload,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      action: () => setActiveTab('files')
    },
    {
      title: 'Storage Used',
      value: '2.4 GB',
      icon: Download,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Profile Views',
      value: '156',
      icon: Eye,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  const quickActions = [
    {
      title: 'Create New Post',
      description: 'Write and publish a new blog post',
      icon: PlusCircle,
      action: () => router.push('/dashboard/posts/create'),
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      title: 'Upload Files',
      description: 'Upload files to your storage',
      icon: Upload,
      action: () => setActiveTab('files'),
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      title: 'Edit Profile',
      description: 'Update your profile information',
      icon: Edit,
      action: () => setActiveTab('settings'),
      color: 'bg-purple-600 hover:bg-purple-700'
    }
  ]

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'posts', label: 'My Posts', icon: FileText },
    { id: 'files', label: 'My Files', icon: Upload },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">My Dashboard</h1>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">{user.role.toUpperCase()}</Badge>
                  <p className="text-sm text-gray-500">Welcome back, {user.firstName}!</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {user.role === 'admin' && (
                <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/admin')}>
                  Admin Panel
                </Button>
              )}
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
                    ? 'border-primary text-primary'
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
              {userStats.map((stat, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={stat.action}>
                  <CardContent className="flex items-center p-6">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      className={`p-4 rounded-lg text-left text-white transition-colors ${action.color}`}
                    >
                      <action.icon className="h-8 w-8 mb-2" />
                      <h3 className="font-medium mb-1">{action.title}</h3>
                      <p className="text-sm opacity-90">{action.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Profile Overview */}
            <UserProfileCard user={user} />

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest actions and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userPosts?.data?.slice(0, 3).map((post) => (
                    <div key={post.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Post: {post.title}</p>
                        <p className="text-xs text-gray-500">
                          {post.status} • {new Date(post.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                        {post.status}
                      </Badge>
                    </div>
                  ))}
                  
                  {userFiles?.data?.slice(0, 2).map((file) => (
                    <div key={file.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Upload className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">File: {file.originalName}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'posts' && <UserPostManager user={user} />}
        {activeTab === 'files' && <UserFileManager user={user} />}
        {activeTab === 'settings' && <UserSettings user={user} />}
      </main>
    </div>
  )
}
