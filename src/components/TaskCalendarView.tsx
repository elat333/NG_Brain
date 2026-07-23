import React, { useState, useMemo } from 'react';
import { Task, TeamMember, Process, Project } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  Tag,
  X,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TaskCalendarViewProps {
  tasks: Task[];
  members: TeamMember[];
  processes: Process[];
  projects: Project[];
  onEdit: (task: Task) => void;
  onUpdateStatus: (taskId: string, status: Task['status']) => void;
  onAddTask: (initialStatus?: Task['status'], initialDate?: string) => void;
}

// Map task status to spanish labels and Tailwind colors
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  backlog: { label: 'Product Backlog', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200/60', dot: 'bg-slate-400' },
  todo: { label: 'Por Hacer', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200/60', dot: 'bg-gray-500' },
  in_progress: { label: 'En Progreso', bg: 'bg-blue-50/70', text: 'text-blue-700', border: 'border-blue-100', dot: 'bg-blue-500' },
  blocked: { label: 'Bloqueada', bg: 'bg-red-50/70', text: 'text-red-700', border: 'border-red-100', dot: 'bg-red-500' },
  review: { label: 'En Revisión', bg: 'bg-purple-50/70', text: 'text-purple-700', border: 'border-purple-100', dot: 'bg-purple-500' },
  correction: { label: 'Para Corrección', bg: 'bg-amber-50/70', text: 'text-amber-700', border: 'border-amber-100', dot: 'bg-amber-500' },
  done: { label: 'Completada', bg: 'bg-green-50/70', text: 'text-green-700', border: 'border-green-100', dot: 'bg-green-500' },
  rejected: { label: 'Rechazada', bg: 'bg-orange-50/70', text: 'text-orange-700', border: 'border-orange-100', dot: 'bg-orange-500' }
};

const MONTHS_SPANISH = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_SHORT_SPANISH = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function TaskCalendarView({
  tasks,
  members,
  processes,
  projects,
  onEdit,
  onUpdateStatus,
  onAddTask
}: TaskCalendarViewProps) {
  // Defensive array mapping to handle null/undefined props
  const safeTasks = tasks || [];
  const safeMembers = members || [];
  const safeProcesses = processes || [];
  const safeProjects = projects || [];

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Helper: parse date safely from any input
  const safeParseDate = (dateStr: any): Date => {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) {
      return isNaN(dateStr.getTime()) ? new Date() : dateStr;
    }
    if (typeof dateStr !== 'string') {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;
      } catch (e) {}
      return new Date();
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d, 12, 0, 0);
      }
    }
    const fallback = new Date(dateStr);
    if (isNaN(fallback.getTime())) {
      return new Date(2026, 6, 8, 12, 0, 0);
    }
    return fallback;
  };

  // Helper: format date to YYYY-MM-DD safely
  const formatDateStr = (d: any): string => {
    if (!d) {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    let dateObj = d;
    if (!(d instanceof Date)) {
      dateObj = new Date(d);
    }
    if (isNaN(dateObj.getTime())) {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(() => {
    return formatDateStr(new Date());
  });

  // Local filter states
  const [memberFilter, setMemberFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentYear = currentDate && !isNaN(currentDate.getTime()) ? currentDate.getFullYear() : 2026;
  const currentMonth = currentDate && !isNaN(currentDate.getTime()) ? currentDate.getMonth() : 6;

  // Helper: check if task is active on a YYYY-MM-DD date string
  const isTaskActiveOnDate = (task: Task | null | undefined, dateStr: string) => {
    if (!task || !task.plannedDate || typeof task.plannedDate !== 'string') return false;
    const start = task.plannedDate;
    const end = (typeof task.plannedEndDate === 'string' && task.plannedEndDate) ? task.plannedEndDate : start;
    return dateStr >= start && dateStr <= end;
  };

  // Filter tasks based on internal calendar filters
  const calendarFilteredTasks = useMemo(() => {
    return safeTasks.filter(task => {
      if (!task) return false;
      if (memberFilter && task.memberId !== memberFilter && (!Array.isArray(task.auxiliaryIds) || !task.auxiliaryIds.includes(memberFilter))) {
        return false;
      }
      if (statusFilter && task.status !== statusFilter) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (task.title || '').toLowerCase().includes(query);
        const descMatch = (task.description || '').toLowerCase().includes(query);
        if (!titleMatch && !descMatch) return false;
      }
      return true;
    });
  }, [safeTasks, memberFilter, statusFilter, searchQuery]);

  // Tasks scheduled vs unscheduled
  const { scheduled: scheduledTasks, unscheduled: unscheduledTasks } = useMemo(() => {
    const scheduled: Task[] = [];
    const unscheduled: Task[] = [];
    calendarFilteredTasks.forEach(task => {
      if (!task) return;
      if (task.plannedDate) {
        scheduled.push(task);
      } else {
        unscheduled.push(task);
      }
    });
    return { scheduled, unscheduled };
  }, [calendarFilteredTasks]);

  // Navigate month
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(formatDateStr(today));
  };

  // Generate Month Grid Days
  const monthDaysGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday index is 0, Sunday is 6

    const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();
    const grid: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    const todayStr = formatDateStr(new Date());

    // Fill previous month days
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDaysCount - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    // Fill current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // Fill next month days to align grid (standard 42 cells)
    const targetCellsCount = grid.length <= 35 ? 35 : 42;
    const fillCount = targetCellsCount - grid.length;
    for (let d = 1; d <= fillCount; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    return grid;
  }, [currentYear, currentMonth]);

  // Week Grid Days (7 days centered on selected date)
  const weekDaysGrid = useMemo(() => {
    const anchorDate = safeParseDate(selectedDateStr);
    const dayOfWeek = anchorDate.getDay(); // Sunday = 0
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(anchorDate.getTime());
    monday.setDate(monday.getDate() + mondayOffset);

    const grid = [];
    const todayStr = formatDateStr(new Date());

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime());
      d.setDate(d.getDate() + i);
      const dateStr = formatDateStr(d);
      const monthIdx = d.getMonth();
      const monthName = MONTHS_SPANISH[monthIdx] ? MONTHS_SPANISH[monthIdx].substring(0, 3) : '';
      grid.push({
        dateStr,
        dayNum: d.getDate(),
        monthName,
        dateObj: d,
        isToday: dateStr === todayStr
      });
    }

    return grid;
  }, [selectedDateStr]);

  // Get active tasks for a specific date
  const getTasksForDate = (dateStr: string) => {
    return scheduledTasks.filter(task => isTaskActiveOnDate(task, dateStr));
  };

  // Selected date tasks
  const selectedDateTasks = useMemo(() => {
    if (!selectedDateStr) return [];
    return getTasksForDate(selectedDateStr);
  }, [selectedDateStr, scheduledTasks]);

  // Helper to format full date in Spanish
  const formatFullDateSpanish = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const month = MONTHS_SPANISH[parseInt(parts[1], 10) - 1];
    const day = parts[2];
    return `${day} de ${month}, ${year}`;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full text-slate-800" id="task-calendar-view-root">
      
      {/* LEFT: Calendar Panel */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200/70 shadow-xl overflow-hidden flex flex-col p-6 min-h-[500px]">
        
        {/* Calendar Header / Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-ng-lime text-ng-black rounded-2xl shadow-sm shadow-ng-lime/10">
              <CalendarIcon size={22} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold uppercase tracking-tight text-slate-900 flex items-center gap-2">
                {viewMode === 'month' ? (
                  <>
                    <span className="text-slate-900">{MONTHS_SPANISH[currentMonth]}</span>
                    <span className="text-slate-400 font-medium">{currentYear}</span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-950">Vista Semanal</span>
                    <span className="text-xs bg-slate-100 text-slate-600 font-black tracking-wide uppercase px-2 py-1 rounded-md">
                      {weekDaysGrid[0] && weekDaysGrid[6] ? `${weekDaysGrid[0].dayNum} ${weekDaysGrid[0].monthName} - ${weekDaysGrid[6].dayNum} ${weekDaysGrid[6].monthName}` : ''}
                    </span>
                  </>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5">Control visual de viajes, hitos y actividades planificadas</p>
            </div>
          </div>

          {/* Controls: Mode Switch, Navigation */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === 'month'
                    ? 'bg-white text-ng-black shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Mes
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === 'week'
                    ? 'bg-white text-ng-black shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Semana
              </button>
            </div>

            {/* Prev, Today, Next Nav */}
            <div className="flex items-center bg-slate-100/50 border border-slate-200/30 rounded-xl p-1">
              <button
                onClick={viewMode === 'month' ? handlePrevMonth : () => {
                  const d = safeParseDate(selectedDateStr);
                  d.setDate(d.getDate() - 7);
                  setSelectedDateStr(formatDateStr(d));
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white transition-all"
                title="Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
              >
                Hoy
              </button>
              <button
                onClick={viewMode === 'month' ? handleNextMonth : () => {
                  const d = safeParseDate(selectedDateStr);
                  d.setDate(d.getDate() + 7);
                  setSelectedDateStr(formatDateStr(d));
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white transition-all"
                title="Siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Filters Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 my-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Buscar tarea..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all placeholder:text-slate-400"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="relative flex items-center">
            <User className="absolute left-3.5 text-slate-400" size={14} />
            <select
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all uppercase tracking-wider"
              value={memberFilter}
              onChange={e => setMemberFilter(e.target.value)}
            >
              <option value="">TODOS LOS RESPONSABLES</option>
              {safeMembers.map(m => {
                if (!m) return null;
                return (
                  <option key={m.id} value={m.id}>{((m.name) || 'Sin Nombre').toUpperCase()}</option>
                );
              })}
            </select>
          </div>

          <div className="relative flex items-center">
            <CheckCircle2 className="absolute left-3.5 text-slate-400" size={14} />
            <select
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all uppercase tracking-wider"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">TODOS LOS ESTADOS</option>
              {Object.entries(STATUS_CONFIG).map(([val, conf]) => (
                <option key={val} value={val}>{conf.label.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {/* CALENDAR MONTH GRID */}
        {viewMode === 'month' ? (
          <div className="flex-1 grid grid-cols-7 border-t border-l border-slate-100 rounded-2xl overflow-hidden mt-1 h-full min-h-[420px]">
            {/* Days short names headers */}
            {DAYS_SHORT_SPANISH.map((day, idx) => (
              <div 
                key={day} 
                className={`py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/75 border-r border-b border-slate-100 ${
                  idx === 5 || idx === 6 ? 'text-slate-400/80' : ''
                }`}
              >
                {day}
              </div>
            ))}

            {/* Monthly grid cells */}
            {monthDaysGrid.map((day, idx) => {
              const dayTasks = getTasksForDate(day.dateStr);
              const isSelected = selectedDateStr === day.dateStr;
              
              return (
                <div
                  key={`${day.dateStr}-${idx}`}
                  onClick={() => setSelectedDateStr(day.dateStr)}
                  className={`min-h-[85px] max-h-[120px] p-2 flex flex-col justify-between border-r border-b border-slate-100 cursor-pointer transition-all select-none relative group ${
                    day.isCurrentMonth ? 'bg-white' : 'bg-slate-50/30 text-slate-300'
                  } ${day.isToday ? 'bg-amber-50/40' : ''} ${
                    isSelected ? 'ring-2 ring-ng-green/60 ring-inset bg-ng-lime/5 z-10' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {/* Top cell header: Day number & Today indicator */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold ${
                      day.isToday 
                        ? 'bg-ng-green text-white font-extrabold w-5 h-5 flex items-center justify-center rounded-full shadow-sm' 
                        : isSelected 
                          ? 'text-ng-green font-black scale-105'
                          : day.isCurrentMonth ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {day.dayNum}
                    </span>
                    
                    {/* Tasks count dot indicator if cell gets congested */}
                    {dayTasks.length > 0 && (
                      <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200/50 font-black px-1.5 py-0.25 rounded-md scale-90">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Tasks List inside cell (limit to 2 or 3) */}
                  <div className="mt-1 flex-1 overflow-hidden space-y-1 custom-scrollbar max-h-[60px]">
                    {dayTasks.slice(0, 2).map(task => {
                      if (!task) return null;
                      const conf = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                      const process = safeProcesses.find(p => p && p.id === task.processId);
                      return (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(task);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border shadow-sm flex items-center gap-1 leading-none truncate transition-all hover:scale-[1.02] ${conf.bg} ${conf.text} ${conf.border}`}
                          title={`[${process?.name || 'Proceso'}] ${task.title} - ${conf.label}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dot}`} />
                          <span className="truncate">{task.title}</span>
                        </div>
                      );
                    })}
                    
                    {dayTasks.length > 2 && (
                      <div className="text-[8px] font-black text-slate-400 text-center uppercase tracking-wide bg-slate-50 py-0.5 rounded">
                        + {dayTasks.length - 2} más
                      </div>
                    )}
                  </div>

                  {/* Hover Cell Quick Add Action */}
                  {day.isCurrentMonth && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddTask('todo', day.dateStr);
                      }}
                      className="absolute right-1 bottom-1 opacity-0 group-hover:opacity-100 bg-slate-100 border border-slate-200 hover:bg-ng-lime hover:border-ng-green/30 transition-all p-1 rounded-lg text-slate-600 hover:text-ng-black"
                      title="Agregar tarea planificada para este día"
                    >
                      <Plus size={10} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* WEEKLY VIEW COLUMN GRID */
          <div className="flex-1 grid grid-cols-1 md:grid-cols-7 gap-3 mt-1.5 h-full min-h-[420px]">
            {weekDaysGrid.map(day => {
              const dayTasks = getTasksForDate(day.dateStr);
              const isSelected = selectedDateStr === day.dateStr;
              const isWeekend = day.dateObj.getDay() === 0 || day.dateObj.getDay() === 6;

              return (
                <div
                  key={day.dateStr}
                  onClick={() => setSelectedDateStr(day.dateStr)}
                  className={`flex flex-col rounded-2xl border p-4.5 transition-all cursor-pointer min-h-[350px] relative group ${
                    day.isToday 
                      ? 'bg-amber-50/20 border-amber-200/80 shadow-md ring-1 ring-amber-200/50' 
                      : isWeekend 
                        ? 'bg-slate-50/40 border-slate-200/60' 
                        : 'bg-white border-slate-200/70 shadow-sm'
                  } ${
                    isSelected ? 'ring-2 ring-ng-green border-transparent' : 'hover:border-slate-300'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-baseline justify-between mb-3.5 pb-2.5 border-b border-dashed border-slate-200/60">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        {DAYS_SHORT_SPANISH[(day.dateObj.getDay() + 6) % 7]}
                      </h4>
                      <p className="text-base font-extrabold text-slate-800 leading-none mt-1">
                        {day.dayNum} <span className="text-xs font-bold text-slate-400 uppercase">{day.monthName}</span>
                      </p>
                    </div>
                    {day.isToday && (
                      <span className="bg-ng-green text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                        Hoy
                      </span>
                    )}
                  </div>

                  {/* Tasks list inside day column */}
                  <div className="flex-1 space-y-2.5 overflow-y-auto custom-scrollbar pr-0.5 max-h-[300px]">
                    {dayTasks.map(task => {
                      if (!task) return null;
                      const conf = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                      const process = safeProcesses.find(p => p && p.id === task.processId);
                      const member = safeMembers.find(m => m && m.id === task.memberId);
                      
                      return (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(task);
                          }}
                          className={`p-3 rounded-xl border shadow-sm transition-all hover:scale-[1.02] flex flex-col gap-1.5 bg-white ${conf.border}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wide leading-none ${conf.bg} ${conf.text}`}>
                              {conf.label}
                            </span>
                            {task.priority === 'alta' || task.priority === 'meteoric_crash' ? (
                              <AlertCircle size={10} className="text-red-500 flex-shrink-0 animate-pulse" />
                            ) : null}
                          </div>
                          
                          <h5 className="text-[11px] font-black text-slate-800 leading-normal line-clamp-2">
                            {task.title}
                          </h5>

                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold border-t border-dashed border-slate-100 pt-1.5 mt-0.5">
                            <span className="text-[8px] bg-slate-50 text-slate-500 py-0.5 px-1 rounded border border-slate-200/30 truncate max-w-[65px] font-black uppercase tracking-wide">
                              {process?.name || 'Proceso'}
                            </span>
                            {member ? (
                              <div className="flex items-center gap-1 shrink-0">
                                {member.avatar ? (
                                  <img 
                                    src={member.avatar} 
                                    className="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-slate-100" 
                                    referrerPolicy="no-referrer"
                                    alt={member.name || 'Miembro'}
                                  />
                                ) : (
                                  <User size={10} className="text-slate-400" />
                                )}
                                <span className="truncate max-w-[50px] text-[8px] font-extrabold">{(member.name || 'Miembro').split(' ')[0]}</span>
                              </div>
                            ) : (
                              <span className="italic text-[8px] text-slate-300">N/A</span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {dayTasks.length === 0 && (
                      <div className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-xl py-6 text-slate-300 group-hover:border-slate-200/60 transition-colors">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Libre</span>
                      </div>
                    )}
                  </div>

                  {/* Add action */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddTask('todo', day.dateStr);
                    }}
                    className="mt-2 w-full py-1.5 bg-slate-50 hover:bg-ng-lime border border-slate-200/50 border-dashed rounded-xl flex items-center justify-center text-slate-400 hover:text-ng-black transition-all"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* RIGHT: Selected Day Details & Unplanned Drawer */}
      <div className="w-full lg:w-[350px] bg-slate-50 rounded-3xl border border-slate-200/60 p-6 flex flex-col gap-5 shadow-xl max-h-[750px] overflow-y-auto custom-scrollbar">
        
        {/* Selected Day Block */}
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <CalendarIcon size={12} className="text-ng-green" /> Tareas del Día
          </h3>
          <p className="text-sm font-black text-slate-800 uppercase tracking-wide">
            {selectedDateStr ? formatFullDateSpanish(selectedDateStr) : 'Ningún día seleccionado'}
          </p>

          <div className="space-y-3 mt-4">
            {selectedDateTasks.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl text-center border border-slate-200/40 text-slate-400">
                <CalendarIcon size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No hay tareas planificadas</p>
                <p className="text-[10px] text-slate-400/80 mt-1">Este día está despejado de actividades planificadas.</p>
                {selectedDateStr && (
                  <button
                    onClick={() => onAddTask('todo', selectedDateStr)}
                    className="mt-3.5 px-4 py-2 bg-slate-100 hover:bg-ng-lime text-slate-700 hover:text-ng-black text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-200"
                  >
                    Planificar una Tarea
                  </button>
                )}
              </div>
            ) : (
              selectedDateTasks.map(task => {
                if (!task) return null;
                const conf = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                const process = safeProcesses.find(p => p && p.id === task.processId);
                const project = safeProjects.find(p => p && p.id === task.projectId);
                const member = safeMembers.find(m => m && m.id === task.memberId);

                return (
                  <div
                    key={task.id}
                    onClick={() => onEdit(task)}
                    className="bg-white p-4 rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-slate-300 relative"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${conf.bg} ${conf.text} border ${conf.border}`}>
                        {conf.label}
                      </span>
                      {task.priority && (
                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          task.priority === 'alta' || task.priority === 'meteoric_crash' ? 'bg-red-50 text-red-600' :
                          task.priority === 'media' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'
                        }`}>
                          {task.priority === 'meteoric_crash' ? '¡CRÍTICA!' : task.priority}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-ng-green transition-colors leading-snug">
                      {task.title}
                    </h4>
                    
                    {task.description && (
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {/* Metadata strip */}
                    <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold">
                        <span className="uppercase flex items-center gap-1">
                          <Layers size={10} className="text-slate-400" /> Proceso:
                        </span>
                        <span className="text-slate-700 max-w-[150px] truncate">{process?.name || 'N/A'}</span>
                      </div>

                      {project && (
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold">
                          <span className="uppercase">Proyecto:</span>
                          <span className="text-slate-700 max-w-[150px] truncate">{project?.name || 'N/A'}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold">
                        <span className="uppercase flex items-center gap-1">
                          <User size={10} className="text-slate-400" /> Responsable:
                        </span>
                        <span className="text-slate-800 font-extrabold">{member?.name || 'No asignado'}</span>
                      </div>

                      {task.plannedEndDate && task.plannedEndDate !== task.plannedDate && (
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold bg-slate-50 p-1.5 rounded-lg border border-slate-100 mt-1">
                          <span>DURACIÓN PLANIFICADA:</span>
                          <span className="text-slate-700 font-black">Del {task.plannedDate} al {task.plannedEndDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Unplanned Tasks Block */}
        <div className="border-t border-slate-200/60 pt-5 mt-2 flex-1 flex flex-col min-h-[250px]">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock size={12} className="text-blue-500" /> Tareas Sin Planificar
            </span>
            <span className="bg-slate-200 text-slate-600 text-[9px] font-black px-1.5 py-0.5 rounded-full">
              {unscheduledTasks.length}
            </span>
          </h3>

          <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 flex-1 max-h-[300px]">
            {unscheduledTasks.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl text-center border border-slate-200/30 text-slate-300 text-xs py-8">
                <CheckCircle2 size={24} className="mx-auto text-green-500 mb-2" />
                <p className="font-extrabold uppercase tracking-wide text-slate-500 text-[10px]">¡Todo al día!</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Todas tus tareas activas tienen una fecha planificada.</p>
              </div>
            ) : (
              unscheduledTasks.map(task => {
                if (!task) return null;
                const conf = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                const process = safeProcesses.find(p => p && p.id === task.processId);

                return (
                  <div
                    key={task.id}
                    onClick={() => onEdit(task)}
                    className="bg-white p-3.5 rounded-xl border border-slate-200/50 shadow-sm hover:shadow hover:border-slate-300 transition-all cursor-pointer flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] bg-slate-50 text-slate-500 py-0.5 px-1.5 rounded border border-slate-200/40 uppercase tracking-wide font-black truncate max-w-[120px]">
                        {process?.name || 'Proceso'}
                      </span>
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.25 rounded ${conf.bg} ${conf.text} border ${conf.border}`}>
                        {conf.label}
                      </span>
                    </div>
                    
                    <h4 className="text-[11px] font-extrabold text-slate-800 leading-snug hover:text-ng-green transition-colors mt-1">
                      {task.title}
                    </h4>

                    {/* Quick reschedule helper */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-blue-500 font-extrabold hover:text-blue-700 transition-colors">
                      <span className="uppercase flex items-center gap-1">Asignar Fecha <ArrowRight size={10} /></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

class CalendarErrorBoundary extends React.Component<any, any> {
  state: { hasError: boolean; error: Error | null };
  props: { children: React.ReactNode };

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("CalendarErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50/80 border border-red-200 rounded-[2rem] text-red-900 m-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 text-red-700 rounded-2xl">
              <span className="text-xl font-bold">⚠️</span>
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-red-950">
                Error en el Calendario de Tareas
              </h3>
              <p className="text-xs text-red-700 font-bold mt-0.5">Se detectó un fallo durante el renderizado del componente.</p>
            </div>
          </div>
          
          <div className="bg-white/80 p-5 rounded-2xl border border-red-100 max-h-[250px] overflow-auto shadow-inner">
            <p className="text-[11px] font-mono leading-relaxed text-red-800 whitespace-pre-wrap select-all">
              {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                (this as any).setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              Forzar Recarga
            </button>
            <button
              onClick={() => (this as any).setState({ hasError: false, error: null })}
              className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function SafeTaskCalendarView(props: TaskCalendarViewProps) {
  return (
    <CalendarErrorBoundary>
      <TaskCalendarView {...props} />
    </CalendarErrorBoundary>
  );
}
