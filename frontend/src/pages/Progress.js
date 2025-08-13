import React from 'react';

const Progress = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Progress Analytics</h1>
        <button className="btn-primary">
          Log Progress
        </button>
      </div>
      
      <div className="card">
        <div className="card-body">
          <p className="text-gray-600">Progress charts and analytics - Coming soon!</p>
          <p className="text-sm text-gray-500 mt-2">
            This page will show detailed progress charts and analytics for your study sessions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Progress; 