#include "TaskManager.h"
#include "FileManager.h"
#include "PriorityManager.h"
#include <chrono>
#include <ctime>
#include <iomanip>
#include <algorithm>
#include <iostream>

// Helper to get current date in YYYY-MM-DD format
static std::string getCurrentDate() {
    auto now = std::chrono::system_clock::now();
    std::time_t now_c = std::chrono::system_clock::to_time_t(now);
    std::tm parts;
    localtime_r(&now_c, &parts); // safe on macOS
    std::stringstream ss;
    ss << std::put_time(&parts, "%Y-%m-%d");
    return ss.str();
}

// Helper partition function for Quick Sort
static int partitionDueDate(std::vector<Task>& arr, int low, int high) {
    auto compareDates = [](const std::string& d1, const std::string& d2) {
        if (d1.empty()) return false; // Put empty dates at the end
        if (d2.empty()) return true;
        return d1 < d2;
    };
    Task pivot = arr[high];
    int i = (low - 1);
    for (int j = low; j < high; ++j) {
        if (compareDates(arr[j].dueDate, pivot.dueDate)) {
            i++;
            std::swap(arr[i], arr[j]);
        }
    }
    std::swap(arr[i + 1], arr[high]);
    return (i + 1);
}

TaskManager::TaskManager(const std::string& filename) : dbFilename(filename), nextId(1) {
    tasks = FileManager::loadTasks(dbFilename);
    updateNextId();
}

void TaskManager::saveToDb() {
    FileManager::saveTasks(tasks, dbFilename);
}

void TaskManager::updateNextId() {
    int maxId = 0;
    for (const auto& task : tasks) {
        if (task.id > maxId) {
            maxId = task.id;
        }
    }
    nextId = maxId + 1;
}

Task TaskManager::addTask(const Task& t) {
    Task newTask = t;
    newTask.id = nextId++;
    newTask.status = "Pending";
    if (newTask.createdDate.empty()) {
        newTask.createdDate = getCurrentDate();
    }
    tasks.push_back(newTask);
    saveToDb();
    return newTask;
}

bool TaskManager::updateTask(int id, const Task& updatedTask) {
    for (auto& task : tasks) {
        if (task.id == id) {
            task.title = updatedTask.title;
            task.description = updatedTask.description;
            task.priority = updatedTask.priority;
            task.dueDate = updatedTask.dueDate;
            // status and createdDate are typically preserved unless explicitly overwritten
            if (!updatedTask.status.empty()) {
                task.status = updatedTask.status;
            }
            saveToDb();
            return true;
        }
    }
    return false;
}

bool TaskManager::deleteTask(int id) {
    for (auto it = tasks.begin(); it != tasks.end(); ++it) {
        if (it->id == id) {
            tasks.erase(it);
            saveToDb();
            return true;
        }
    }
    return false;
}

bool TaskManager::completeTask(int id) {
    for (auto& task : tasks) {
        if (task.id == id) {
            task.status = "Completed";
            saveToDb();
            return true;
        }
    }
    return false;
}

Task TaskManager::executeHighestPriorityTask(bool& success) {
    auto pq = PriorityManager::buildPriorityQueue(tasks);
    if (pq.empty()) {
        success = false;
        return Task();
    }

    Task highest = pq.top();
    success = completeTask(highest.id);
    if (success) {
        // Return the task with completed status updated
        highest.status = "Completed";
        return highest;
    }
    return Task();
}

std::vector<Task> TaskManager::getAllTasks() const {
    return tasks;
}

std::vector<Task> TaskManager::getPendingTasks() const {
    std::vector<Task> pending;
    for (const auto& task : tasks) {
        if (task.status == "Pending") {
            pending.push_back(task);
        }
    }
    return pending;
}

std::vector<Task> TaskManager::getCompletedTasks() const {
    std::vector<Task> completed;
    for (const auto& task : tasks) {
        if (task.status == "Completed") {
            completed.push_back(task);
        }
    }
    return completed;
}

