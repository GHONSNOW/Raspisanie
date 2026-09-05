import React, { useState } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { Classroom, Teacher } from '../types';
import {
  GraduationCap,
  Building,
  Plus,
  Mail,
  Phone,
  Edit2,
  Trash2,
  FileText,
  Search,
} from 'lucide-react';

export const DirectoryView: React.FC = () => {
  const {
    teachers,
    classrooms,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    addClassroom,
    updateClassroom,
    deleteClassroom,
    showToast,
    showConfirm,
  } = useSchedule();

  const [activeTab, setActiveTab] = useState<'teachers' | 'classrooms'>('teachers');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals / forms state
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    subject: '',
    email: '',
    notes: '',
  });

  const [isAddingClassroom, setIsAddingClassroom] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [classroomForm, setClassroomForm] = useState({
    number: '',
    building: '',
    floor: '',
    notes: '',
  });

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.lastName.trim() || !teacherForm.firstName.trim()) return;

    if (editingTeacher) {
      updateTeacher(editingTeacher.id, teacherForm);
      showToast(`Данные преподавателя ${teacherForm.lastName} обновлены`, 'success');
      setEditingTeacher(null);
    } else {
      addTeacher(teacherForm);
      showToast(`Преподаватель ${teacherForm.lastName} добавлен`, 'success');
      setIsAddingTeacher(false);
    }
    setTeacherForm({ firstName: '', lastName: '', middleName: '', subject: '', email: '', notes: '' });
  };

  const handleSaveClassroom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classroomForm.number.trim()) return;

    if (editingClassroom) {
      updateClassroom(editingClassroom.id, classroomForm);
      showToast(`Кабинет ${classroomForm.number} обновлен`, 'success');
      setEditingClassroom(null);
    } else {
      addClassroom(classroomForm);
      showToast(`Кабинет ${classroomForm.number} добавлен`, 'success');
      setIsAddingClassroom(false);
    }
    setClassroomForm({ number: '', building: '', floor: '', notes: '' });
  };

  const filteredTeachers = teachers.filter((t) => {
    const q = searchQuery.toLowerCase();
    const fullName = `${t.lastName} ${t.firstName} ${t.middleName || ''}`.toLowerCase();
    const subj = (t.subject || '').toLowerCase();
    return fullName.includes(q) || subj.includes(q);
  });

  const filteredClassrooms = classrooms.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.number.toLowerCase().includes(q) ||
      (c.building || '').toLowerCase().includes(q) ||
      (c.notes || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Справочники
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Управляйте базой преподавателей и аудиторий для быстрого выбора в парах
          </p>
        </div>

        {/* Tab switcher: Преподаватели | Аудитории */}
        <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-medium border border-zinc-200/60 dark:border-zinc-700/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'teachers'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Преподаватели ({teachers.length})
          </button>
          <button
            onClick={() => setActiveTab('classrooms')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'classrooms'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            Кабинеты ({classrooms.length})
          </button>
        </div>
      </div>

      {/* Search & Action Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder={activeTab === 'teachers' ? 'Поиск преподавателя...' : 'Поиск кабинета или корпуса...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>

        <button
          onClick={() => {
            if (activeTab === 'teachers') {
              setEditingTeacher(null);
              setTeacherForm({ firstName: '', lastName: '', middleName: '', subject: '', email: '', notes: '' });
              setIsAddingTeacher(true);
            } else {
              setEditingClassroom(null);
              setClassroomForm({ number: '', building: '', floor: '', notes: '' });
              setIsAddingClassroom(true);
            }
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 shadow-xs cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          {activeTab === 'teachers' ? 'Добавить преподавателя' : 'Добавить кабинет'}
        </button>
      </div>

      {/* Content for Teachers */}
      {activeTab === 'teachers' && (
        <div className="space-y-3">
          {filteredTeachers.length === 0 ? (
            <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
              <GraduationCap className="w-8 h-8 mx-auto text-zinc-400 mb-2 opacity-60" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Преподаватели не найдены
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Добавьте преподавателя, чтобы не вводить его данные вручную при создании пары.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredTeachers.map((t) => (
                <div
                  key={t.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          {t.lastName[0]}
                          {t.firstName[0]}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {t.lastName} {t.firstName} {t.middleName || ''}
                          </h4>
                          {t.subject && (
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                              {t.subject}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingTeacher(t);
                            setTeacherForm({
                              firstName: t.firstName,
                              lastName: t.lastName,
                              middleName: t.middleName || '',
                              subject: t.subject || '',
                              email: t.email || '',
                              notes: t.notes || '',
                            });
                            setIsAddingTeacher(true);
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            showConfirm({
                              title: 'Удалить преподавателя?',
                              message: `Вы действительно хотите удалить ${t.lastName} ${t.firstName} из справочника?`,
                              confirmText: 'Удалить',
                              isDestructive: true,
                              onConfirm: () => {
                                deleteTeacher(t.id);
                                showToast(`Преподаватель ${t.lastName} удален`, 'info');
                              },
                            });
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Удалить преподавателя"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {t.email && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-500">
                        <Mail className="w-3.5 h-3.5 text-zinc-400" />
                        <a href={`mailto:${t.email}`} className="hover:underline">
                          {t.email}
                        </a>
                      </div>
                    )}

                    {t.notes && (
                      <p className="mt-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-600 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-800">
                        {t.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content for Classrooms */}
      {activeTab === 'classrooms' && (
        <div className="space-y-3">
          {filteredClassrooms.length === 0 ? (
            <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
              <Building className="w-8 h-8 mx-auto text-zinc-400 mb-2 opacity-60" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Кабинеты не найдены
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Добавьте кабинеты с номерами корпусов и этажами для удобной навигации.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredClassrooms.map((c) => (
                <div
                  key={c.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700">
                            Кабинет {c.number}
                          </span>
                          {c.floor && (
                            <span className="text-xs text-zinc-500 font-medium">{c.floor}</span>
                          )}
                        </div>
                        {c.building && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{c.building}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingClassroom(c);
                            setClassroomForm({
                              number: c.number,
                              building: c.building || '',
                              floor: c.floor || '',
                              notes: c.notes || '',
                            });
                            setIsAddingClassroom(true);
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            showConfirm({
                              title: 'Удалить кабинет?',
                              message: `Вы действительно хотите удалить кабинет ${c.number} из справочника?`,
                              confirmText: 'Удалить',
                              isDestructive: true,
                              onConfirm: () => {
                                deleteClassroom(c.id);
                                showToast(`Кабинет ${c.number} удален`, 'info');
                              },
                            });
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Удалить кабинет"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {c.notes && (
                      <p className="mt-2.5 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-600 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-800">
                        {c.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Teacher Modal */}
      {isAddingTeacher && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {editingTeacher ? 'Редактировать преподавателя' : 'Новый преподаватель'}
            </h3>

            <form onSubmit={handleSaveTeacher} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-500 font-medium">Фамилия *</label>
                  <input
                    type="text"
                    required
                    value={teacherForm.lastName}
                    onChange={(e) => setTeacherForm({ ...teacherForm, lastName: e.target.value })}
                    placeholder="Петров"
                    className="w-full mt-1 p-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-medium">Имя *</label>
                  <input
                    type="text"
                    required
                    value={teacherForm.firstName}
                    onChange={(e) => setTeacherForm({ ...teacherForm, firstName: e.target.value })}
                    placeholder="Роман"
                    className="w-full mt-1 p-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 font-medium">Отчество</label>
                <input
                  type="text"
                  value={teacherForm.middleName}
                  onChange={(e) => setTeacherForm({ ...teacherForm, middleName: e.target.value })}
                  placeholder="Алексеевич"
                  className="w-full mt-1 p-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 font-medium">Основной предмет</label>
                <input
                  type="text"
                  value={teacherForm.subject}
                  onChange={(e) => setTeacherForm({ ...teacherForm, subject: e.target.value })}
                  placeholder="Программирование"
                  className="w-full mt-1 p-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 font-medium">Email для связи</label>
                <input
                  type="email"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  placeholder="petrov@univ.edu"
                  className="w-full mt-1 p-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 font-medium">Заметки</label>
                <textarea
                  rows={2}
                  value={teacherForm.notes}
                  onChange={(e) => setTeacherForm({ ...teacherForm, notes: e.target.value })}
                  placeholder="Особенности сдачи лабораторных, консультации..."
                  className="w-full mt-1 p-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingTeacher(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Classroom Modal */}
      {isAddingClassroom && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {editingClassroom ? 'Редактировать кабинет' : 'Новый кабинет'}
            </h3>

            <form onSubmit={handleSaveClassroom} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 font-medium">Номер кабинета / аудитории *</label>
                <input
                  type="text"
                  required
                  value={classroomForm.number}
                  onChange={(e) => setClassroomForm({ ...classroomForm, number: e.target.value })}
                  placeholder="304 или 212-Б"
                  className="w-full mt-1 p-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-500 font-medium">Корпус</label>
                  <input
                    type="text"
                    value={classroomForm.building}
                    onChange={(e) => setClassroomForm({ ...classroomForm, building: e.target.value })}
                    placeholder="Корпус №2"
                    className="w-full mt-1 p-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-medium">Этаж</label>
                  <input
                    type="text"
                    value={classroomForm.floor}
                    onChange={(e) => setClassroomForm({ ...classroomForm, floor: e.target.value })}
                    placeholder="3 этаж"
                    className="w-full mt-1 p-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 font-medium">Описание / заметки</label>
                <textarea
                  rows={2}
                  value={classroomForm.notes}
                  onChange={(e) => setClassroomForm({ ...classroomForm, notes: e.target.value })}
                  placeholder="Проектор, розетки у каждой парты, вход со двора..."
                  className="w-full mt-1 p-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingClassroom(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
