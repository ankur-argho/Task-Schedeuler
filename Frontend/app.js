// app.js - Unified Frontend Controller for C++ Backend Task Scheduler

const API_BASE = "http://localhost:18080";

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeToggleUI(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeToggleUI(newTheme);
}

function updateThemeToggleUI(theme) {
    const toggleText = document.getElementById("theme-toggle-text");
    const toggleIcon = document.getElementById("theme-toggle-icon");
    if (!toggleText) return;

    if (theme === "light") {
        toggleText.textContent = "Dark Mode";
        toggleIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
    } else {
        toggleText.textContent = "Light Mode";
        toggleIcon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
    }
}

// Toast Notifications System
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-msg toast-${type}`;
    
    // Icon based on type
    const icon = type === "success" 
        ? `<svg viewBox="0 0 24 24" width="20" height="20" stroke="#10b981" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>`
        : `<svg viewBox="0 0 24 24" width="20" height="20" stroke="#ef4444" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

    toast.innerHTML = `
        <div class="toast-content">
            ${icon}
            <span class="toast-text">${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
    `;

    container.appendChild(toast);

    // Auto dismiss after 3500ms
    setTimeout(() => {
        toast.classList.add("toast-out");
        toast.addEventListener("animationend", () => {
            toast.remove();
        });
    }, 3500);
}

// Dialogue light-dismiss fallback for unsupported browsers
function setupDialogDismissFallback(dialog) {
    if (!dialog) return;
    
    // Check if browser natively supports closedby
    if (!('closedBy' in HTMLDialogElement.prototype)) {
        dialog.addEventListener('click', (event) => {
            if (event.target !== dialog) return;

            const rect = dialog.getBoundingClientRect();
            const isInsideContent = (
                rect.top <= event.clientY &&
                event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX &&
                event.clientX <= rect.left + rect.width
            );

            if (!isInsideContent) {
                dialog.close();
            }
        });
    }
}

// API Functions
async function fetchStatistics() {
    try {
        const res = await fetch(`${API_BASE}/statistics`);
        if (!res.ok) throw new Error("Failed to load statistics");
        const stats = await res.json();
        
        // Update Stats UI if elements exist
        updateMetricElement("stat-total", stats.total);
        updateMetricElement("stat-pending", stats.pending);
        updateMetricElement("stat-completed", stats.completed);
        updateMetricElement("stat-high", stats.high);

        // Sidebar stats
        updateMetricElement("sidebar-pending-count", stats.pending);

        return stats;
    } catch (err) {
        console.error(err);
        showToast("Error updating dashboard statistics", "error");
    }
}

function updateMetricElement(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value !== undefined ? value : "0";
    }
}

async function executeHighestPriorityTask() {
    const executeBtn = document.getElementById("execute-priority-btn");
    if (executeBtn) executeBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/executePriorityTask`, {
            method: "POST"
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Execution failed");
        }

        const task = await res.json();

        // Trigger Success Checkmark Overlay Animation
        const overlay = document.getElementById("success-overlay");
        const taskTitleEl = document.getElementById("executed-task-title");
        if (overlay && taskTitleEl) {
            taskTitleEl.textContent = task.title;
            overlay.classList.add("active");

            // Play checkmark animation, dismiss overlay after 2 seconds
            setTimeout(() => {
                overlay.classList.remove("active");
                refreshPageData();
            }, 2300);
        } else {
            showToast(`Executed Task: ${task.title}`);
            refreshPageData();
        }

    } catch (err) {
        showToast(err.message, "error");
    } finally {
        if (executeBtn) executeBtn.disabled = false;
    }
}

async function markTaskComplete(id) {
    try {
        const res = await fetch(`${API_BASE}/completeTask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: parseInt(id) })
        });

        if (!res.ok) throw new Error("Could not complete task");
        
        showToast("Task completed and archived!");
        refreshPageData();
    } catch (err) {
        showToast(err.message, "error");
    }
}

let deleteTaskId = null;

function deleteTask(id) {
    deleteTaskId = id;
    const dialog = document.getElementById("delete-confirm-dialog");
    if (dialog) {
        dialog.showModal();
    } else {
        if (confirm("Are you sure you want to permanently delete this task?")) {
            executeDelete(id);
        }
    }
}

