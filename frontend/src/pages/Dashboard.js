import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  Target, 
  BarChart3, 
  Plus,
  Clock,
  TrendingUp
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState({
    subjects: 0,
    todos: { total: 0, completed: 0, pending: 0 },
    goals: { total: 0, completed: 0, pending: 0 },
    progress: { totalHours: 0, thisWeek: 0 }
  });
  const [recentTodos, setRecentTodos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch subjects
      const subjectsResponse = await axios.get('/api/subjects');
      
      // Fetch todos stats
      const todosResponse = await axios.get('/api/todos/stats/overview');
      
      // Fetch goals stats
      const goalsResponse = await axios.get('/api/goals/stats/overview');
      
      // Fetch recent todos
      const recentTodosResponse = await axios.get('/api/todos?limit=5');
      
      // Fetch progress stats
      const progressResponse = await axios.get('/api/progress/analytics/overview');

      setStats({
        subjects: subjectsResponse.data.subjects?.length || 0,
        todos: {
          total: todosResponse.data.stats?.total_todos || 0,
          completed: todosResponse.data.stats?.completed_todos || 0,
          pending: todosResponse.data.stats?.pending_todos || 0
        },
        goals: {
          total: goalsResponse.data.stats?.total_goals || 0,
          completed: goalsResponse.data.stats?.completed_goals || 0,
          pending: goalsResponse.data.stats?.pending_goals || 0
        },
        progress: {
          totalHours: progressResponse.data.overall_stats?.total_hours || 0,
          thisWeek: progressResponse.data.weekly_progress?.[0]?.hours_studied || 0
        }
      });

      setRecentTodos(recentTodosResponse.data.todos || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({ title, description, icon: Icon, href, color }) => (
    <Link to={href} className="block">
      <div className="card hover:shadow-md transition-shadow duration-200">
        <div className="card-body">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${color} mr-4`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back!</h1>
        <p className="text-primary-100">
          Ready to continue your learning journey? Let's make today productive!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Subjects"
          value={stats.subjects}
          icon={BookOpen}
          color="bg-blue-500"
        />
        <StatCard
          title="Tasks Completed"
          value={`${stats.todos.completed}/${stats.todos.total}`}
          icon={CheckSquare}
          color="bg-green-500"
          subtitle={`${stats.todos.total > 0 ? Math.round((stats.todos.completed / stats.todos.total) * 100) : 0}% completion`}
        />
        <StatCard
          title="Goals Achieved"
          value={`${stats.goals.completed}/${stats.goals.total}`}
          icon={Target}
          color="bg-purple-500"
          subtitle={`${stats.goals.total > 0 ? Math.round((stats.goals.completed / stats.goals.total) * 100) : 0}% completion`}
        />
        <StatCard
          title="Study Hours"
          value={`${stats.progress.totalHours}h`}
          icon={Clock}
          color="bg-orange-500"
          subtitle={`${stats.progress.thisWeek}h this week`}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuickActionCard
          title="Add Subject"
          description="Create a new study subject"
          icon={Plus}
          href="/subjects"
          color="bg-blue-500"
        />
        <QuickActionCard
          title="Plan Schedule"
          description="Set up your weekly study plan"
          icon={Calendar}
          href="/planner"
          color="bg-green-500"
        />
        <QuickActionCard
          title="View Progress"
          description="Check your study analytics"
          icon={TrendingUp}
          href="/progress"
          color="bg-purple-500"
        />
      </div>

      {/* Recent Todos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
            <Link to="/todos" className="text-sm text-primary-600 hover:text-primary-500">
              View all
            </Link>
          </div>
          <div className="card-body">
            {recentTodos.length > 0 ? (
              <div className="space-y-3">
                {recentTodos.map((todo) => (
                  <div key={todo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={todo.is_completed}
                        readOnly
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className={`ml-3 text-sm ${todo.is_completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {todo.title}
                      </span>
                    </div>
                    {todo.subject_name && (
                      <span className="text-xs text-gray-500">{todo.subject_name}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent tasks</p>
            )}
          </div>
        </div>

        {/* Study Streak */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Study Streak</h2>
          </div>
          <div className="card-body">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">
                {stats.progress.thisWeek > 0 ? '🔥' : '📚'}
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {stats.progress.thisWeek > 0 ? 'Great week!' : 'Start studying'}
              </p>
              <p className="text-sm text-gray-600">
                {stats.progress.thisWeek > 0 
                  ? `You've studied ${stats.progress.thisWeek} hours this week`
                  : 'Begin your learning journey today'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 