#include "FileManager.h"
#include <fstream>
#include <sstream>
#include <iostream>
#include <crow/json.h>

bool FileManager::saveTasks(const std::vector<Task>& tasks, const std::string& filename) {
    crow::json::wvalue root;
    // Set to empty list initially, just in case tasks vector is empty
    if (tasks.empty()) {
        root = crow::json::wvalue::list();
    } else {
        for (size_t i = 0; i < tasks.size(); ++i) {
            root[i] = tasks[i].to_json();
        }
    }
    std::string jsonStr = root.dump();

    std::ofstream file(filename);
    if (!file.is_open()) {
        std::cerr << "Error: Could not open file for writing: " << filename << std::endl;
        return false;
    }
    file << jsonStr;
    file.close();
    return true;
}

std::vector<Task> FileManager::loadTasks(const std::string& filename) {
    std::vector<Task> tasks;
    std::ifstream file(filename);
    if (!file.is_open()) {
        std::cerr << "Warning: Database file not found, starting with empty tasks: " << filename << std::endl;
        return tasks;
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string content = buffer.str();
    file.close();

    if (content.empty()) {
        return tasks;
    }

    auto root = crow::json::load(content);
    if (!root) {
        std::cerr << "Error: Failed to parse database file: " << filename << std::endl;
        return tasks;
    }

    if (root.t() == crow::json::type::List) {
        for (size_t i = 0; i < root.size(); ++i) {
            tasks.push_back(Task::from_json(root[i]));
        }
    }

    return tasks;
}
