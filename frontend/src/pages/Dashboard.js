import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus,
  MoreHorizontal
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState({
    subjects: 0,
    todos: { total: 0, completed: 0, pending: 0 },
    goals: { total: 0, completed: 0, pending: 0 },
    progress: { totalHours: 0, thisWeek: 0 },
    subjectBreakdown: [] // { subject_name, subject_color, total_hours }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const endpoints = {
      subjects: '/api/subjects',
      todos: '/api/todos/stats/overview',
      goals: '/api/goals/stats/overview',
      progress: '/api/progress/analytics/overview'
    };

    const results = await Promise.allSettled([
      axios.get(endpoints.subjects),
      axios.get(endpoints.todos),
      axios.get(endpoints.goals),
      axios.get(endpoints.progress)
    ]);

    const [subjectsRes, todosRes, goalsRes, progressRes] = results;

    const nextStats = { ...stats }; // start from previous to avoid flicker

    if (subjectsRes.status === 'fulfilled') {
      nextStats.subjects = subjectsRes.value.data.subjects?.length || 0;
    } else {
      console.warn('Subjects load failed:', subjectsRes.reason?.message);
    }

    if (todosRes.status === 'fulfilled') {
      nextStats.todos = {
        total: todosRes.value.data.stats?.total_todos || 0,
        completed: todosRes.value.data.stats?.completed_todos || 0,
        pending: todosRes.value.data.stats?.pending_todos || 0
      };
    } else {
      console.warn('Todos stats load failed:', todosRes.reason?.message);
    }

    if (goalsRes.status === 'fulfilled') {
      nextStats.goals = {
        total: goalsRes.value.data.stats?.total_goals || 0,
        completed: goalsRes.value.data.stats?.completed_goals || 0,
        pending: goalsRes.value.data.stats?.pending_goals || 0
      };
    } else {
      console.warn('Goals stats load failed:', goalsRes.reason?.message);
    }

    if (progressRes.status === 'fulfilled') {
      const pdata = progressRes.value.data;
      nextStats.progress = {
        totalHours: pdata.overall_stats?.total_hours || 0,
        thisWeek: pdata.weekly_progress?.[0]?.hours_studied || 0
      };
      nextStats.subjectBreakdown = pdata.progress_by_subject || [];
    } else {
      console.warn('Progress overview load failed:', progressRes.reason?.message);
    }

    setStats(nextStats);

    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed === results.length) {
      toast.error('Failed to load dashboard data');
    } else if (failed > 0) {
      toast.error('Some dashboard data failed to load');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      {/* Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Borrowers by State Widget */}
  <div className="bg-[#181818] rounded-lg shadow-sm border border-[#232323] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#67FA3E]">Study Progress by Subject</h2>
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md">
                <Calendar className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* Circular Progress Chart */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-8 border-gray-600 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#67FA3E]">{stats.progress.totalHours}h</div>
                  <div className="text-sm text-[#67FA3E] opacity-80">Total Hours</div>
                </div>
              </div>
              {/* Progress Arc */}
              <div className="absolute inset-0 w-32 h-32 rounded-full border-8 border-transparent border-t-green-500 border-r-orange-500 border-b-red-500 transform -rotate-90"></div>
            </div>
            
            {/* Data List */}
            <div className="flex-1 space-y-3">
              {stats.subjectBreakdown.length === 0 && (
                <p className="text-sm text-[#67FA3E] opacity-70">No subjects yet</p>
              )}
              {stats.subjectBreakdown.slice(0,6).map((s) => (
                <div key={s.subject_name} className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.subject_color || '#67FA3E' }}></div>
                  <span className="text-sm text-[#67FA3E] opacity-80">
                    {s.subject_name}: {s.total_hours}h
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map Preview Widget */}
        <div className="bg-[#181818] rounded-lg shadow-sm border border-[#232323] p-6 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#67FA3E]">Study Distribution</h2>
          </div>
          <div className="h-40 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#67FA3E] tracking-tight">{stats.progress.thisWeek}h</div>
              <div className="mt-2 text-sm uppercase tracking-wider text-[#67FA3E] opacity-80">This Week</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Details Widget */}
  <div className="bg-[#181818] rounded-lg shadow-sm border border-[#232323] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#67FA3E]">Study Flow</h2>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#67FA3E]">{stats.todos.total}</div>
              <div className="text-sm text-[#67FA3E] opacity-80">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#67FA3E]">{Math.round((stats.todos.completed / Math.max(stats.todos.total, 1)) * 100)}%</div>
              <div className="text-sm text-[#67FA3E] opacity-80">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#67FA3E]">{Math.round((stats.goals.completed / Math.max(stats.goals.total, 1)) * 100)}%</div>
              <div className="text-sm text-[#67FA3E] opacity-80">Goals Met</div>
            </div>
          </div>
          
          {/* Flow Chart */}
          <div className="relative">
            <div className="w-full h-8 bg-gradient-to-r from-green-500 via-orange-500 to-red-500 rounded-full relative">
              {/* Flow Markers */}
              <div className="absolute left-[8%] top-0 w-px h-8 bg-white opacity-50"></div>
                             <div className="absolute left-[8%] -top-6 text-xs text-[#67FA3E] opacity-80">8%</div>
               <div className="absolute left-[8%] top-10 text-xs text-gray-300">4%</div>
               
               <div className="absolute left-[32%] top-0 w-px h-8 bg-white opacity-50"></div>
               <div className="absolute left-[32%] -top-6 text-xs text-[#67FA3E] opacity-80">32%</div>
               <div className="absolute left-[32%] top-10 text-xs text-gray-300">21%</div>
               
               <div className="absolute left-[60%] top-0 w-px h-8 bg-white opacity-50"></div>
               <div className="absolute left-[60%] -top-6 text-xs text-[#67FA3E] opacity-80">60%</div>
               <div className="absolute left-[60%] top-10 text-xs text-gray-300">12%</div>
            </div>
            
            {/* Highlighted Point */}
            <div className="absolute left-[32%] -top-8 bg-[#181818] border border-[#232323] text-[#67FA3E] px-2 py-1 rounded-full text-xs shadow">
              32%
            </div>
          </div>
        </div>

        {/* New Request Trend Widget */}
  <div className="bg-[#181818] rounded-lg shadow-sm border border-[#232323] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#67FA3E]">Study Trend</h2>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          
          {/* Line Chart Representation */}
          <div className="relative h-32">
            {/* Y-axis */}
            <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-[#67FA3E] opacity-80">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>
            
            {/* Chart Lines */}
            <div className="absolute left-8 right-0 top-0 bottom-0">
              {/* Development Line (Orange) */}
              <div className="absolute top-4 left-0 right-0 h-px bg-orange-500"></div>
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-[#181818] border border-[#232323] text-[#67FA3E] px-2 py-1 rounded-full text-xs shadow">
                37 +1.2%
              </div>
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-px h-8 bg-[#67FA3E] opacity-40"></div>
              
              {/* Investment Line (Medium Grey) */}
              <div className="absolute top-12 left-0 right-0 h-px bg-gray-500"></div>
              
              {/* Build and Hold Line (Light Grey) */}
              <div className="absolute top-20 left-0 right-0 h-px bg-gray-300"></div>
            </div>
            
            {/* Legend */}
                         <div className="absolute bottom-0 left-8 right-0 flex items-center space-x-4 text-xs">
               <div className="flex items-center space-x-2">
                 <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                 <span className="text-[#67FA3E] opacity-80">Mathematics</span>
               </div>
               <div className="flex items-center space-x-2">
                 <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                 <span className="text-[#67FA3E] opacity-80">Physics</span>
               </div>
               <div className="flex items-center space-x-2">
                 <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                 <span className="text-[#67FA3E] opacity-80">Chemistry</span>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 