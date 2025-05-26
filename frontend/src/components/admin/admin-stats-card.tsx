'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface AdminStatsCardProps {
  title: string
  value: string | number
  change: string
  icon: React.ComponentType<any>
  color: string
  bgColor: string
}

export function AdminStatsCard({ title, value, change, icon: Icon, color, bgColor }: AdminStatsCardProps) {
  const isPositive = change.startsWith('+')
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${bgColor}`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`flex items-center space-x-1 ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{change}</span>
            </div>
            <p className="text-xs text-gray-500">vs last month</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
