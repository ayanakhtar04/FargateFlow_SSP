import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, MoreHorizontal } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Planner = () => {
  const [subjects, setSubjects] = useState([]);
  const [plannerSlots, setPlannerSlots] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFormat, setTimeFormat] = useState('24'); // '24' or '12'

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  const to12Hour = (time) => {
    if (!time) return '';
    // Expecting HH:MM
    const [h, m] = time.split(':');
    let hour = parseInt(h, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${m} ${suffix}`;
  };

  const formatTime = (time) => timeFormat === '12' ? to12Hour(time) : time;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subjectsRes, plannerRes] = await Promise.all([
        axios.get('/api/subjects'),
        axios.get('/api/planner-slots')
      ]);
      
      setSubjects(subjectsRes.data.subjects || []);
      setPlannerSlots(plannerRes.data.planner_slots || []);
    } catch (error) {
      console.error('Error fetching planner data:', error);
      toast.error('Failed to load planner data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async (slotData) => {
    try {
      await axios.post('/api/planner-slots', slotData);
      await fetchData();
      setShowAddModal(false);
      toast.success('Study slot added successfully!');
    } catch (error) {
      toast.error('Failed to add study slot');
    }
  };

  const handleUpdateSlot = async (id, slotData) => {
    try {
      await axios.put(`/api/planner-slots/${id}`, slotData);
      await fetchData();
      setEditingSlot(null);
      toast.success('Study slot updated successfully!');
    } catch (error) {
      toast.error('Failed to update study slot');
    }
  };

  const handleDeleteSlot = async (id) => {
    try {
      await axios.delete(`/api/planner-slots/${id}`);
      await fetchData();
      toast.success('Study slot deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete study slot');
    }
  };

  const getSlotsForDayAndTime = (dayIndex, time) => {
    return plannerSlots.filter(slot => 
      slot && typeof slot.day_of_week !== 'undefined' && slot.day_of_week === dayIndex && slot.start_time === time
    );
  };

  const getSubjectColor = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.color || '#3B82F6';
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Unknown Subject';
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
          <h1 className="text-2xl font-bold text-[#67FA3E] flex items-center gap-4">Weekly Study Planner
            <button
              type="button"
              onClick={() => setTimeFormat(f => f === '24' ? '12' : '24')}
              className="ml-2 px-3 py-1 text-xs rounded-md border border-[#232323] bg-[#181818] text-[#67FA3E] hover:bg-[#232323] transition-colors"
              title="Toggle time format"
            >
              {timeFormat === '24' ? '24H' : '12H'}
            </button>
          </h1>
          <p className="text-sm text-[#67FA3E] opacity-80">Plan your study schedule for the week</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Study Slot
        </button>
      </div>

      {/* Weekly Schedule */}
      <div className="widget">
        <div className="widget-header">
          <h2 className="widget-title">Weekly Schedule</h2>
          <div className="widget-controls">
            <button className="widget-control-button">
              <Calendar className="w-4 h-4" />
            </button>
            <button className="widget-control-button">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#232323]">
                <th className="p-3 text-left text-xs font-medium uppercase tracking-wider text-[#67FA3E] bg-[#181818]">
                  Time
                </th>
                {daysOfWeek.map((day, index) => (
                  <th key={day} className="p-3 text-left text-xs font-medium uppercase tracking-wider text-[#67FA3E] bg-[#181818]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time, timeIndex) => (
                <tr key={time} className="border-b border-[#232323]">
                  <td className="p-3 text-sm font-medium text-[#67FA3E] bg-[#181818]">
                    {formatTime(time)}
                  </td>
                  {daysOfWeek.map((day, dayIndex) => {
                    const slots = getSlotsForDayAndTime(dayIndex, time);
                    return (
                      <td key={day} className="p-1 min-h-[60px] bg-[#181818]">
                        {slots.map((slot) => (
                          <div
                            key={slot.id}
                            className="mb-1 p-2 pl-3 rounded-md text-xs text-[#67FA3E] relative group hover:shadow-md transition-all hover:-translate-y-0.5 bg-[#181818] border border-[#181818] hover:border-[#67FA3E]"
                          >
                            {/* Color bar */}
                            <span
                              className="absolute inset-y-0 left-0 w-1 rounded-l-md"
                              style={{ backgroundColor: getSubjectColor(slot.subject_id) }}
                            />
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate">{slot.title || getSubjectName(slot.subject_id)}</span>
                              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <button
                                  onClick={() => setEditingSlot(slot)}
                                  className="p-1 hover:bg-white/10 rounded mr-1"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="p-1 hover:bg-white/10 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="text-xs text-[#67FA3E] opacity-80 mt-1">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </div>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingSlot) && (
        <AddEditSlotModal
          subjects={subjects}
          slot={editingSlot}
          onSave={editingSlot ? handleUpdateSlot : handleAddSlot}
          onClose={() => {
            setShowAddModal(false);
            setEditingSlot(null);
          }}
        />
      )}
    </div>
  );
};

// Add/Edit Slot Modal Component
const AddEditSlotModal = ({ subjects, slot, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    subject_id: slot?.subject_id || '',
    day_of_week: slot?.day_of_week || 0,
    start_time: slot?.start_time || '09:00',
    end_time: slot?.end_time || '10:00',
    title: slot?.title || '',
    description: slot?.description || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (slot) {
      onSave(slot.id, formData);
    } else {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="w-full max-w-md mx-4 rounded-xl shadow-xl bg-[#181818] border border-[#232323]">
        <div className="p-6 border-b border-[#232323]">
          <h3 className="text-lg font-semibold text-[#67FA3E]">
            {slot ? 'Edit Study Slot' : 'Add Study Slot'}
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
              className="w-full p-2 border border-[#2f2f2f] rounded-md bg-[#181818] text-[#67FA3E] focus:border-[#67FA3E] focus:ring-1 focus:ring-[#67FA3E]"
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
              Day of Week
            </label>
            <select
              value={formData.day_of_week}
              onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
              className="w-full p-2 border border-[#2f2f2f] rounded-md bg-[#181818] text-[#67FA3E] focus:border-[#67FA3E] focus:ring-1 focus:ring-[#67FA3E]"
              required
            >
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                <option key={day} value={index}>{day}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#67FA3E]">
                Start Time
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full p-2 border border-[#2f2f2f] rounded-md bg-[#181818] text-[#67FA3E] focus:border-[#67FA3E] focus:ring-1 focus:ring-[#67FA3E]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#67FA3E]">
                End Time
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full p-2 border border-[#2f2f2f] rounded-md bg-[#181818] text-[#67FA3E] focus:border-[#67FA3E] focus:ring-1 focus:ring-[#67FA3E]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[#67FA3E]">
              Title (Optional)
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Custom title for this slot"
              className="w-full p-2 border border-[#2f2f2f] rounded-md bg-[#181818] text-[#67FA3E] focus:border-[#67FA3E] focus:ring-1 focus:ring-[#67FA3E]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[#67FA3E]">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional notes"
              rows="3"
              className="w-full p-2 border border-[#2f2f2f] rounded-md bg-[#181818] text-[#67FA3E] focus:border-[#67FA3E] focus:ring-1 focus:ring-[#67FA3E]"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-[#232323] text-[#67FA3E] hover:bg-[#181818]/80 rounded-md transition-colors">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-[#67FA3E] text-[#121212] font-semibold rounded-md hover:bg-[#4fd32a] transition-colors">{slot ? 'Update' : 'Add'} Slot</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Planner; 