async function executeDelete(id) {
    try {
        const res = await fetch(`${API_BASE}/tasks/${id}`, {
            method: "DELETE"
        });

        if (!res.ok) throw new Error("Could not delete task");

        showToast("Task deleted successfully");
        const dialog = document.getElementById("delete-confirm-dialog");
        if (dialog && dialog.open) {
            dialog.close();
        }
        refreshPageData();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// Global Refresh Helper
function refreshPageData() {
    fetchStatistics();
    
    // Check which page is currently open and trigger its loader
    const path = window.location.pathname;
    if (path.includes("tasks.html")) {
        loadTasksTab();
    } else if (path.includes("completed.html")) {
        loadCompletedTab();
    } else if (path.includes("statistics.html")) {
        loadStatisticsTab();
    } else {
        // Home dashboard
        loadDashboardTab();
    }
}

// ================= PAGE INITIALIZERS =================

// 1. HOME DASHBOARD INITIALIZER
async function loadDashboardTab() {
    const todayList = document.getElementById("today-task-list");
    const upcomingList = document.getElementById("upcoming-task-list");
    if (!todayList || !upcomingList) return;

    todayList.innerHTML = '<div class="no-tasks">Loading tasks...</div>';
    upcomingList.innerHTML = '<div class="no-tasks">Loading tasks...</div>';

    try {
        const res = await fetch(`${API_BASE}/tasks`);
        if (!res.ok) throw new Error("Failed to fetch pending tasks");
        const tasks = await res.json();

        const today = new Date().toISOString().split('T')[0];

        const todayTasks = tasks.filter(t => t.dueDate === today);
        const upcomingTasks = tasks.filter(t => t.dueDate > today || !t.dueDate);

        renderTasksMini(todayTasks, todayList, "No tasks due today.");
        renderTasksMini(upcomingTasks, upcomingList, "No upcoming tasks.");

    } catch (err) {
        console.error(err);
        todayList.innerHTML = '<div class="no-tasks">Failed to load tasks</div>';
        upcomingList.innerHTML = '<div class="no-tasks">Failed to load tasks</div>';
    }
}

function renderTasksMini(tasks, container, emptyMsg) {
    if (tasks.length === 0) {
        container.innerHTML = `<div class="no-tasks">${emptyMsg}</div>`;
        return;
    }

    container.innerHTML = "";
    tasks.forEach(task => {
        const card = document.createElement("div");
        card.className = "task-card";
        card.innerHTML = `
            <div class="task-card-left">
                <div class="task-checkbox-wrapper">
                    <input type="checkbox" class="custom-checkbox" onchange="markTaskComplete(${task.id})">
                </div>
                <div class="task-details">
                    <span class="task-title">${escapeHTML(task.title)}</span>
                    <span class="task-desc">${escapeHTML(task.description)}</span>
                    <div class="task-meta">
                        <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
                        ${task.dueDate ? `
                        <span class="meta-item">
                            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            ${task.dueDate}
                        </span>` : ""}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// 2. TASKS ARCHIVE/MANAGEMENT TAB INITIALIZER
let activeSort = "";
async function loadTasksTab(searchQuery = "") {
    const listContainer = document.getElementById("main-task-list");
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="no-tasks">Loading tasks...</div>';

    try {
        let url = searchQuery 
            ? `${API_BASE}/search?q=${encodeURIComponent(searchQuery)}`
            : `${API_BASE}/tasks`;
        
        // Add sorting params if sorting is active
        if (!searchQuery && activeSort) {
            url += `?sortBy=${activeSort}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load tasks");
        let tasks = await res.json();

        // If performing search, C++ search returns all hits. We only display pending tasks on this view.
        if (searchQuery) {
            tasks = tasks.filter(t => t.status === "Pending");
        }

        renderFullTaskList(tasks, listContainer);
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = '<div class="no-tasks">Error loading tasks from C++ backend</div>';
    }
}

function renderFullTaskList(tasks, container) {
    if (tasks.length === 0) {
        container.innerHTML = '<div class="no-tasks">No pending tasks found. Click "Add Task" to get started!</div>';
        return;
    }

    container.innerHTML = "";
    tasks.forEach(task => {
        const card = document.createElement("div");
        card.className = "task-card";
        card.innerHTML = `
            <div class="task-card-left">
                <div class="task-checkbox-wrapper">
                    <input type="checkbox" class="custom-checkbox" onchange="markTaskComplete(${task.id})">
                </div>
                <div class="task-details">
                    <span class="task-title">
                        <span style="color: var(--text-muted); font-size: 0.8rem; font-family: monospace;">#${task.id}</span> 
                        ${escapeHTML(task.title)}
                    </span>
                    <span class="task-desc">${escapeHTML(task.description)}</span>
                    <div class="task-meta">
                        <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
                        ${task.dueDate ? `
                        <span class="meta-item">
                            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            Due: ${task.dueDate}
                        </span>` : ""}
                        <span class="meta-item">Created: ${task.createdDate}</span>
                    </div>
                </div>
            </div>
            <div class="task-card-right">
                <button class="action-icon-btn" onclick="openEditModal(${JSON.stringify(task).replace(/"/g, '&quot;')})" title="Edit Task">
                    <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="action-icon-btn btn-delete-hover" onclick="deleteTask(${task.id})" title="Delete Task">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function handleSortChange(sortBy) {
    activeSort = sortBy;
    loadTasksTab();
}

// Add Task Form Handler
async function handleAddTask(event) {
    event.preventDefault();
    const title = document.getElementById("task-title-input").value;
    const description = document.getElementById("task-desc-input").value;
    const priority = document.getElementById("task-priority-input").value;
    const dueDate = document.getElementById("task-date-input").value;

    try {
        const res = await fetch(`${API_BASE}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description, priority, dueDate })
        });

        if (!res.ok) throw new Error("Could not add task to backend");

        showToast("Task added successfully!");
        document.getElementById("add-task-dialog").close();
        document.getElementById("add-task-form").reset();
        refreshPageData();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// Edit Task Form Handler
let currentEditId = null;
function openEditModal(task) {
    currentEditId = task.id;
    document.getElementById("edit-task-title-input").value = task.title;
    document.getElementById("edit-task-desc-input").value = task.description;
    document.getElementById("edit-task-priority-input").value = task.priority;
    document.getElementById("edit-task-date-input").value = task.dueDate;
    document.getElementById("edit-task-dialog").showModal();
}

async function handleEditTask(event) {
    event.preventDefault();
    if (!currentEditId) return;

    const title = document.getElementById("edit-task-title-input").value;
    const description = document.getElementById("edit-task-desc-input").value;
    const priority = document.getElementById("edit-task-priority-input").value;
    const dueDate = document.getElementById("edit-task-date-input").value;

    try {
        const res = await fetch(`${API_BASE}/tasks/${currentEditId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description, priority, dueDate })
        });

        if (!res.ok) throw new Error("Could not update task");

        showToast("Task updated successfully!");
        document.getElementById("edit-task-dialog").close();
        refreshPageData();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// 3. COMPLETED ARCHIVE INITIALIZER
async function loadCompletedTab() {
    const container = document.getElementById("completed-task-list");
    if (!container) return;

    container.innerHTML = '<tr><td colspan="5" class="no-tasks">Loading completed tasks...</td></tr>';

    try {
        const res = await fetch(`${API_BASE}/completedTasks`);
        if (!res.ok) throw new Error("Failed to load completed tasks");
        const tasks = await res.json();

        if (tasks.length === 0) {
            container.innerHTML = '<tr><td colspan="5" class="no-tasks">No completed tasks yet. Keep up the good work!</td></tr>';
            return;
        }

        container.innerHTML = "";
        tasks.forEach(task => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="font-family: monospace; color: var(--text-muted)">#${task.id}</td>
                <td><strong style="text-decoration: line-through; opacity: 0.65;">${escapeHTML(task.title)}</strong></td>
                <td><span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span></td>
                <td style="color: var(--text-muted)">${task.dueDate || "-"}</td>
                <td>
                    <button class="action-icon-btn btn-delete-hover" onclick="deleteTask(${task.id})" title="Delete Archive Item">
                        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </td>
            `;
            container.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = '<tr><td colspan="5" class="no-tasks">Error loading completed tasks</td></tr>';
    }
}

// 4. STATISTICS/CHARTS TAB INITIALIZER
let statusChart = null;
let priorityChart = null;

async function loadStatisticsTab() {
    const canvasStatus = document.getElementById("statusChart");
    const canvasPriority = document.getElementById("priorityChart");
    if (!canvasStatus || !canvasPriority) return;

    // Load Chart.js dynamically from CDN if not already loaded, then draw
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = async () => {
            drawCharts();
        };
        document.head.appendChild(script);
    } else {
        drawCharts();
    }
}

async function drawCharts() {
    const stats = await fetchStatistics();
    if (!stats) return;

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textColour = isDark ? "#94a3b8" : "#475569";
    const borderColour = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)";

    // Destroy existing charts to reload clean transitions
    if (statusChart) statusChart.destroy();
    if (priorityChart) priorityChart.destroy();

    // 1. Status Chart (Doughnut)
    const ctxStatus = document.getElementById("statusChart").getContext("2d");
    statusChart = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Completed'],
            datasets: [{
                data: [stats.pending, stats.completed],
                backgroundColor: [
                    'rgba(245, 158, 11, 0.75)', // Pending Amber
                    'rgba(16, 185, 129, 0.75)'  // Completed Emerald
                ],
                borderColor: isDark ? '#111827' : '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColour, font: { family: 'Inter', weight: 500 } }
                }
            }
        }
    });

    // 2. Priority Chart (Bar)
    const ctxPriority = document.getElementById("priorityChart").getContext("2d");
    priorityChart = new Chart(ctxPriority, {
        type: 'bar',
        data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                label: 'Tasks Count',
                data: [stats.high, stats.medium, stats.low],
                backgroundColor: [
                    'rgba(244, 63, 94, 0.75)',  // High priority - Rose
                    'rgba(251, 191, 36, 0.75)', // Medium priority - Amber
                    'rgba(52, 211, 153, 0.75)'  // Low priority - Emerald
                ],
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: textColour, font: { family: 'Inter' } }
                },
                y: {
                    grid: { color: borderColour },
                    ticks: { 
                        color: textColour, 
                        font: { family: 'Inter' },
                        stepSize: 1,
                        precision: 0 
                    }
                }
            }
        }
    });
}

