#ifndef PRIORITYMANAGER_H
#define PRIORITYMANAGER_H

#include <queue>
#include <vector>
#include "Task.h"

struct TaskPriorityCompare {
    int getPriorityWeight(const std::string& p) const;
    bool operator()(const Task& a, const Task& b) const;
};

class PriorityManager {
public:
    // Build a priority queue from a list of tasks
    static std::priority_queue<Task, std::vector<Task>, TaskPriorityCompare> buildPriorityQueue(const std::vector<Task>& tasks);
};

#endif // PRIORITYMANAGER_H
