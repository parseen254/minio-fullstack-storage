'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Edit,
  Shield
} from 'lucide-react'

interface UserProfileCardProps {
  user: {
    id: string
    firstName: string
    lastName: string
    username: string
    email: string
    role: string
    avatar?: string
    createdAt: string
  }
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Profile Information</span>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </CardTitle>
        <CardDescription>Your account details and preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start space-x-6">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
              <AvatarFallback className="text-lg">
                {user.firstName[0]}{user.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" className="mt-2 w-full">
              Change Photo
            </Button>
          </div>

          {/* Profile Details */}
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{user.firstName} {user.lastName}</h3>
              <p className="text-gray-600">@{user.username}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{user.email}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Shield className="h-4 w-4 text-gray-400" />
                <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                  {user.role}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>Member since {memberSince}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span>ID: {user.id.slice(0, 8)}...</span>
              </div>
            </div>

            {/* Account Status */}
            <div className="flex items-center space-x-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Account Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Email Verified</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
