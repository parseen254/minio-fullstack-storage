'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Users, Upload, BarChart3 } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken')
    setIsAuthenticated(!!token)
  }, [])

  const features = [
    {
      icon: <Upload className="h-8 w-8" />,
      title: "File Storage",
      description: "Secure and scalable file storage with MinIO"
    },
    {
      icon: <FileText className="h-8 w-8" />,
      title: "Content Management",
      description: "Create and manage posts with rich content"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "User Management",
      description: "Role-based access control and user administration"
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Analytics",
      description: "Real-time monitoring and performance metrics"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">MinIO Storage</span>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Button onClick={() => router.push('/dashboard')}>
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/auth/login">Login</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/auth/register">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Scalable Storage
            <br />
            <span className="text-primary">Built on MinIO</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A modern, high-performance storage system that replaces traditional databases 
            with MinIO object storage for unprecedented scalability and reliability.
          </p>
          <div className="flex justify-center space-x-4">
            <Button size="lg" asChild>
              <Link href="/auth/register">Start Building</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/docs">Learn More</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-20 bg-white rounded-2xl p-8 shadow-sm border">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-gray-600">Uptime Guarantee</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">∞</div>
              <div className="text-gray-600">Horizontal Scaling</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">&lt;100ms</div>
              <div className="text-gray-600">Average Response Time</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
