'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Activity,
  Wifi,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

export function SystemMonitoring() {
  const [systemStats, setSystemStats] = useState({
    uptime: '15 days, 4 hours',
    cpuUsage: 23,
    memoryUsage: 67,
    diskUsage: 45,
    networkIn: '1.2 MB/s',
    networkOut: '0.8 MB/s'
  })

  const services = [
    {
      name: 'MinIO Storage',
      status: 'healthy',
      uptime: '99.9%',
      lastCheck: '30s ago',
      icon: Database
    },
    {
      name: 'Redis Cache',
      status: 'healthy',
      uptime: '99.8%',
      lastCheck: '15s ago',
      icon: Server
    },
    {
      name: 'NATS Messaging',
      status: 'healthy',
      uptime: '99.9%',
      lastCheck: '45s ago',
      icon: Wifi
    },
    {
      name: 'API Gateway',
      status: 'healthy',
      uptime: '99.7%',
      lastCheck: '10s ago',
      icon: Server
    }
  ]

  const metrics = [
    {
      title: 'CPU Usage',
      value: systemStats.cpuUsage,
      max: 100,
      unit: '%',
      color: systemStats.cpuUsage > 80 ? 'bg-red-500' : systemStats.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500',
      icon: Cpu
    },
    {
      title: 'Memory Usage',
      value: systemStats.memoryUsage,
      max: 100,
      unit: '%',
      color: systemStats.memoryUsage > 80 ? 'bg-red-500' : systemStats.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500',
      icon: Activity
    },
    {
      title: 'Disk Usage',
      value: systemStats.diskUsage,
      max: 100,
      unit: '%',
      color: systemStats.diskUsage > 80 ? 'bg-red-500' : systemStats.diskUsage > 60 ? 'bg-yellow-500' : 'bg-green-500',
      icon: HardDrive
    }
  ]

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStats(prev => ({
        ...prev,
        cpuUsage: Math.max(10, Math.min(90, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(20, Math.min(85, prev.memoryUsage + (Math.random() - 0.5) * 5)),
        diskUsage: Math.max(30, Math.min(70, prev.diskUsage + (Math.random() - 0.5) * 2))
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>System Overview</span>
          </CardTitle>
          <CardDescription>Real-time system performance and health metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{systemStats.uptime}</div>
              <div className="text-sm text-gray-500">System Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{systemStats.networkIn}</div>
              <div className="text-sm text-gray-500">Network In</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{systemStats.networkOut}</div>
              <div className="text-sm text-gray-500">Network Out</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Current system resource utilization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {metrics.map((metric, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <metric.icon className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">{metric.title}</span>
                  </div>
                  <span className="text-sm font-bold">{metric.value}{metric.unit}</span>
                </div>
                <Progress value={metric.value} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0{metric.unit}</span>
                  <span>{metric.max}{metric.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>Health check status for all system services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <service.icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-gray-500">Uptime: {service.uptime}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    {service.status === 'healthy' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <Badge variant={service.status === 'healthy' ? 'default' : 'destructive'}>
                      {service.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{service.lastCheck}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Logs</CardTitle>
          <CardDescription>Latest system events and error logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-green-800">System backup completed successfully</div>
                <div className="text-xs text-green-600">2024-12-21 10:30:00 UTC</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Server className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-800">MinIO service restarted</div>
                <div className="text-xs text-blue-600">2024-12-21 09:45:00 UTC</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-yellow-800">High memory usage detected</div>
                <div className="text-xs text-yellow-600">2024-12-21 08:15:00 UTC</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <Activity className="h-5 w-5 text-gray-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">Scheduled maintenance completed</div>
                <div className="text-xs text-gray-600">2024-12-21 06:00:00 UTC</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
