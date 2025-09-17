<template>
  <div class="roadmap-container">
    <div class="roadmap-header">
      <h1 class="roadmap-title">Project Roadmap</h1>
      <div class="view-controls">
        <span class="view-label">View:</span>
        <button
          type="button"
          class="btn btn-sm"
          :class="{ active: currentView === 'week' }"
          @click="switchView('week')"
        >
          Week
        </button>
        <button
          type="button"
          class="btn btn-sm"
          :class="{ active: currentView === 'month' }"
          @click="switchView('month')"
        >
          Month
        </button>
      </div>
    </div>

    <div class="roadmap-content">
      <!-- Left: Task list -->
      <div class="task-list-container">
        <div class="task-list-header">
          <h3>TASKS</h3>
        </div>
        <div class="task-list" id="taskList">
          <div
            v-for="(task, idx) in tasks"
            :key="task.id"
            class="task-item"
            :class="{ highlighted: highlightedTaskId === task.id }"
            @click="focusOnTask(task.id, idx)"
          >
            <div :class="['task-priority', task.priority]"></div>
            <div class="task-info">
              <div class="task-name">{{ task.name }}</div>
              <div class="task-priority-label">{{ task.priority.toUpperCase() }} • {{ task.status }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Timeline -->
      <div class="timeline-container">
        <div class="timeline-header">
          <div class="timeline-header-content" ref="timelineHeaderContent">
            <div
              v-for="date in dates"
              :key="date.iso"
              class="timeline-day"
              :class="{ 'month-start': date.monthStart }"
              :style="{ minWidth: dayWidth + 'px', width: dayWidth + 'px' }"
            >
              <template v-if="currentView === 'month'">
                <div class="month-name">{{ date.monthName }} {{ date.year }}</div>
              </template>
              <template v-else>
                <div v-if="date.monthStart" class="month-label">{{ date.monthName }} {{ date.year }}</div>
                <div class="day-number">{{ date.day }}</div>
                <div class="day-name">{{ date.dayName }}</div>
              </template>
            </div>
          </div>
        </div>

        <div class="timeline-content" ref="timelineContent" @scroll="onTimelineScroll">
          <div class="timeline-grid" :style="{ minWidth: (dates.length * dayWidth) + 'px' }">
            <div class="grid-overlay">
              <div
                v-for="(d, i) in dates"
                :key="'grid-' + i"
                :class="['grid-line-vertical', { 'month-start': d.monthStart }]"
                :style="{ left: (i * dayWidth) + 'px' }">
              </div>
              <div
                v-for="(r, ri) in tasks"
                :key="'h-' + ri"
                class="grid-line-horizontal"
                :style="{ top: (ri * rowHeight + rowHeight) + 'px' }"></div>
            </div>

            <div v-for="(task, idx) in tasks" :key="task.id" class="timeline-row" :class="{ highlighted: highlightedTaskId === task.id }">
              <div class="task-bar-container">
                <div
                  class="task-bar"
                  :class="task.status"
                  :data-task-id="task.id"
                  :style="getTaskBarStyle(task)"
                  @click.stop="showTaskModal(task.id)"
                  @mouseenter="showTooltip($event, task)"
                  @mouseleave="hideTooltip"
                >
                  {{ task.name }}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <div v-if="tooltip.show" class="custom-tooltip show" :style="tooltip.style">
      <div class="tooltip-content">
        <div class="tooltip-title">{{ tooltip.title }}</div>
        <div class="tooltip-detail">Assigned: {{ tooltip.assigned }}</div>
        <div class="tooltip-detail" v-if="tooltip.completion">Progress: {{ tooltip.completion }}</div>
      </div>
    </div>

    <!-- Modal -->
    <v-dialog v-model="modal.show" max-width="800">
      <v-card>
        <v-card-title class="modal-header">
          <div class="modal-title">{{ modal.task?.name }}</div>
          <v-spacer></v-spacer>
        </v-card-title>

        <v-card-text class="modal-body">
          <div class="detail-section">
            <label class="detail-label">Description</label>
            <div class="detail-value">{{ modal.task?.description }}</div>
          </div>
          <div class="detail-grid">
            <div>
              <label class="detail-label">Priority</label>
              <div class="detail-value">{{ modal.task?.priority }}</div>
            </div>
            <div>
              <label class="detail-label">Status</label>
              <div class="detail-value">{{ modal.task?.status }}</div>
            </div>
            <div>
              <label class="detail-label">Category</label>
              <div class="detail-value">{{ modal.task?.category }}</div>
            </div>
            <div>
              <label class="detail-label">Total Weight</label>
              <div class="detail-value">{{ modal.task?.weighted }}</div>
            </div>
          </div>
          <div class="detail-grid">
            <div>
              <label class="detail-label">Start Date</label>
              <div class="detail-value">{{ formatDate(modal.task?.startDate) }}</div>
            </div>
            <div>
              <label class="detail-label">Due Date</label>
              <div class="detail-value">{{ formatDate(modal.task?.dueDate) }}</div>
            </div>
          </div>
          <div class="detail-grid">
            <div v-if="modal.task?.submittedCount && modal.task?.assignedMembers" >
              <label class="detail-label">Completed Tasks</label>
              <div class="detail-value">{{ modal.task?.submittedCount }} / {{ modal.task?.assignedMembers.length }}</div>
            </div>
            <div>
              <label class="detail-label">Completion Rate</label>
              <div class="detail-value">{{ modal.task?.completionRate }}%</div>
            </div>
          </div>
          <div>
            <label class="detail-label">Assigned Members</label>
            <div class="members-list">
              <span v-for="m in modal.task?.assignedMembers" :key="m" class="member-item">{{ m }}</span>
            </div>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text color="primary" @click="closeModal">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<script>
export default {
  name: 'WorkflowView',
  props: {
    taskGroups: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      currentView: 'week',
      tasks: [],
      dates: [],
      dayWidth: 60,
      rowHeight: 61,
      highlightedTaskId: null,
      tooltip: {
        show: false,
        title: '',
        assigned: '',
        completion: '',
        style: {}
      },
      modal: {
        show: false,
        task: null
      },
      timelineStart: null
    };
  },
  watch: {
    taskGroups: {
      handler(newTaskGroups, oldTaskGroups) {
        // Only update if taskGroups actually changed
        if (JSON.stringify(newTaskGroups) !== JSON.stringify(oldTaskGroups)) {
          this.tasks = this.transformTaskGroups();
          this.$nextTick(() => {
            this.updateLayout();
          });
        }
      },
      immediate: true,
      deep: true
    }
  },
  mounted() {
    // Initial setup - no need to call transformTaskGroups again as watch handles it with immediate: true
    window.addEventListener('resize', this.updateLayout);

    // Sync header scroll with content initially
    this.$nextTick(() => {
      const tc = this.$refs.timelineContent;
      if (tc) tc.addEventListener('scroll', this.onTimelineScroll);
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateLayout);
    const tc = this.$refs.timelineContent;
    if (tc) tc.removeEventListener('scroll', this.onTimelineScroll);
  },
  methods: {
    switchView(view) {
      this.currentView = view;
      this.updateLayout();
    },
    transformTaskGroups() {
      // if (!this.taskGroups || this.taskGroups.length === 0) {
      //   return this.generateSampleTasks();
      // }

      try {
        const transformedTasks = this.taskGroups.map(taskGroup => {
          // Validate required fields
          if (!taskGroup.taskGroupId || !taskGroup.title) {
            console.warn('Invalid taskGroup:', taskGroup);
            return null;
          }

          // Determine status based on completion rate and due date
          let status = 'not-started';
          const now = new Date();
          const dueDate = this.parseDate(taskGroup.dueDate);
          const startDate = this.parseDate(taskGroup.startDate);

          // Validate dates
          if (isNaN(dueDate.getTime()) || isNaN(startDate.getTime())) {
            console.warn('Invalid dates in taskGroup:', taskGroup);
            return null;
          }

          const completionRate = parseFloat(taskGroup.completionRate || '0');

          if (completionRate === 100) {
            status = 'completed';
          } else if (completionRate > 0) {
            status = now > dueDate ? 'overdue' : 'pending';
          } else {
            status = now > dueDate ? 'overdue' : 'not-started';
          }

          // Map priority to lowercase for consistency
          const priority = taskGroup.priority ? taskGroup.priority.toLowerCase() : 'medium';
          const test = {
            id: taskGroup.taskGroupId,
            name: taskGroup.title,
            description: taskGroup.description || '',
            priority: priority,
            status: status,
            startDate: startDate,
            dueDate: dueDate,
            assignedMembers: taskGroup.assignedMember || [],
            submittedCount: taskGroup.completedTasks || 0,
            description: taskGroup.description || '',
            weighted: taskGroup.totalWeight || 0,
            category: taskGroup.category || '',
            totalTasks: taskGroup.totalTasks || 0,
            completionRate: parseFloat(taskGroup.completionRate || '0.0').toFixed(1),
            createdAt: taskGroup.createdAt
          };
          console.log('Transformed task:', test); // Debug log
          return {
            id: taskGroup.taskGroupId,
            name: taskGroup.title,
            description: taskGroup.description || '',
            category: taskGroup.category || '',
            priority: priority,
            status: status,
            startDate: startDate,
            dueDate: dueDate,
            assignedMembers: taskGroup.assignedMember || [],
            weighted: taskGroup.totalWeight || 0,
            completedTasks: taskGroup.completedTasks || 0,
            completionRate: parseFloat(taskGroup.completionRate || '0.0').toFixed(1),
          };
        }).filter(task => task !== null); // Remove invalid tasks

        return this.sortTasks(transformedTasks);
      } catch (error) {
        console.error('Error transforming task groups:', error);
        return this.generateSampleTasks();
      }
    },
    generateSampleTasks() {
      const tasks = [
        {
          id: '1',
          name: 'WHAT EVER',
          description: 'TEST',
          category: 'Report',
          priority: 'medium',
          status: 'pending',
          startDate: new Date(2025, 8, 23),
          dueDate: new Date(2025, 11, 25),
          assignedMembers: ['John Doe', 'Jane Smith', 'Mike Johnson'],
          submittedCount: 2,
          description: 'Initial project setup and planning phase',
          weighted: 321,
          completionRate: 40.0,
        },
        {
          id: '2',
          name: 'Database Migration',
          description: 'Test Database',
          priority: 'high',
          status: 'overdue',
          startDate: new Date(2025, 8, 26),
          dueDate: new Date(2025, 8, 30),
          assignedMembers: ['Alice Brown', 'Bob Wilson'],
          submittedCount: 1,
          description: 'Migrate existing database to new infrastructure',
          weighted: 210,
          completionRate: 20.0,
        },
        {
          id: '3',
          name: 'Second Task',
          description: 'Test Description',
          priority: 'high',
          status: 'pending',
          startDate: new Date(2025, 9, 1),
          dueDate: new Date(2025, 9, 10),
          assignedMembers: ['Charlie Davis', 'Diana Evans', 'Frank Miller', 'Grace Wilson'],
          submittedCount: 3,
          description: 'Implementation of core features and functionality',
          weighted: 300,
          completionRate: 60.0
        },
        {
          id: '4',
          name: 'UI Component Library',
          description: 'Test Description',
          priority: 'medium',
          status: 'not-started',
          startDate: new Date(2025, 9, 6),
          dueDate: new Date(2025, 9, 8),
          assignedMembers: ['Henry Taylor', 'Ivy Chen'],
          submittedCount: 0,
          description: 'Create reusable UI components for the application',
          weighted: 200,
          completionRate: 0.0
        },
        {
          id: '5',
          name: 'API Documentation',
          description: 'Test API Documentation',
          priority: 'low',
          status: 'pending',
          startDate: new Date(2025, 9, 8),
          dueDate: new Date(2025, 9, 9),
          assignedMembers: ['Jack Anderson', 'Kelly Martinez'],
          submittedCount: 1,
          description: 'Complete API documentation and testing guidelines',
          weighted: 350,
          completionRate: 25.0
        },
        {
          id: '6',
          name: 'Performance Optimization',
          description: 'Test Performance',
          priority: 'high',
          status: 'not-started',
          startDate: new Date(2025, 9, 10),
          dueDate: new Date(2025, 9, 15),
          assignedMembers: ['Leo Thompson'],
          submittedCount: 0,
          description: 'Optimize application performance and load times',
          weighted: 321,
          completionRate: 0.0
        },
        {
          id: '7',
          name: 'Long Term Project',
          description: 'Test Long Term',
          priority: 'medium',
          status: 'completed',
          startDate: new Date(2024, 5, 1),
          dueDate: new Date(2026, 2, 15),
          assignedMembers: ['Project Manager', 'Team Lead', 'Developer 1', 'Developer 2'],
          submittedCount: 4,
          description: 'Long-term strategic project spanning multiple years',
          weighted: 339,
          completionRate: 100.0
        }
      ];
      return this.sortTasks(tasks);
    },
    sortTasks(tasks) {
      return tasks.sort((a, b) => a.startDate - b.startDate);
    },
    updateLayout() {
      this.dayWidth = this.getDayWidth();
      const computed = this.generateTimelineDates();
      this.dates = computed.dates;
      this.timelineStart = computed.startDate;
    },
    generateTimelineDates() {
      if (!this.tasks.length) return { dates: [], startDate: new Date() };

      // When in 'week' view we show individual days between padded start/end
      if (this.currentView === 'week') {
        const taskStartDates = this.tasks.map(t => t.startDate.getTime()).filter(d => !isNaN(d));
        const taskEndDates = this.tasks.map(t => t.dueDate.getTime()).filter(d => !isNaN(d));

        if (taskStartDates.length === 0 || taskEndDates.length === 0) {
          return { dates: [], startDate: new Date() };
        }

        const minTaskDate = new Date(Math.min(...taskStartDates));
        const maxTaskDate = new Date(Math.max(...taskEndDates));

        // Add padding in days
        const padBefore = 7;
        const padAfter = 14;

        const start = new Date(minTaskDate);
        start.setDate(start.getDate() - padBefore);
        const end = new Date(maxTaskDate);
        end.setDate(end.getDate() + padAfter);

        const dates = [];
        const cursor = new Date(start);
        let dayCount = 0;
        const maxDays = 1000; // Safety limit to prevent infinite loops

        while (cursor <= end && dayCount < maxDays) {
          dates.push({
            iso: cursor.toISOString().slice(0, 10),
            day: cursor.getDate(),
            dayName: cursor.toLocaleString(undefined, { weekday: 'short' }).toUpperCase(),
            monthName: cursor.toLocaleString(undefined, { month: 'short' }),
            monthStart: cursor.getDate() === 1,
            year: cursor.getFullYear()
          });
          cursor.setDate(cursor.getDate() + 1);
          dayCount++;
        }
        return { dates, startDate: start };
      }

      // MONTH VIEW: create one column per month between padded start/end
      const taskStartDates = this.tasks.map(t => t.startDate.getTime()).filter(d => !isNaN(d));
      const taskEndDates = this.tasks.map(t => t.dueDate.getTime()).filter(d => !isNaN(d));

      if (taskStartDates.length === 0 || taskEndDates.length === 0) {
        return { dates: [], startDate: new Date() };
      }

      const minTaskDate = new Date(Math.min(...taskStartDates));
      const maxTaskDate = new Date(Math.max(...taskEndDates));

      // Pad in months
      const padBeforeMonths = 1; // show previous month
      const padAfterMonths = 1; // show next month

      const start = new Date(minTaskDate.getFullYear(), minTaskDate.getMonth(), 1);
      start.setMonth(start.getMonth() - padBeforeMonths);

      const end = new Date(maxTaskDate.getFullYear(), maxTaskDate.getMonth(), 1);
      end.setMonth(end.getMonth() + padAfterMonths);

      const dates = [];
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      let monthCount = 0;
      const maxMonths = 120; // Safety limit (10 years max)

      while (cursor <= end && monthCount < maxMonths) {
        const year = cursor.getFullYear();
        const month = cursor.getMonth();
        const monthName = cursor.toLocaleString(undefined, { month: 'short' });
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        dates.push({
          iso: `${year}-${String(month + 1).padStart(2, '0')}`,
          monthIndex: month,
          monthName,
          monthStart: true,
          year,
          daysInMonth
        });
        cursor.setMonth(cursor.getMonth() + 1);
        monthCount++;
      }

      return { dates, startDate: start };
    },
    getDayWidth() {
      // Determine column width depending on view
      const screenWidth = window.innerWidth;
      if (this.currentView === 'week') {
        return screenWidth < 576 ? 50 : 60;
      }
      // month view - use wider columns sized to represent an entire month
      return screenWidth < 576 ? 120 : 160;
    },
    dateDiffDays(a, b) {
      const ms = 24 * 60 * 60 * 1000;
      return Math.round((b - a) / ms);
    },
    getTaskBarStyle(task) {
      if (!this.timelineStart || !this.dates.length) return {};

      if (this.currentView === 'week') {
        const startOffset = this.dateDiffDays(this.timelineStart, task.startDate);
        const duration = Math.max(1, this.dateDiffDays(task.startDate, task.dueDate) + 1);
        const left = startOffset * this.dayWidth;
        const width = duration * this.dayWidth - 8;
        return {
          left: left + 'px',
          width: width + 'px'
        };
      }

      // month view - calculate offsets/duration in months
      const monthDiff = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

      const timelineMonthStart = new Date(this.timelineStart.getFullYear(), this.timelineStart.getMonth(), 1);
      const taskStartMonth = new Date(task.startDate.getFullYear(), task.startDate.getMonth(), 1);
      const taskEndMonth = new Date(task.dueDate.getFullYear(), task.dueDate.getMonth(), 1);

      const offsetMonths = monthDiff(timelineMonthStart, taskStartMonth);
      // include partial months by rounding up end difference +1 to be inclusive
      const durationMonths = Math.max(1, monthDiff(taskStartMonth, taskEndMonth) + 1);

      const left = offsetMonths * this.dayWidth;
      const width = durationMonths * this.dayWidth - 12;

      return {
        left: left + 'px',
        width: width + 'px'
      };
    },
    focusOnTask(taskId, taskIndex) {
      this.highlightedTaskId = taskId;
      const timelineContent = this.$refs.timelineContent;
      this.$nextTick(() => {
        const bar = this.$el.querySelector(`.task-bar[data-task-id=\"${taskId}\"]`);
        if (!bar || !timelineContent) return;
        const taskBarLeft = bar.offsetLeft;
        const taskBarWidth = bar.offsetWidth;
        const containerWidth = timelineContent.clientWidth;
        const targetScrollLeft = taskBarLeft + taskBarWidth / 2 - containerWidth / 2;
        const targetScrollTop = taskIndex * this.rowHeight - timelineContent.clientHeight / 2 + this.rowHeight / 2;
        timelineContent.scrollTo({ left: Math.max(0, targetScrollLeft), top: Math.max(0, targetScrollTop), behavior: 'smooth' });
        bar.classList.add('pulse');
        setTimeout(() => bar.classList.remove('pulse'), 2000);
      });
    },
    onTimelineScroll(e) {
      const header = this.$refs.timelineHeaderContent;
      const content = this.$refs.timelineContent;
      if (header && content) header.style.transform = `translateX(-${content.scrollLeft}px)`;
    },
    showTooltip(event, task) {
      this.tooltip.title = task.name;
      this.tooltip.assigned = task.assignedMembers && task.assignedMembers.length > 0
        ? task.assignedMembers.join(', ')
        : 'No members assigned';
      this.tooltip.completion = task.completionRate ? `${task.completionRate}% (${task.submittedCount}/${task.assignedMembers.length})` : '';
      this.tooltip.style = { left: event.clientX + 12 + 'px', top: event.clientY + 12 + 'px' };
      this.tooltip.show = true;
    },
    hideTooltip() {
      this.tooltip.show = false;
    },
    showTaskModal(taskId) {
      const t = this.tasks.find(x => x.id === taskId);
      if (!t) return;
      this.modal.task = t;
      this.modal.show = true;
    },
    closeModal() {
      this.modal.show = false;
      this.modal.task = null;
    },
    formatDate(date) {
      if (!date) return 'Not set';
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'Invalid date';
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    },
    parseDate(dateString) {
      if (!dateString) return new Date();
      
      // Handle various date formats and fix 2-digit year issues
      let date = new Date(dateString);
      
      // Check if the year is less than 100 (which means it was interpreted as 19xx)
      // and the original string contains a 2-digit year that should be 20xx
      if (date.getFullYear() < 1950) {
        // Try to parse the date string and fix 2-digit years
        const dateStr = String(dateString);
        
        // Look for patterns like "Jan 31, 21" or similar 2-digit years
        const twoDigitYearMatch = dateStr.match(/(\w+\s+\d{1,2},?\s+)(\d{2})$/);
        if (twoDigitYearMatch) {
          const yearPart = parseInt(twoDigitYearMatch[2]);
          // Assume years 00-30 are 2000-2030, years 31-99 are 1931-1999
          const fullYear = yearPart <= 30 ? 2000 + yearPart : 1900 + yearPart;
          const newDateStr = twoDigitYearMatch[1] + fullYear;
          date = new Date(newDateStr);
        }
        
        // Also handle formats like "21-01-31" or "21/01/31"
        const shortYearMatch = dateStr.match(/^(\d{2})[-\/](\d{1,2})[-\/](\d{1,2})$/);
        if (shortYearMatch) {
          const year = parseInt(shortYearMatch[1]);
          const month = parseInt(shortYearMatch[2]) - 1; // Month is 0-based
          const day = parseInt(shortYearMatch[3]);
          const fullYear = year <= 30 ? 2000 + year : 1900 + year;
          date = new Date(fullYear, month, day);
        }
      }
      
      return date;
    }
  }
};
</script>

<style>
/* Paste of roadmap-styles.css (kept unscoped so it matches original classes) */
:root { --roadmap-bg: #f8f9fc; --roadmap-white: #ffffff; --roadmap-border: #e1e5e9; --roadmap-text: #2d3436; --roadmap-text-muted: #636e72; --roadmap-primary: #4285f4; --status-not-started: #9ca3af; --status-pending: #f59e0b; --status-overdue: #ef4444; --status-completed: #10b981; --priority-low: #6b7280; --priority-medium: #f59e0b; --priority-high: #ef4444; }
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: var(--roadmap-bg); margin: 0; padding: 20px; }
.roadmap-container { background: var(--roadmap-white); border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
.roadmap-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 30px; border-bottom: 1px solid var(--roadmap-border); background: var(--roadmap-white); }
.roadmap-title { font-size: 28px; font-weight: 600; color: var(--roadmap-text); margin: 0; }
.view-controls { display: flex; align-items: center; gap: 10px; }
.view-label { color: var(--roadmap-text-muted); font-weight: 500; font-size: 14px; }
.view-controls .btn { border-radius: 6px; padding: 8px 16px; font-weight: 500; border: none; transition: all 0.2s ease; }
.view-controls .btn.active { background: var(--roadmap-primary); color: white; }
.view-controls .btn:not(.active) { background: #f1f3f4; color: var(--roadmap-text); }
.view-controls .btn:hover:not(.active) { background: #e8eaed; }
.roadmap-content { display: flex; height: 600px; }
.task-list-header { padding: 20px 25px 15px; border-bottom: 1px solid var(--roadmap-border); background: #fafbfc; }
.task-list-header h3 { font-size: 14px; font-weight: 600; color: var(--roadmap-text-muted); margin: 0; letter-spacing: 0.5px; }
.task-list { flex: 1; overflow-y: auto; padding: 0; }
.task-item { display: flex; align-items: center; padding: 15px 25px; border-bottom: 1px solid #f1f3f4; cursor: pointer; transition: background-color 0.2s ease; position: relative; }
.task-item:hover { background-color: #f8f9fa; }
.task-item:last-child { border-bottom: none; }
.task-item.highlighted { background-color: #e3f2fd; border-left: 4px solid var(--roadmap-primary); padding-left: 21px; }
.task-priority { width: 8px; height: 8px; border-radius: 50%; margin-right: 12px; flex-shrink: 0; }
.task-priority.low { background-color: var(--priority-low); }
.task-priority.medium { background-color: var(--priority-medium); }
.task-priority.high { background-color: var(--priority-high); }
.task-info { flex: 1; }
.task-name { font-size: 14px; font-weight: 500; color: var(--roadmap-text); margin: 0 0 4px 0; line-height: 1.4; }
.task-priority-label { font-size: 12px; color: var(--roadmap-text-muted); text-transform: uppercase; letter-spacing: 0.3px; font-weight: 500; }
.timeline-container { flex: 1; display: flex; flex-direction: column; background: var(--roadmap-white); overflow: hidden; position: relative; }
.timeline-header { display: flex; border-bottom: 1px solid var(--roadmap-border); background: #fafbfc; height: 60px; overflow-x: hidden; position: relative; }
.timeline-header-content { display: flex; transition: transform 0.05s ease-out; width: fit-content; }
.timeline-day { min-width: 60px; width: 60px; padding: 8px 4px; text-align: center; border-right: 1px solid #f1f3f4; display: flex; flex-direction: column; justify-content: center; flex-shrink: 0; }
.timeline-day:last-child { border-right: none; }
.timeline-day.month-start { border-left: 2px solid var(--roadmap-primary); position: relative; }
.month-label { position: absolute; top: -20px; left: 8px; font-size: 14px; font-weight: 600; color: var(--roadmap-text); white-space: nowrap; z-index: 2; }
.day-number { font-size: 16px; font-weight: 500; color: var(--roadmap-text); margin-bottom: 2px; }
.day-name { font-size: 11px; color: var(--roadmap-text-muted); text-transform: uppercase; letter-spacing: 0.3px; }
.month-name { font-size: 14px; font-weight: 600; color: var(--roadmap-text); margin-bottom: 2px; }
.timeline-content { flex: 1; overflow-x: auto; overflow-y: auto; position: relative; scroll-behavior: smooth; }
.timeline-grid { position: relative; min-width: fit-content; }
.timeline-row { display: flex; height: 61px; border-bottom: 1px solid #f1f3f4; align-items: center; position: relative; }
.timeline-row:last-child { border-bottom: none; }
.grid-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }
.grid-line-vertical { position: absolute; top: 0; width: 1px; height: 100%; background-color: #f1f3f4; }
.grid-line-vertical.month-start { background-color: var(--roadmap-border); width: 2px; }
.grid-line-horizontal { position: absolute; left: 0; width: 100%; height: 1px; background-color: #f1f3f4; pointer-events: none; }
.task-bar-container { position: relative; height: 40px; display: flex; align-items: center; z-index: 2; }
.task-bar { height: 24px; border-radius: 12px; position: absolute; display: flex; align-items: center; padding: 0 12px; font-size: 12px; font-weight: 500; color: white; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.task-bar:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
.task-bar.not-started { background-color: var(--status-not-started); }
.task-bar.pending { background-color: var(--status-pending); }
.task-bar.overdue { background-color: var(--status-overdue); }
.task-bar.completed { background-color: var(--status-completed); }
.timeline-row.highlighted { background-color: rgba(66,133,244,0.05); }
@keyframes pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(66,133,244,0.7); } 50% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(66,133,244,0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(66,133,244,0); } }
.task-bar.pulse { animation: pulse 2s ease-out; }
.custom-tooltip { position: absolute; background: rgba(33,33,33,0.95); color: white; padding: 12px 16px; border-radius: 8px; font-size: 13px; line-height: 1.4; z-index: 1000; pointer-events: none; opacity: 0; transition: opacity 0.2s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 300px; }
.custom-tooltip.show { opacity: 1; }
.tooltip-content .tooltip-title { font-weight: 600; margin-bottom: 4px; }
.tooltip-content .tooltip-detail { margin: 2px 0; font-size: 12px; opacity: 0.9; }
.modal-content { border: none; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
.modal-header { border-bottom: 1px solid var(--roadmap-border); padding: 24px 30px 20px; }
.modal-title { font-size: 20px; font-weight: 600; color: var(--roadmap-text); }
.modal-body { padding: 30px; }
.detail-section { margin-bottom: 24px; }
.detail-section:last-child { margin-bottom: 0; }
.detail-label { font-size: 14px; font-weight: 600; color: var(--roadmap-text); margin-bottom: 8px; display: block; }
.detail-value { font-size: 14px; color: var(--roadmap-text-muted); line-height: 1.5; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
.priority-badge { display: inline-block; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; color: white; }
.members-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.member-item { background: #f1f3f4; padding: 6px 12px; border-radius: 16px; font-size: 13px; color: var(--roadmap-text); }
.header-controls { position: absolute; right: 16px; top: 8px; display: flex; gap: 8px; align-items: center; z-index: 20; }
.header-controls .btn { padding: 6px 10px; font-size: 13px; border-radius: 8px; }
.timeline-content::-webkit-scrollbar { display: none; }
</style>
