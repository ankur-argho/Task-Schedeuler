#ifndef FILEMANAGER_H
#define FILEMANAGER_H

#include <vector>
#include <string>
#include "Task.h"

class FileManager {
public:
    static bool saveTasks(const std::vector<Task>& tasks, const std::string& filename);
    static std::vector<Task> loadTasks(const std::string& filename);
};

#endif // FILEMANAGER_H
