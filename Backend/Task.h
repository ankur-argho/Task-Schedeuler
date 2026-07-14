#ifndef TASK_H
#define TASK_H

#include <string>
#include <crow/json.h>

struct Task {
    int id;
    std::string title;
    std::string description;
    std::string priority; // "High", "Medium", "Low"
    std::string dueDate;    // YYYY-MM-DD
    std::string status;     // "Pending", "Completed"
    std::string createdDate; // YYYY-MM-DD

    // Convert Task to crow::json::wvalue for API responses
    crow::json::wvalue to_json() const {
        crow::json::wvalue j;
        j["id"] = id;
        j["title"] = title;
        j["description"] = description;
        j["priority"] = priority;
        j["dueDate"] = dueDate;
        j["status"] = status;
        j["createdDate"] = createdDate;
        return j;
    }

    // Load Task from crow::json::rvalue
    static Task from_json(const crow::json::rvalue& j) {
        Task t;
        t.id = j.has("id") ? (int)j["id"].i() : 0;
        t.title = j.has("title") ? std::string(j["title"].s()) : "";
        t.description = j.has("description") ? std::string(j["description"].s()) : "";
        t.priority = j.has("priority") ? std::string(j["priority"].s()) : "Medium";
        t.dueDate = j.has("dueDate") ? std::string(j["dueDate"].s()) : "";
        t.status = j.has("status") ? std::string(j["status"].s()) : "Pending";
        t.createdDate = j.has("createdDate") ? std::string(j["createdDate"].s()) : "";
        return t;
    }
};

#endif // TASK_H
