import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/subjects');
      setSubjects(response.data.subjects || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Subject name is required');
      return;
    }

    try {
      if (editingSubject) {
        await axios.put(`/api/subjects/${editingSubject.id}`, formData);
        toast.success('Subject updated successfully');
      } else {
        await axios.post('/api/subjects', formData);
        toast.success('Subject created successfully');
      }
      
      setShowModal(false);
      setEditingSubject(null);
      setFormData({ name: '', description: '', color: '#3B82F6' });
      fetchSubjects();
    } catch (error) {
      console.error('Error saving subject:', error);
      toast.error(error.response?.data?.error || 'Failed to save subject');
    }
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      description: subject.description || '',
      color: subject.color || '#3B82F6'
    });
    setShowModal(true);
  };

  const handleDelete = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject? This will also delete all related todos, goals, and progress.')) {
      return;
    }

    try {
      await axios.delete(`/api/subjects/${subjectId}`);
      toast.success('Subject deleted successfully');
      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Failed to delete subject');
    }
  };

  const openModal = () => {
    setEditingSubject(null);
    setFormData({ name: '', description: '', color: '#3B82F6' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSubject(null);
    setFormData({ name: '', description: '', color: '#3B82F6' });
  };

  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

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
          <h1 className="text-2xl font-bold text-[#67FA3E]">Subjects</h1>
          <p className="text-[#67FA3E] opacity-80">Manage your study subjects and topics</p>
        </div>
        <button
          onClick={openModal}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Subject
        </button>
      </div>

      {/* Subjects Grid */}
      {subjects.length === 0 ? (
        <div className="card bg-[#181818] border border-[#232323]">
          <div className="card-body text-center">
            <img src="/logo.png" alt="Logo" className="w-16 h-16 mx-auto mb-4 opacity-80" />
            <h3 className="text-xl font-semibold text-[#67FA3E] mb-2">No subjects yet</h3>
            <p className="text-[#67FA3E] opacity-80 mb-6">Create your first subject to start organizing your studies</p>
            <button onClick={openModal} className="btn btn-primary">
              Create Your First Subject
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <div key={subject.id} className="card hover:shadow-md transition-shadow duration-200 bg-[#181818] border border-[#232323]">
              <div className="card-body">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: subject.color }}
                    ></div>
                    <h3 className="text-lg font-semibold text-[#67FA3E]">{subject.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(subject)}
                      className="p-1 text-[#67FA3E] hover:bg-[#232323] rounded transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(subject.id)}
                      className="p-1 text-[#67FA3E] hover:bg-red-600/10 hover:text-red-500 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {subject.description && (
                  <p className="text-sm mb-4 text-[#67FA3E] opacity-80">{subject.description}</p>
                )}

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-[#67FA3E]">{subject.total_todos || 0}</div>
                    <div className="text-[#67FA3E] opacity-80">Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-[#67FA3E]">{subject.total_goals || 0}</div>
                    <div className="text-[#67FA3E] opacity-80">Goals</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-[#67FA3E]">{subject.total_hours || 0}h</div>
                    <div className="text-[#67FA3E] opacity-80">Studied</div>
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
              {editingSubject ? 'Edit Subject' : 'Add New Subject'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#67FA3E] mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full focus:ring-[#67FA3E] focus:border-[#67FA3E]"
                  placeholder="e.g., Mathematics, Physics, History"
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
                  placeholder="Optional description of the subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#67FA3E] mb-1">
                  Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all shadow-sm ${
                        formData.color === color ? 'border-[#67FA3E] ring-2 ring-[#67FA3E] scale-110' : 'border-[#232323] hover:border-[#67FA3E]'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
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
                  {editingSubject ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subjects; 