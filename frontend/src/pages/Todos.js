import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, Circle, Edit, Trash2, Calendar, Clock } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Todos = () => {
  const [todos, setTodos] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [filter, setFilter] = useState('all'); // all, completed, pending
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    due_date: '',
    priority: 'medium'
  });

  useEffect(() => {
    fetchTodos();
    fetchSubjects();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/todos');
      setTodos(response.data.todos || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
      toast.error('Failed to load todos');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await axios.get('/api/subjects');
      setSubjects(response.data.subjects || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      if (editingTodo) {
        await axios.put(`/api/todos/${editingTodo.id}`, formData);
        toast.success('Task updated successfully');
      } else {
        await axios.post('/api/todos', formData);
        toast.success('Task created successfully');
      }
      
      setShowModal(false);
      setEditingTodo(null);
      setFormData({ title: '', description: '', subject_id: '', due_date: '', priority: 'medium' });
      fetchTodos();
    } catch (error) {
      console.error('Error saving todo:', error);
      toast.error(error.response?.data?.error || 'Failed to save task');
    }
  };

  const handleToggleComplete = async (todoId, currentStatus) => {
    try {
      await axios.patch(`/api/todos/${todoId}/toggle`);
      toast.success(currentStatus ? 'Task marked as incomplete' : 'Task completed!');
      fetchTodos();
    } catch (error) {
      console.error('Error toggling todo:', error);
      toast.error('Failed to update task status');
    }
  };

  const handleEdit = (todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description || '',
      subject_id: todo.subject_id || '',
      due_date: todo.due_date ? todo.due_date.split('T')[0] : '',
      priority: todo.priority || 'medium'
    });
    setShowModal(true);
  };

  const handleDelete = async (todoId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await axios.delete(`/api/todos/${todoId}`);
      toast.success('Task deleted successfully');
      fetchTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast.error('Failed to delete task');
    }
  };

  const openModal = () => {
    setEditingTodo(null);
    setFormData({ title: '', description: '', subject_id: '', due_date: '', priority: 'medium' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTodo(null);
    setFormData({ title: '', description: '', subject_id: '', due_date: '', priority: 'medium' });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'completed') return todo.is_completed;
    if (filter === 'pending') return !todo.is_completed;
    return true;
  });

  const completedCount = todos.filter(todo => todo.is_completed).length;
  const totalCount = todos.length;

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
          <h1 className="text-2xl font-bold text-[#67FA3E]">Daily Tasks</h1>
          <p className="text-[#67FA3E] opacity-80">Manage your daily study tasks and to-dos</p>
        </div>
        <button
          onClick={openModal}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-[#67FA3E]">{totalCount}</div>
            <div className="text-[#67FA3E] opacity-80">Total Tasks</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-[#67FA3E]">{completedCount}</div>
            <div className="text-[#67FA3E] opacity-80">Completed</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-[#67FA3E]">{totalCount - completedCount}</div>
            <div className="text-[#67FA3E] opacity-80">Pending</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({totalCount})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'pending' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Pending ({totalCount - completedCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'completed' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Todos List */}
      {filteredTodos.length === 0 ? (
        <div className="card bg-[#181818] border border-[#232323]">
          <div className="card-body text-center">
            <CheckCircle className="w-16 h-16 text-[#67FA3E] mx-auto mb-4 opacity-80" />
            <h3 className="text-xl font-semibold text-[#67FA3E] mb-2">
              {filter === 'all' ? 'No tasks yet' : filter === 'completed' ? 'No completed tasks' : 'No pending tasks'}
            </h3>
            <p className="text-[#67FA3E] opacity-80 mb-4">
              {filter === 'all' ? 'Create your first task to start organizing your studies' : 'Great job! Keep up the good work!'}
            </p>
            {filter === 'all' && (
              <button onClick={openModal} className="btn btn-primary">
                Create Your First Task
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTodos.map((todo) => (
            <div key={todo.id} className="card hover:shadow-md transition-shadow duration-200 bg-[#181818] border border-[#232323]">
              <div className="card-body">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleComplete(todo.id, todo.is_completed)}
                    className="mt-1 text-[#67FA3E] hover:scale-110 transition-transform"
                  >
                    {todo.is_completed ? (
                      <CheckCircle className="w-5 h-5 text-[#67FA3E]" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-lg font-medium ${todo.is_completed ? 'line-through text-[#67FA3E] opacity-70' : 'text-[#67FA3E]'}`}> 
                          {todo.title}
                        </h3>
                        {todo.description && (
                          <p className={`text-sm mt-1 ${todo.is_completed ? 'text-[#67FA3E] opacity-60' : 'text-[#67FA3E] opacity-80'}`}>
                            {todo.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-3">
                          {todo.subject_name && (
                            <div className="flex items-center gap-1">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: todo.subject_color }}
                              ></div>
                              <span className="text-sm text-[#67FA3E] opacity-80">{todo.subject_name}</span>
                            </div>
                          )}
                          
                          {todo.due_date && (
                            <div className="flex items-center gap-1 text-sm text-[#67FA3E] opacity-80">
                              <Calendar className="w-4 h-4" />
                              {new Date(todo.due_date).toLocaleDateString()}
                            </div>
                          )}
                          
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(todo.priority)}`}>
                            {todo.priority}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(todo)}
                          className="p-1 text-[#67FA3E] hover:bg-[#232323] rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(todo.id)}
                          className="p-1 text-[#67FA3E] hover:bg-red-600/10 hover:text-red-500 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#181818] border border-[#232323] rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h2 className="text-xl font-semibold text-[#67FA3E] mb-4">
              {editingTodo ? 'Edit Task' : 'Add New Task'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#67FA3E] mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input w-full focus:ring-[#67FA3E] focus:border-[#67FA3E]"
                  placeholder="e.g., Complete math homework"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#67FA3E] mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full focus:ring-[#67FA3E] focus:border-[#67FA3E]"
                  rows="3"
                  placeholder="Optional description of the task"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#67FA3E] mb-1">
                  Subject
                </label>
                <select
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  className="input w-full focus:ring-[#67FA3E] focus:border-[#67FA3E]"
                >
                  <option value="">No subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#67FA3E] mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="input w-full focus:ring-[#67FA3E] focus:border-[#67FA3E]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#67FA3E] mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="input w-full focus:ring-[#67FA3E] focus:border-[#67FA3E]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-secondary flex-1 hover:border-[#67FA3E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  {editingTodo ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Todos; 