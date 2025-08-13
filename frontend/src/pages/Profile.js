import React from 'react';

const Profile = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
      </div>
      
      <div className="card">
        <div className="card-body">
          <p className="text-gray-600">User profile and settings management - Coming soon!</p>
          <p className="text-sm text-gray-500 mt-2">
            This page will allow you to manage your profile, change password, and configure email reminders.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile; 