// Utility: HTML Escaper
function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Bootstrapping the page layout on DOM Content Loaded
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    fetchStatistics();

    // Check currently loaded page
    const path = window.location.pathname;
    if (path.includes("tasks.html")) {
        loadTasksTab();
        
        // Form bindings
        const addForm = document.getElementById("add-task-form");
        if (addForm) addForm.addEventListener("submit", handleAddTask);

        const editForm = document.getElementById("edit-task-form");
        if (editForm) editForm.addEventListener("submit", handleEditTask);

        // Modal triggers
        const addBtn = document.getElementById("open-add-dialog-btn");
        const addDialog = document.getElementById("add-task-dialog");
        if (addBtn && addDialog) {
            addBtn.addEventListener("click", () => addDialog.showModal());
            setupDialogDismissFallback(addDialog);
        }

        const editDialog = document.getElementById("edit-task-dialog");
        if (editDialog) {
            setupDialogDismissFallback(editDialog);
        }

        // Sorting binding
        const sortSelect = document.getElementById("sort-by-select");
        if (sortSelect) {
            sortSelect.addEventListener("change", (e) => handleSortChange(e.target.value));
        }

    } else if (path.includes("completed.html")) {
        loadCompletedTab();
    } else if (path.includes("statistics.html")) {
        loadStatisticsTab();
    } else if (path.includes("about.html")) {
        // About page needs no complex dynamic state loading other than sidebar counters
    } else {
        // Home dashboard
        loadDashboardTab();

        // Priority task execute button binding
        const execBtn = document.getElementById("execute-priority-btn");
        if (execBtn) {
            execBtn.addEventListener("click", executeHighestPriorityTask);
        }
    }

    // Global Search bindings (present in sidebar navbar area on all files)
    const searchInput = document.getElementById("global-search-input");
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();

            debounceTimer = setTimeout(() => {
                // If we are not on the tasks page, redirect to tasks page with search parameter
                if (!window.location.pathname.includes("tasks.html")) {
                    window.location.href = `tasks.html?search=${encodeURIComponent(query)}`;
                } else {
                    loadTasksTab(query);
                }
            }, 300);
        });

        // Handle search query parameter when loaded via redirect
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get("search");
        if (searchParam && window.location.pathname.includes("tasks.html")) {
            searchInput.value = searchParam;
            loadTasksTab(searchParam);
            // Clean up the URL parameter
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Custom Delete dialog bindings
        const deleteDialog = document.getElementById("delete-confirm-dialog");
        const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
        if (deleteDialog) {
            setupDialogDismissFallback(deleteDialog);
        }
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener("click", () => {
                if (deleteTaskId !== null) {
                    executeDelete(deleteTaskId);
                }
            });
        }
    }
});
