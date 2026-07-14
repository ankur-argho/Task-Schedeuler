#include <crow.h>
#include "TaskManager.h"
#include <iostream>
#include <algorithm>

// Custom CORS Middleware to allow requests from the static HTML frontend
struct CORS {
    struct context {};
    void before_handle(crow::request& /*req*/, crow::response& /*res*/, context& /*ctx*/) {
    }
    void after_handle(crow::request& req, crow::response& res, context& /*ctx*/) {
        res.add_header("Access-Control-Allow-Origin", "*");
        res.add_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.add_header("Access-Control-Allow-Headers", "Content-Type");
        if (req.method == crow::HTTPMethod::OPTIONS) {
            res.code = 204;
            res.end();
        }
    }
};

int main() {
    crow::App<CORS> app;
    TaskManager manager("tasks_db.json");

    std::cout << "Task Scheduler Backend started on port 18080..." << std::endl;

    // GET /tasks - Get sorted or unsorted pending tasks
    CROW_ROUTE(app, "/tasks")
    ([&manager](const crow::request& req) {
        char* sortBy = req.url_params.get("sortBy");
        std::vector<Task> tasks;
        if (sortBy != nullptr && std::string(sortBy) != "") {
            tasks = manager.getSortedTasks(sortBy);
        } else {
            tasks = manager.getAllTasks();
        }

        std::vector<crow::json::wvalue> pendingJson;
        for (const auto& task : tasks) {
            if (task.status == "Pending") {
                pendingJson.push_back(task.to_json());
            }
        }
        
        crow::json::wvalue response;
        if (pendingJson.empty()) {
            response = crow::json::wvalue::list();
        } else {
            response = std::move(pendingJson);
        }
        return crow::response(response);
    });

    // GET /completedTasks - Get sorted or unsorted completed tasks
    CROW_ROUTE(app, "/completedTasks")
    ([&manager](const crow::request& req) {
        char* sortBy = req.url_params.get("sortBy");
        std::vector<Task> tasks;
        if (sortBy != nullptr && std::string(sortBy) != "") {
            tasks = manager.getSortedTasks(sortBy);
        } else {
            tasks = manager.getAllTasks();
        }

        std::vector<crow::json::wvalue> completedJson;
        for (const auto& task : tasks) {
            if (task.status == "Completed") {
                completedJson.push_back(task.to_json());
            }
        }

        crow::json::wvalue response;
        if (completedJson.empty()) {
            response = crow::json::wvalue::list();
        } else {
            response = std::move(completedJson);
        }
        return crow::response(response);
    });

    // POST /tasks - Create a new task
    CROW_ROUTE(app, "/tasks").methods(crow::HTTPMethod::POST)
    ([&manager](const crow::request& req) {
        auto bodyJson = crow::json::load(req.body);
        if (!bodyJson) {
            return crow::response(400, "Invalid JSON body");
        }

        Task t = Task::from_json(bodyJson);
        Task created = manager.addTask(t);
        return crow::response(201, created.to_json());
    });

    // PUT /tasks/{id} - Update an existing task
    CROW_ROUTE(app, "/tasks/<int>").methods(crow::HTTPMethod::PUT)
    ([&manager](const crow::request& req, int id) {
        auto bodyJson = crow::json::load(req.body);
        if (!bodyJson) {
            return crow::response(400, "Invalid JSON body");
        }

        Task t = Task::from_json(bodyJson);
        bool success = manager.updateTask(id, t);
        if (success) {
            return crow::response(200, "Task updated successfully");
        }
        return crow::response(404, "Task not found");
    });

    // DELETE /tasks/{id} - Delete a task
    CROW_ROUTE(app, "/tasks/<int>").methods(crow::HTTPMethod::DELETE)
    ([&manager](int id) {
        bool success = manager.deleteTask(id);
        if (success) {
            return crow::response(200, "Task deleted successfully");
        }
        return crow::response(404, "Task not found");
    });

    // GET /search - Search tasks by ID (Binary Search) or Title/Name (Linear Search)
    CROW_ROUTE(app, "/search")
    ([&manager](const crow::request& req) {
        char* q = req.url_params.get("q");
        if (q == nullptr || std::string(q).empty()) {
            crow::json::wvalue emptyList = crow::json::wvalue::list();
            return crow::response(emptyList);
        }

        std::string queryStr(q);
        std::vector<Task> results;

        // Try to parse query string as an ID (e.g. check if all characters are digits)
        bool isNumber = !queryStr.empty() && std::all_of(queryStr.begin(), queryStr.end(), ::isdigit);
        if (isNumber) {
            int id = std::stoi(queryStr);
            bool found = false;
            Task t = manager.searchById(id, found);
            if (found) {
                results.push_back(t);
            }
        } else {
            results = manager.searchByName(queryStr);
        }

        std::vector<crow::json::wvalue> resultsJson;
        for (const auto& task : results) {
            resultsJson.push_back(task.to_json());
        }

        crow::json::wvalue response;
        if (resultsJson.empty()) {
            response = crow::json::wvalue::list();
        } else {
            response = std::move(resultsJson);
        }
        return crow::response(response);
    });

    // GET /statistics - Get tasks breakdown metrics
    CROW_ROUTE(app, "/statistics")
    ([&manager]() {
        return crow::response(manager.getStatistics());
    });

    // POST /executePriorityTask - Pop & complete the highest priority task using Priority Queue
    CROW_ROUTE(app, "/executePriorityTask").methods(crow::HTTPMethod::POST)
    ([&manager]() {
        bool success = false;
        Task t = manager.executeHighestPriorityTask(success);
        if (success) {
            return crow::response(200, t.to_json());
        }
        crow::json::wvalue errResponse;
        errResponse["error"] = "No pending tasks available in the priority queue";
        return crow::response(400, errResponse);
    });

    // POST /completeTask - Mark a task as completed manually
    CROW_ROUTE(app, "/completeTask").methods(crow::HTTPMethod::POST)
    ([&manager](const crow::request& req) {
        auto bodyJson = crow::json::load(req.body);
        if (!bodyJson || !bodyJson.has("id")) {
            return crow::response(400, "Invalid JSON body or missing task ID");
        }

        int id = bodyJson["id"].i();
        bool success = manager.completeTask(id);
        if (success) {
            return crow::response(200, "Task marked as completed");
        }
        return crow::response(404, "Task not found");
    });

    // Configure and run the application
    app.port(18080).multithreaded().run();
}
