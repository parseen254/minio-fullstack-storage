'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { 
  User, 
  Mail, 
  Lock, 
  Bell, 
  Shield,
  Trash2,
  Save
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface UserSettingsProps {
  user: {
    id: string
    firstName: string
    lastName: string
    username: string
    email: string
    role: string
    avatar?: string
  }
}

export function UserSettings({ user }: UserSettingsProps) {
  const [profile, setProfile] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    avatar: user.avatar || ''
  })

  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    securityAlerts: true
  })

  const [privacy, setPrivacy] = useState({
    profileVisibility: true,
    showEmail: false,
    showActivity: true
  })

  const handleSaveProfile = async () => {
    try {
      // TODO: Implement profile update API call
      toast({
        title: 'Profile updated',
        description: 'Your profile information has been successfully updated.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleChangePassword = async () => {
    if (security.newPassword !== security.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match.',
        variant: 'destructive',
      })
      return
    }

    if (security.newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      })
      return
    }

    try {
      // TODO: Implement password change API call
      setSecurity({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      toast({
        title: 'Password changed',
        description: 'Your password has been successfully updated.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to change password. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteAccount = async () => {
    const confirmation = window.prompt(
      'This action cannot be undone. Type "DELETE" to confirm account deletion:'
    )
    
    if (confirmation === 'DELETE') {
      try {
        // TODO: Implement account deletion API call
        toast({
          title: 'Account deleted',
          description: 'Your account has been successfully deleted.',
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete account. Please try again.',
          variant: 'destructive',
        })
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profile Information</span>
          </CardTitle>
          <CardDescription>
            Update your personal information and profile details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar} alt="Profile picture" />
              <AvatarFallback className="text-lg">
                {profile.firstName[0]}{profile.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm">
                Change Photo
              </Button>
              <Button variant="ghost" size="sm" className="text-red-600">
                Remove Photo
              </Button>
            </div>
          </div>

          {/* Profile Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={profile.firstName}
                onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={profile.lastName}
                onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={profile.username}
                onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>

          <Button onClick={handleSaveProfile}>
            <Save className="h-4 w-4 mr-2" />
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5" />
            <span>Security</span>
          </CardTitle>
          <CardDescription>
            Manage your password and security preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={security.currentPassword}
              onChange={(e) => setSecurity(prev => ({ ...prev, currentPassword: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={security.newPassword}
              onChange={(e) => setSecurity(prev => ({ ...prev, newPassword: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={security.confirmPassword}
              onChange={(e) => setSecurity(prev => ({ ...prev, confirmPassword: e.target.value }))}
            />
          </div>
          <Button onClick={handleChangePassword}>
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
          </CardTitle>
          <CardDescription>
            Configure how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Email Notifications</div>
              <div className="text-sm text-gray-500">Receive notifications via email</div>
            </div>
            <Switch
              checked={notifications.emailNotifications}
              onCheckedChange={(checked) => 
                setNotifications(prev => ({ ...prev, emailNotifications: checked }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Push Notifications</div>
              <div className="text-sm text-gray-500">Receive browser push notifications</div>
            </div>
            <Switch
              checked={notifications.pushNotifications}
              onCheckedChange={(checked) => 
                setNotifications(prev => ({ ...prev, pushNotifications: checked }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Marketing Emails</div>
              <div className="text-sm text-gray-500">Receive product updates and marketing</div>
            </div>
            <Switch
              checked={notifications.marketingEmails}
              onCheckedChange={(checked) => 
                setNotifications(prev => ({ ...prev, marketingEmails: checked }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Security Alerts</div>
              <div className="text-sm text-gray-500">Important security notifications</div>
            </div>
            <Switch
              checked={notifications.securityAlerts}
              onCheckedChange={(checked) => 
                setNotifications(prev => ({ ...prev, securityAlerts: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Privacy</span>
          </CardTitle>
          <CardDescription>
            Control your privacy and data sharing preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Profile Visibility</div>
              <div className="text-sm text-gray-500">Make your profile visible to other users</div>
            </div>
            <Switch
              checked={privacy.profileVisibility}
              onCheckedChange={(checked) => 
                setPrivacy(prev => ({ ...prev, profileVisibility: checked }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Show Email</div>
              <div className="text-sm text-gray-500">Display email address on profile</div>
            </div>
            <Switch
              checked={privacy.showEmail}
              onCheckedChange={(checked) => 
                setPrivacy(prev => ({ ...prev, showEmail: checked }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Show Activity</div>
              <div className="text-sm text-gray-500">Display recent activity to others</div>
            </div>
            <Switch
              checked={privacy.showActivity}
              onCheckedChange={(checked) => 
                setPrivacy(prev => ({ ...prev, showActivity: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            <span>Danger Zone</span>
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <div className="font-medium text-red-600">Delete Account</div>
              <div className="text-sm text-gray-500">
                Permanently delete your account and all associated data
              </div>
            </div>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
