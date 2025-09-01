import React, { useState, useEffect } from 'react';
import { User, Edit2, Lock, Trash2, Eye, EyeOff, Upload, X, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Profile = () => {
  const { user, updateProfile, changePassword, deleteAccount, uploadProfileImage, removeProfileImage, logout } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [deleteData, setDeleteData] = useState({
    password: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await updateProfile(profileData);
      if (result.success) {
        setEditingProfile(false);
      }
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    
    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (result.success) {
        setEditingPassword(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Password change error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountDeletion = async (e) => {
    e.preventDefault();
    
    if (!deleteData.password) {
      toast.error('Please enter your password to confirm deletion');
      return;
    }

    setLoading(true);
    
    try {
      const result = await deleteAccount(deleteData.password);
      if (result.success) {
        // Account deletion will automatically log out the user
        toast.success('Account deleted successfully');
      }
    } catch (error) {
      console.error('Account deletion error:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
  <div className="space-y-8 pt-8">
      {/* Header */}
      <div>
  <h1 className="text-2xl font-bold text-[#67FA3E]">Profile Settings</h1>
  <p className="text-sm text-[#67FA3E] opacity-80">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Information */}
  <div className="card bg-[#181818] border border-[#232323]">
        <div className="card-header">
      <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Profile Picture */}
              <div className="relative w-24 h-24 mb-4 group">
                <div className="w-24 h-24 rounded-full bg-[#232323] border-4 border-[#67FA3E] overflow-hidden flex items-center justify-center">
                  {user.profile_image ? (
                    <img
                      src={`/${user.profile_image}`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-[#67FA3E]" />
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <label className="cursor-pointer flex items-center space-x-1 text-xs text-[#67FA3E] bg-[#181818] px-2 py-1 rounded-full border border-[#232323] hover:border-[#67FA3E]">
                    <Upload className="w-3 h-3" />
                    <span>Change</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            toast.error('Image must be under 2MB');
                            return;
                          }
                          await uploadProfileImage(file);
                        }
                      }}
                    />
                  </label>
                </div>
                {user.profile_image && (
                  <button
                    type="button"
                    onClick={removeProfileImage}
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs text-red-400 hover:text-red-300 bg-[#181818] px-2 py-0.5 rounded-full border border-red-500/40 flex items-center space-x-1"
                  >
                    <X className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
              <h2 className="text-lg font-semibold text-[#67FA3E]">Profile Information</h2>
            </div>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className={`p-2 rounded-md transition-colors ${
                  isDarkMode
                    ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                }`}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
      </div>
      
        <div className="card-body">
          {editingProfile ? (
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#67FA3E]">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className={`w-full p-3 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-[#67FA3E]">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className={`w-full p-3 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  required
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProfile(false);
                    setProfileData({
                      name: user.name || '',
                      email: user.email || ''
                    });
                  }}
                  className={`flex-1 px-4 py-2 border rounded-md ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#67FA3E]">
                  Full Name
                </label>
                <p className="text-lg text-[#67FA3E]">{user.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#67FA3E]">
                  Email Address
                </label>
                <p className="text-lg text-[#67FA3E]">{user.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#67FA3E]">
                  Member Since
                </label>
                <p className="text-lg text-[#67FA3E]">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
  <div className="card bg-[#181818] border border-[#232323]">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Lock className="w-6 h-6 text-[#67FA3E]" />
              <h2 className="text-lg font-semibold text-[#67FA3E]">Change Password</h2>
            </div>
            {!editingPassword && (
              <button
                onClick={() => setEditingPassword(true)}
                className={`p-2 rounded-md transition-colors ${
                  isDarkMode
                    ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                }`}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="card-body">
          {editingPassword ? (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#67FA3E]">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className={`w-full p-3 pr-10 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-[#67FA3E]">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className={`w-full p-3 pr-10 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-[#67FA3E]">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className={`w-full p-3 pr-10 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPassword(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  className={`flex-1 px-4 py-2 border rounded-md ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-[#67FA3E] opacity-80">
              Click the edit button to change your password.
            </p>
          )}
        </div>
      </div>

  {/* Account Deletion */}
  <div className="card bg-[#181818] border border-red-700/40">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Trash2 className="w-6 h-6 text-red-500" />
              <h2 className="text-lg font-semibold text-[#67FA3E]">Delete Account</h2>
            </div>
            {!showDeleteConfirm && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Delete Account
              </button>
            )}
          </div>
        </div>
        
        <div className="card-body">
          {showDeleteConfirm ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-md ${isDarkMode ? 'bg-red-900/20 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
                <h3 className="text-lg font-medium text-red-400">
                  Warning: This action cannot be undone
                </h3>
                <p className="mt-2 text-sm text-red-400">
                  Deleting your account will permanently remove all your data, including subjects, goals, progress, and study history.
                </p>
              </div>
              
              <form onSubmit={handleAccountDeletion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#67FA3E]">
                    Enter your password to confirm
                  </label>
                  <input
                    type="password"
                    value={deleteData.password}
                    onChange={(e) => setDeleteData({ ...deleteData, password: e.target.value })}
                    className={`w-full p-3 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteData({ password: '' });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? 'Deleting...' : 'Permanently Delete Account'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <p className="text-[#67FA3E] opacity-80">
              Once you delete your account, there is no going back. Please be certain.
            </p>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className="card bg-[#181818] border border-[#232323]">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <LogOut className="w-6 h-6 text-[#67FA3E]" />
            <h2 className="text-lg font-semibold text-[#67FA3E]">Logout</h2>
          </div>
        </div>
        <div className="card-body">
          <p className="text-sm text-[#67FA3E] opacity-80 mb-4">
            Log out of your account. You can log back in anytime with your credentials.
          </p>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="px-5 py-2 rounded-md bg-[#67FA3E] text-[#121212] font-medium hover:brightness-110 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile; 