'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authService, User } from '@/services/auth'
import { FileText, Users, Upload, BarChart3, LogOut, Settings } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/auth/login')
      return
    }

    const currentUser = authService.getCurrentUser()
    setUser(currentUser)
    
    // Route based on user role
    if (currentUser) {
      if (currentUser.role === 'admin') {
        router.push('/dashboard/admin')
      } else {
        router.push('/dashboard/user')
      }
    }
    
    setIsLoading(false)
  }, [router])

  const handleLogout = () => {
    authService.logout()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const stats = [
    { title: 'Total Files', value: '1,234', icon: FileText, color: 'text-blue-600' },
    { title: 'Storage Used', value: '45.2 GB', icon: Upload, color: 'text-green-600' },
    { title: 'Active Users', value: '89', icon: Users, color: 'text-purple-600' },
    { title: 'API Calls', value: '23.4K', icon: BarChart3, color: 'text-orange-600' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">MinIO Storage Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back, {user.firstName}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="flex items-center p-6">
                <div className={`p-2 rounded-lg bg-gray-100 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Create Post
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Current system health and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">MinIO Service</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Healthy</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Redis Cache</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">NATS Messaging</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API Response Time</span>
                  <span className="text-sm font-medium">45ms</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions in your system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Upload className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">File uploaded: document.pdf</p>
                  <p className="text-xs text-gray-500">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">New post created: "System Architecture"</p>
                  <p className="text-xs text-gray-500">15 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">New user registered: jane.smith</p>
                  <p className="text-xs text-gray-500">1 hour ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