// DSA Binary Search (Expects sorted array. Since IDs are auto-incremented, tasks is naturally sorted by ID)
Task TaskManager::searchById(int id, bool& found) const {
    int low = 0;
    int high = tasks.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (tasks[mid].id == id) {
            found = true;
            return tasks[mid];
        }
        if (tasks[mid].id < id) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    found = false;
    return Task();
}

// DSA Linear Search
std::vector<Task> TaskManager::searchByName(const std::string& query) const {
    std::string lowerQuery = query;
    std::transform(lowerQuery.begin(), lowerQuery.end(), lowerQuery.begin(), ::tolower);
    std::vector<Task> results;

    for (const auto& task : tasks) {
        std::string lowerTitle = task.title;
        std::transform(lowerTitle.begin(), lowerTitle.end(), lowerTitle.begin(), ::tolower);
        if (lowerTitle.find(lowerQuery) != std::string::npos) {
            results.push_back(task);
        }
    }
    return results;
}

// DSA Sorting dispatcher
std::vector<Task> TaskManager::getSortedTasks(const std::string& sortBy) const {
    std::vector<Task> tempTasks = tasks;
    if (tempTasks.empty()) return tempTasks;

    if (sortBy == "Name") {
        bubbleSortByName(tempTasks);
    } else if (sortBy == "DueDate") {
        quickSortByDueDate(tempTasks, 0, tempTasks.size() - 1);
    } else if (sortBy == "Priority") {
        insertionSortByPriority(tempTasks);
    }
    return tempTasks;
}

// Custom DSA Bubble Sort
void TaskManager::bubbleSortByName(std::vector<Task>& arr) {
    int n = arr.size();
    for (int i = 0; i < n - 1; ++i) {
        for (int j = 0; j < n - i - 1; ++j) {
            std::string titleA = arr[j].title;
            std::string titleB = arr[j + 1].title;
            std::transform(titleA.begin(), titleA.end(), titleA.begin(), ::tolower);
            std::transform(titleB.begin(), titleB.end(), titleB.begin(), ::tolower);
            if (titleA > titleB) {
                std::swap(arr[j], arr[j + 1]);
            }
        }
    }
}

// Custom DSA Quick Sort
void TaskManager::quickSortByDueDate(std::vector<Task>& arr, int low, int high) {
    if (low < high) {
        int pi = partitionDueDate(arr, low, high);
        quickSortByDueDate(arr, low, pi - 1);
        quickSortByDueDate(arr, pi + 1, high);
    }
}

// Custom DSA Insertion Sort
void TaskManager::insertionSortByPriority(std::vector<Task>& arr) {
    int n = arr.size();
    auto getWeight = [](const std::string& p) {
        if (p == "High") return 3;
        if (p == "Medium") return 2;
        return 1; // "Low"
    };

    for (int i = 1; i < n; ++i) {
        Task key = arr[i];
        int keyWeight = getWeight(key.priority);
        int j = i - 1;
        while (j >= 0 && getWeight(arr[j].priority) < keyWeight) {
            arr[j + 1] = arr[j];
            j = j - 1;
        }
        arr[j + 1] = key;
    }
}

crow::json::wvalue TaskManager::getStatistics() const {
    int total = tasks.size();
    int pending = 0;
    int completed = 0;
    int high = 0;
    int medium = 0;
    int low = 0;

    for (const auto& task : tasks) {
        if (task.status == "Completed") {
            completed++;
        } else {
            pending++;
        }

        if (task.priority == "High") {
            high++;
        } else if (task.priority == "Medium") {
            medium++;
        } else {
            low++;
        }
    }

    crow::json::wvalue j;
    j["total"] = total;
    j["pending"] = pending;
    j["completed"] = completed;
    j["high"] = high;
    j["medium"] = medium;
    j["low"] = low;
    return j;
}
