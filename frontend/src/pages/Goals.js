import React, { useState, useEffect } from 'react';
import { Target, Plus, Edit2, Trash2, Calendar, Clock, CheckCircle, Circle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, completed

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [goalsRes, subjectsRes] = await Promise.all([
        axios.get('/api/goals'),
        axios.get('/api/subjects')
      ]);
      
      setGoals(goalsRes.data.goals || []);
      setSubjects(subjectsRes.data.subjects || []);
    } catch (error) {
      console.error('Error fetching goals data:', error);
      toast.error('Failed to load goals data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async (goalData) => {
    try {
      const response = await axios.post('/api/goals', goalData);
      setGoals(prev => [...prev, response.data.goal]);
      setShowAddModal(false);
      toast.success('Goal added successfully!');
    } catch (error) {
      toast.error('Failed to add goal');
    }
  };

  const handleUpdateGoal = async (id, goalData) => {
    try {
      const response = await axios.put(`/api/goals/${id}`, goalData);
      setGoals(prev => prev.map(goal => 
        goal.id === id ? response.data.goal : goal
      ));
      setEditingGoal(null);
      toast.success('Goal updated successfully!');
    } catch (error) {
      toast.error('Failed to update goal');
    }
  };

  const handleDeleteGoal = async (id) => {
    try {
      await axios.delete(`/api/goals/${id}`);
      setGoals(prev => prev.filter(goal => goal.id !== id));
      toast.success('Goal deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete goal');
    }
  };

  const handleToggleComplete = async (id, isCompleted) => {
    try {
  const response = await axios.put(`/api/goals/${id}`, { is_completed: !isCompleted });
      setGoals(prev => prev.map(goal => 
        goal.id === id ? response.data.goal : goal
      ));
      toast.success(isCompleted ? 'Goal marked as incomplete' : 'Goal completed!');
    } catch (error) {
      toast.error('Failed to update goal status');
    }
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'No Subject';
  };

  const getSubjectColor = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.color || '#3B82F6';
  };

  const filteredGoals = goals.filter(goal => {
    if (filter === 'active') return !goal.is_completed;
    if (filter === 'completed') return goal.is_completed;
    return true;
  });

  const getProgressPercentage = (goal) => {
    if (goal.target_hours === 0) return 0;
    return Math.min((goal.completed_hours / goal.target_hours) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  return (
  <div className="space-y-8 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#67FA3E]">Study Goals</h1>
          <p className="text-sm text-[#67FA3E] opacity-80">
            Set and track your learning objectives
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Goals */}
        <div className="card hover:shadow-lg transition-all">
          <div className="card-body text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-[#67FA3E]/10 border border-[#67FA3E]/30">
              <Target className="w-6 h-6 text-[#67FA3E]" />
            </div>
            <div className="text-3xl font-semibold tracking-tight text-[#67FA3E]">{goals.length}</div>
            <p className="text-xs uppercase tracking-wider text-[#67FA3E] opacity-75">Total Goals</p>
          </div>
        </div>

        {/* Completed Goals */}
        <div className="card hover:shadow-lg transition-all">
          <div className="card-body text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-[#67FA3E]/10 border border-[#67FA3E]/30">
              <CheckCircle className="w-6 h-6 text-[#67FA3E]" />
            </div>
            <div className="text-3xl font-semibold tracking-tight text-[#67FA3E]">{goals.filter(g => g.is_completed).length}</div>
            <p className="text-xs uppercase tracking-wider text-[#67FA3E] opacity-75">Completed</p>
          </div>
        </div>

        {/* Active Goals */}
        <div className="card hover:shadow-lg transition-all">
          <div className="card-body text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-[#67FA3E]/10 border border-[#67FA3E]/30">
              <Circle className="w-6 h-6 text-[#67FA3E]" />
            </div>
            <div className="text-3xl font-semibold tracking-tight text-[#67FA3E]">{goals.filter(g => !g.is_completed).length}</div>
            <p className="text-xs uppercase tracking-wider text-[#67FA3E] opacity-75">Active</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-2">
        {['all','active','completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[#67FA3E] text-[#121212]'
                : 'text-[#67FA3E] hover:bg-[#232323] hover:text-white'
            }`}
          >
            {f === 'all' ? 'All Goals' : f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {filteredGoals.length === 0 ? (
          <div className="card bg-[#181818] border border-[#232323]">
            <div className="card-body text-center">
              <Target className="w-16 h-16 mx-auto mb-4 text-[#67FA3E] opacity-80" />
              <p className="text-xl font-semibold text-[#67FA3E] mb-2">No goals found</p>
              <p className="text-sm text-[#67FA3E] opacity-80">Create your first study goal to get started!</p>
            </div>
          </div>
        ) : (
          filteredGoals.map((goal) => (
            <div
              key={goal.id}
              className="card bg-[#181818] border border-[#232323] transition-all duration-200 hover:shadow-md"
            >
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <button
                        onClick={() => handleToggleComplete(goal.id, goal.is_completed)}
                        className="flex-shrink-0"
                      >
                        {goal.is_completed ? (
                          <CheckCircle className="w-6 h-6 text-[#67FA3E]" />
                        ) : (
                          <Circle className="w-6 h-6 text-[#67FA3E] opacity-60 hover:opacity-100" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold text-[#67FA3E] ${goal.is_completed ? 'line-through opacity-70' : ''}`}> 
                          {goal.title}
                        </h3>
                        {goal.description && (
                          <p className="text-sm mt-1 text-[#67FA3E] opacity-80">
                            {goal.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 text-sm">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getSubjectColor(goal.subject_id) }}
                        />
                        <span className="text-[#67FA3E] opacity-80">
                          {getSubjectName(goal.subject_id)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-[#67FA3E] opacity-80">
                          {goal.completed_hours}h / {goal.target_hours}h
                        </span>
                      </div>
                      
                      {goal.due_date && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span className="text-[#67FA3E] opacity-80">
                            Due: {new Date(goal.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#67FA3E] opacity-80">Progress</span>
                        <span className="text-[#67FA3E] opacity-80">
                          {Math.round(getProgressPercentage(goal))}%
                        </span>
                      </div>
                      <div className="w-full bg-[#232323] rounded-full h-2">
                        <div
                          className="bg-[#67FA3E] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage(goal)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setEditingGoal(goal)}
                      className="p-2 text-[#67FA3E] hover:bg-[#232323] rounded-md transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-2 text-[#67FA3E] hover:bg-red-600/10 hover:text-red-500 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingGoal) && (
        <AddEditGoalModal
          subjects={subjects}
          goal={editingGoal}
          onSave={editingGoal ? handleUpdateGoal : handleAddGoal}
          onClose={() => {
            setShowAddModal(false);
            setEditingGoal(null);
          }}
        />
      )}
    </div>
  );
};

// Add/Edit Goal Modal Component
const AddEditGoalModal = ({ subjects, goal, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    subject_id: goal?.subject_id || '',
    title: goal?.title || '',
    description: goal?.description || '',
    target_hours: goal?.target_hours || 0,
    due_date: goal?.due_date ? goal.due_date.split('T')[0] : ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (goal) {
      onSave(goal.id, formData);
    } else {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-full max-w-md mx-4 rounded-xl shadow-xl bg-[#181818] border border-[#232323]">
        <div className="p-6 border-b border-[#232323]">
          <h3 className="text-lg font-semibold text-[#67FA3E]">
            {goal ? 'Edit Goal' : 'Add New Goal'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[#67FA3E]">
              Subject
            </label>
            <select
              value={formData.subject_id}
              onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
              className="w-full p-2 border rounded-md bg-[#232323] text-[#67FA3E] border-[#2f2f2f] focus:border-[#67FA3E] focus:ring-1 focus:ring-[#67FA3E]"
              required
            >
              <option value="">Select a subject</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[#67FA3E]">
              Goal Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Complete Chapter 5"
              className="w-full p-2 border rounded-md bg-[#232323] text-[#67FA3E] border-[#2f2f2f] focus:border-[#67FA3E] focus:ring-1 focus:ring-[#67FA3E]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[#67FA3E]">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your goal in detail..."
              rows="3"
              className="w-full p-2 border rounded-md bg-[#232323] text-[#67FA3E] border-[#2f2f2f] focus:border-[#67FA3E] focus:ring-1 focus:ring-[#67FA3E]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[#67FA3E]">
              Target Hours
            </label>
            <input
              type="number"
              value={formData.target_hours}
              onChange={(e) => setFormData({ ...formData, target_hours: parseFloat(e.target.value) })}
              placeholder="0"
              min="0"
              step="0.5"
              className="w-full p-2 border rounded-md bg-[#232323] text-[#67FA3E] border-[#2f2f2f] focus:border-[#67FA3E] focus:ring-1 focus:ring-[#67FA3E]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[#67FA3E]">
              Due Date (Optional)
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full p-2 border rounded-md bg-[#232323] text-[#67FA3E] border-[#2f2f2f] focus:border-[#67FA3E] focus:ring-1 focus:ring-[#67FA3E]"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#2f2f2f] text-[#67FA3E] hover:bg-[#232323] rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#67FA3E] text-[#121212] font-semibold rounded-md hover:bg-[#4fd32a] transition-colors"
            >
              {goal ? 'Update' : 'Add'} Goal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Goals; 