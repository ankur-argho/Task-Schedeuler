#ifndef TASKMANAGER_H
#define TASKMANAGER_H

#include <vector>
#include <string>
#include "Task.h"

class TaskManager {
private:
    std::vector<Task> tasks;
    std::string dbFilename;
    int nextId;

    void saveToDb();
    void updateNextId();

public:
    TaskManager(const std::string& filename = "tasks_db.json");

    // Core CRUD & Actions
    Task addTask(const Task& t);
    bool updateTask(int id, const Task& updatedTask);
    bool deleteTask(int id);
    bool completeTask(int id);

    // DSA Priority Queue Execution
    Task executeHighestPriorityTask(bool& success);

    // Getters
    std::vector<Task> getAllTasks() const;
    std::vector<Task> getPendingTasks() const;
    std::vector<Task> getCompletedTasks() const;

    // DSA Searching Algorithms
    Task searchById(int id, bool& found) const;                      // Binary Search (Requires sorted by ID)
    std::vector<Task> searchByName(const std::string& query) const;  // Linear Search (Sub-string match)

    // DSA Sorting Algorithms
    std::vector<Task> getSortedTasks(const std::string& sortBy) const; // Returns a sorted copy of tasks

    // Custom Sorting implementations to showcase DSA in Viva
    static void bubbleSortByName(std::vector<Task>& arr);
    static void quickSortByDueDate(std::vector<Task>& arr, int low, int high);
    static void insertionSortByPriority(std::vector<Task>& arr);

    // Stats
    crow::json::wvalue getStatistics() const;
};

#endif // TASKMANAGER_H
