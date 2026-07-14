# Compiler and flags
CXX = clang++
CXXFLAGS = -std=c++17 -Wall -Wextra -O3 -pthread -I/opt/homebrew/include

# Target executable
TARGET = server

# Source files
SRCS = main.cpp TaskManager.cpp PriorityManager.cpp FileManager.cpp
HEADERS = Task.h TaskManager.h PriorityManager.h FileManager.h

# Object files
OBJS = $(SRCS:.cpp=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) $(OBJS) -o $(TARGET)

%.o: %.cpp $(HEADERS)
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET)

run: all
	./$(TARGET)

.PHONY: all clean run
