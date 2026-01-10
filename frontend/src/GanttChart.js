import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { ScrollArea } from './components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

// Status colors matching PlaybookEngine
const PHASE_COLORS = {
  INITIATION: '#8B5CF6',
  PLANNING: '#3B82F6',
  EXECUTION: '#22C55E',
  MONITORING: '#F59E0B',
  CLOSURE: '#64748B',
};

const MILESTONE_STATUS_COLORS = {
  NOT_STARTED: '#94A3B8',
  IN_PROGRESS: '#3B82F6',
  COMPLETED: '#22C55E',
  BLOCKED: '#EF4444',
  DELAYED: '#F59E0B',
};

const GanttChart = ({ plan }) => {
  const { milestones = [], tasks = [], start_date, target_end_date } = plan;

  // Calculate chart dimensions and timeline
  const chartData = useMemo(() => {
    if (!start_date || !target_end_date) {
      return { days: [], startDate: new Date(), totalDays: 30 };
    }

    const startDate = new Date(start_date);
    const endDate = new Date(target_end_date);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 30;
    
    // Generate day labels
    const days = [];
    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      days.push({
        date,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      });
    }

    return { days, startDate, totalDays };
  }, [start_date, target_end_date]);

  // Calculate bar position and width for a date range
  const getBarStyle = (itemStartDate, itemEndDate) => {
    const { startDate, totalDays } = chartData;
    const itemStart = new Date(itemStartDate);
    const itemEnd = new Date(itemEndDate || itemStartDate);
    
    const startOffset = Math.max(0, (itemStart - startDate) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, (itemEnd - itemStart) / (1000 * 60 * 60 * 24) + 1);
    
    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;

    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100 - left, width)}%`,
    };
  };

  // Group tasks by milestone
  const tasksByMilestone = useMemo(() => {
    const grouped = {};
    tasks.forEach(task => {
      const msId = task.milestone_id || 'unassigned';
      if (!grouped[msId]) grouped[msId] = [];
      grouped[msId].push(task);
    });
    return grouped;
  }, [tasks]);

  const today = new Date();
  const todayPosition = useMemo(() => {
    const { startDate, totalDays } = chartData;
    const daysSinceStart = (today - startDate) / (1000 * 60 * 60 * 24);
    return Math.min(100, Math.max(0, (daysSinceStart / totalDays) * 100));
  }, [chartData, today]);

  if (!milestones.length) {
    return (
      <Card className="bg-slate-50 border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No milestones to display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Execution Timeline
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Start: {new Date(start_date).toLocaleDateString()}</span>
            <span>→</span>
            <span>End: {new Date(target_end_date).toLocaleDateString()}</span>
            <span className="text-blue-600 font-medium">({chartData.totalDays} days)</span>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full" orientation="horizontal">
            <div className="min-w-[800px]">
              {/* Timeline Header */}
              <div className="flex border-b mb-2 pb-1">
                <div className="w-48 shrink-0 font-medium text-sm text-muted-foreground">
                  Milestones & Tasks
                </div>
                <div className="flex-1 relative h-6">
                  <div className="absolute inset-0 flex">
                    {chartData.days.filter((_, i) => i % Math.ceil(chartData.totalDays / 10) === 0).map((day, i) => (
                      <div 
                        key={i} 
                        className="text-xs text-muted-foreground"
                        style={{ 
                          position: 'absolute', 
                          left: `${(chartData.days.indexOf(day) / chartData.totalDays) * 100}%`,
                          transform: 'translateX(-50%)'
                        }}
                      >
                        {day.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Gantt Rows */}
              <div className="space-y-1">
                {milestones.map((milestone, idx) => {
                  const milestoneTasks = tasksByMilestone[milestone.id] || [];
                  const barStyle = getBarStyle(
                    milestone.start_date || start_date,
                    milestone.due_date
                  );
                  const statusColor = MILESTONE_STATUS_COLORS[milestone.status] || '#94A3B8';
                  const phaseColor = PHASE_COLORS[milestone.phase] || '#64748B';

                  return (
                    <div key={milestone.id} className="group">
                      {/* Milestone Row */}
                      <div className="flex items-center h-8 hover:bg-slate-50 rounded">
                        <div className="w-48 shrink-0 flex items-center gap-2 pr-2">
                          <div 
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: phaseColor }}
                          />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm font-medium truncate cursor-help">
                                {milestone.name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <p className="font-medium">{milestone.name}</p>
                              <p className="text-xs text-muted-foreground">{milestone.description}</p>
                              <p className="text-xs mt-1">Phase: {milestone.phase}</p>
                              <p className="text-xs">Status: {milestone.status}</p>
                            </TooltipContent>
                          </Tooltip>
                          <Badge 
                            variant="outline" 
                            className="text-[10px] h-4 shrink-0"
                            style={{ borderColor: statusColor, color: statusColor }}
                          >
                            {milestone.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex-1 relative h-6">
                          {/* Today marker */}
                          <div 
                            className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
                            style={{ left: `${todayPosition}%` }}
                          />
                          {/* Milestone bar */}
                          <div
                            className="absolute top-1 bottom-1 rounded-md transition-all group-hover:brightness-110"
                            style={{
                              ...barStyle,
                              backgroundColor: phaseColor,
                              opacity: milestone.status === 'COMPLETED' ? 0.6 : 0.85
                            }}
                          >
                            {milestone.status === 'COMPLETED' && (
                              <CheckCircle className="w-3 h-3 text-white absolute right-1 top-1/2 -translate-y-1/2" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Task Rows (nested under milestone) */}
                      {milestoneTasks.map((task) => {
                        const taskBarStyle = getBarStyle(
                          task.start_date || milestone.start_date || start_date,
                          task.due_date || milestone.due_date
                        );
                        const isCompleted = task.status === 'completed';

                        return (
                          <div key={task.id} className="flex items-center h-6 hover:bg-slate-50/50 rounded ml-4">
                            <div className="w-44 shrink-0 flex items-center gap-2 pr-2">
                              <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`text-xs truncate cursor-help ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                    {task.title}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <p className="font-medium">{task.title}</p>
                                  <p className="text-xs text-muted-foreground">{task.description}</p>
                                  <p className="text-xs mt-1">Priority: {task.priority}</p>
                                  <p className="text-xs">Est. Hours: {task.estimated_hours}h</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex-1 relative h-4">
                              <div
                                className="absolute top-1 bottom-1 rounded transition-all hover:brightness-110"
                                style={{
                                  ...taskBarStyle,
                                  backgroundColor: isCompleted ? '#94A3B8' : phaseColor,
                                  opacity: 0.5
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs">
                <span className="text-muted-foreground">Phases:</span>
                {Object.entries(PHASE_COLORS).map(([phase, color]) => (
                  <div key={phase} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                    <span>{phase}</span>
                  </div>
                ))}
                <span className="ml-4 text-muted-foreground">|</span>
                <div className="flex items-center gap-1">
                  <div className="w-px h-4 bg-red-400" />
                  <span>Today</span>
                </div>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

// Import Calendar icon
import { Calendar } from 'lucide-react';

export default GanttChart;
