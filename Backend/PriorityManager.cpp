#include "PriorityManager.h"

int TaskPriorityCompare::getPriorityWeight(const std::string& p) const {
    if (p == "High") return 3;
    if (p == "Medium") return 2;
    return 1; // "Low"
}

bool TaskPriorityCompare::operator()(const Task& a, const Task& b) const {
    int weightA = getPriorityWeight(a.priority);
    int weightB = getPriorityWeight(b.priority);

    // Higher priority weight should come first.
    // std::priority_queue is a max-heap, so it pops the largest element.
    // If operator() returns true, a is considered LESS than b, meaning b will be placed higher.
    // So if weightA < weightB, returns true (a has lower priority than b).
    if (weightA != weightB) {
        return weightA < weightB;
    }

    // Tie-breaker 1: Due date. Earlier due date is higher priority.
    // Standard lexicographical string comparison works for "YYYY-MM-DD" format.
    // If a's due date is later than b's due date, a is LESS important, so return true.
    if (a.dueDate != b.dueDate) {
        if (a.dueDate.empty()) return true;  // Empty due date is less important
        if (b.dueDate.empty()) return false; // Non-empty due date is more important
        return a.dueDate > b.dueDate;
    }

    // Tie-breaker 2: Task ID. Smaller ID (created earlier) is higher priority.
    // If a's ID is larger than b's ID, a is LESS important, so return true.
    return a.id > b.id;
}

std::priority_queue<Task, std::vector<Task>, TaskPriorityCompare> PriorityManager::buildPriorityQueue(const std::vector<Task>& tasks) {
    std::priority_queue<Task, std::vector<Task>, TaskPriorityCompare> pq;
    for (const auto& task : tasks) {
        // Only queue pending tasks for execution
        if (task.status == "Pending") {
            pq.push(task);
        }
    }
    return pq;
}
