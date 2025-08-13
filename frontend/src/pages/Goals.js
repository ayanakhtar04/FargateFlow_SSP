import React from 'react';

const Goals = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Study Goals</h1>
        <button className="btn-primary">
          Add Goal
        </button>
      </div>
      
      <div className="card">
        <div className="card-body">
          <p className="text-gray-600">Goal management and progress tracking - Coming soon!</p>
          <p className="text-sm text-gray-500 mt-2">
            This page will allow you to set and track study goals for each subject.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Goals; 