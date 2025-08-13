import React from 'react';

const Planner = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Planner</h1>
        <button className="btn-primary">
          Add Time Slot
        </button>
      </div>
      
      <div className="card">
        <div className="card-body">
          <p className="text-gray-600">Weekly study planner with drag-and-drop functionality - Coming soon!</p>
          <p className="text-sm text-gray-500 mt-2">
            This page will feature a visual weekly timetable where you can drag and drop study sessions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Planner; 