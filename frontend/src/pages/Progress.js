import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Calendar, Clock, Target, BookOpen } from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Progress = () => {
  const { isDarkMode } = useTheme();
  const [progressData, setProgressData] = useState({
    weeklyProgress: [],
    subjectProgress: [],
    overallStats: {},
    recentActivity: []
  });
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week'); // week, month, year

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [progressRes, subjectsRes] = await Promise.all([
        axios.get('/api/progress/analytics/overview'),
        axios.get('/api/subjects')
      ]);

      const overview = progressRes.data || {};
      const subjectsList = subjectsRes.data.subjects || [];

      const totalHours = overview.overall_stats?.total_hours || 0;
      const totalDays = overview.overall_stats?.total_days_studied || 0;

      const mapped = {
        overallStats: {
          total_hours: totalHours,
            days_studied: totalDays,
            subjects_studied: subjectsList.length,
            avg_hours_per_day: totalDays ? parseFloat((totalHours / totalDays).toFixed(1)) : 0
        },
        weeklyProgress: (overview.weekly_progress || []).map(w => ({
          week: w.week,
          hours_studied: w.hours_studied,
          days_studied: w.days_studied
        })),
        subjectProgress: (overview.progress_by_subject || []).map(s => ({
          // backend doesn't return subject id; keep name/color
          subject_id: null,
          subject_name: s.subject_name,
          subject_color: s.subject_color,
          total_hours: s.total_hours,
          total_sessions: s.total_sessions,
          avg_hours_per_session: s.avg_hours_per_session
        })),
        recentActivity: (overview.recent_progress || []).map(r => ({
          id: r.id,
          subject_id: r.subject_id || null,
          subject_name: r.subject_name,
          subject_color: r.subject_color,
          date: r.date,
          hours_studied: r.hours_studied,
          notes: r.notes
        }))
      };

      setProgressData(mapped);
      setSubjects(subjectsList);
    } catch (error) {
      console.error('Error fetching progress data:', error);
      toast.error('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Unknown Subject';
  };

  const getSubjectColor = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.color || '#3B82F6';
  };

  // Chart configurations
  const weeklyChartData = {
    labels: progressData.weeklyProgress?.map(item => item.week) || [],
    datasets: [
      {
        label: 'Study Hours',
        data: progressData.weeklyProgress?.map(item => item.hours_studied) || [],
        borderColor: isDarkMode ? '#60A5FA' : '#3B82F6',
        backgroundColor: isDarkMode ? 'rgba(96, 165, 250, 0.1)' : 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const subjectChartData = {
    labels: progressData.subjectProgress?.map(item => item.subject_id ? getSubjectName(item.subject_id) : item.subject_name) || [],
    datasets: [
      {
        label: 'Study Hours',
        data: progressData.subjectProgress?.map(item => item.total_hours) || [],
        backgroundColor: progressData.subjectProgress?.map(item => item.subject_id ? getSubjectColor(item.subject_id) : item.subject_color) || [],
        borderWidth: 1,
      },
    ],
  };

  const subjectDistributionData = {
    labels: progressData.subjectProgress?.map(item => item.subject_id ? getSubjectName(item.subject_id) : item.subject_name) || [],
    datasets: [
      {
        data: progressData.subjectProgress?.map(item => item.total_hours) || [],
        backgroundColor: progressData.subjectProgress?.map(item => item.subject_id ? getSubjectColor(item.subject_id) : item.subject_color) || [],
        borderWidth: 2,
        borderColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: isDarkMode ? '#D1D5DB' : '#374151',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDarkMode ? '#D1D5DB' : '#374151',
        },
        grid: {
          color: isDarkMode ? '#374151' : '#E5E7EB',
        },
      },
      y: {
        ticks: {
          color: isDarkMode ? '#D1D5DB' : '#374151',
        },
        grid: {
          color: isDarkMode ? '#374151' : '#E5E7EB',
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
  <div className="space-y-8 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#67FA3E]">Study Progress</h1>
          <p className="text-sm text-[#67FA3E] opacity-80">
            Track your learning journey and analyze your study patterns
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeRange === 'week'
                ? 'bg-[#67FA3E] text-[#121212]'
                : 'text-[#67FA3E] hover:bg-[#232323] hover:text-white'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeRange === 'month'
                ? 'bg-[#67FA3E] text-[#121212]'
                : 'text-[#67FA3E] hover:bg-[#232323] hover:text-white'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeRange === 'year'
                ? 'bg-[#67FA3E] text-[#121212]'
                : 'text-[#67FA3E] hover:bg-[#232323] hover:text-white'
            }`}
          >
            Year
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
  <div className="card bg-[#181818] border border-[#232323]">
          <div className="card-body text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-[#67FA3E]" />
            <h3 className="text-2xl font-bold text-[#67FA3E]">
              {progressData.overallStats?.total_hours || 0}h
            </h3>
            <p className="text-sm text-[#67FA3E] opacity-80">Total Study Time</p>
          </div>
        </div>
        
  <div className="card bg-[#181818] border border-[#232323]">
          <div className="card-body text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-[#67FA3E]" />
            <h3 className="text-2xl font-bold text-[#67FA3E]">
              {progressData.overallStats?.days_studied || 0}
            </h3>
            <p className="text-sm text-[#67FA3E] opacity-80">Days Studied</p>
          </div>
        </div>
        
  <div className="card bg-[#181818] border border-[#232323]">
          <div className="card-body text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-[#67FA3E]" />
            <h3 className="text-2xl font-bold text-[#67FA3E]">
              {progressData.overallStats?.subjects_studied || 0}
            </h3>
            <p className="text-sm text-[#67FA3E] opacity-80">Subjects</p>
          </div>
        </div>
        
  <div className="card bg-[#181818] border border-[#232323]">
          <div className="card-body text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-[#67FA3E]" />
            <h3 className="text-2xl font-bold text-[#67FA3E]">
              {progressData.overallStats?.avg_hours_per_day || 0}h
            </h3>
            <p className="text-sm text-[#67FA3E] opacity-80">Daily Average</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Progress Chart */}
        <div className="card bg-[#181818] border border-[#232323]">
          <div className="card-header border-[#232323]">
            <h2 className="text-lg font-semibold text-[#67FA3E]">Weekly Progress</h2>
          </div>
          <div className="card-body">
            {progressData.weeklyProgress?.length > 0 ? (
              <Line data={weeklyChartData} options={chartOptions} />
            ) : (
              <div className="text-center py-8 text-[#67FA3E] opacity-80">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-80" />
                <p>No progress data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Subject Progress Chart */}
        <div className="card bg-[#181818] border border-[#232323]">
          <div className="card-header border-[#232323]">
            <h2 className="text-lg font-semibold text-[#67FA3E]">Subject Progress</h2>
          </div>
          <div className="card-body">
            {progressData.subjectProgress?.length > 0 ? (
              <Bar data={subjectChartData} options={chartOptions} />
            ) : (
              <div className="text-center py-8 text-[#67FA3E] opacity-80">
                <img src="/logo.png" alt="Logo" className="w-16 h-16 mx-auto mb-4 opacity-80" />
                <p>No subject data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subject Distribution */}
      <div className="card bg-[#181818] border border-[#232323]">
        <div className="card-header border-[#232323]">
          <h2 className="text-lg font-semibold text-[#67FA3E]">Study Time Distribution</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {progressData.subjectProgress?.length > 0 ? (
                <Doughnut data={subjectDistributionData} options={chartOptions} />
              ) : (
                <div className="text-center py-8 text-[#67FA3E] opacity-80">
                  <Target className="w-16 h-16 mx-auto mb-4 opacity-80" />
                  <p>No distribution data available</p>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-[#67FA3E]">Subject Breakdown</h3>
              {progressData.subjectProgress?.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-[#232323]">
                  <div className="flex items-center space-x-3">
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: item.subject_id ? getSubjectColor(item.subject_id) : item.subject_color }} />
                    <span className="font-medium text-[#67FA3E]">{item.subject_id ? getSubjectName(item.subject_id) : item.subject_name}</span>
                  </div>
                  <span className="font-semibold text-[#67FA3E]">{item.total_hours}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card bg-[#181818] border border-[#232323]">
        <div className="card-header border-[#232323]">
          <h2 className="text-lg font-semibold text-[#67FA3E]">Recent Study Activity</h2>
        </div>
        <div className="card-body">
          {progressData.recentActivity?.length > 0 ? (
            <div className="space-y-3">
              {progressData.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-[#232323]">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getSubjectColor(activity.subject_id) }}
                    />
                    <div>
                      <p className="font-medium text-[#67FA3E]">{activity.subject_id ? getSubjectName(activity.subject_id) : activity.subject_name}</p>
                      <p className="text-sm text-[#67FA3E] opacity-70">{new Date(activity.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#67FA3E]">{activity.hours_studied}h</p>
                    {activity.notes && (<p className="text-xs text-[#67FA3E] opacity-60">{activity.notes}</p>)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#67FA3E] opacity-80">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-80" />
              <p>No recent activity</p>
              <p className="text-sm">Start studying to see your progress here!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Progress; 