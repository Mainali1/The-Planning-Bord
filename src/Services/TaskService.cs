using Microsoft.JSInterop;
using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface ITaskService
    {
        Task<List<TaskModel>> GetTasksAsync();
        Task<long> AddTaskAsync(TaskModel task);
        Task UpdateTaskAsync(TaskModel task);
        Task DeleteTaskAsync(int id);
    }

    public class TaskService : ITaskService
    {
        private readonly ITauriInterop _tauri;
        private readonly IUserService _userService;

        public TaskService(ITauriInterop tauri, IUserService userService)
        {
            _tauri = tauri;
            _userService = userService;
        }

        public async Task<List<TaskModel>> GetTasksAsync()
        {
            Console.WriteLine("TaskService.GetTasksAsync: Fetching all tasks");
            try
            {
                var token = await _userService.GetTokenAsync();
                return await _tauri.InvokeAsync<List<TaskModel>>("get_tasks", new { token });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"TaskService.GetTasksAsync: Error fetching tasks - {ex.Message}");
                throw;
            }   
        }

        public async Task<long> AddTaskAsync(TaskModel task)
        {
            Console.WriteLine($"TaskService.AddTaskAsync: Adding task '{task.Title}' with priority '{task.Priority}' and status '{task.Status}'");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<long>("add_task", new { task, token });
                Console.WriteLine($"TaskService.AddTaskAsync: Successfully added task with ID {result}");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"TaskService.AddTaskAsync: Error adding task - {ex.Message}");
                throw;
            }
        }

        public async Task UpdateTaskAsync(TaskModel task)
        {
            Console.WriteLine($"TaskService.UpdateTaskAsync: Updating task '{task.Title}' (ID: {task.Id})");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("update_task", new { task, token });
                Console.WriteLine($"TaskService.UpdateTaskAsync: Successfully updated task {task.Id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"TaskService.UpdateTaskAsync: Error updating task - {ex.Message}");
                throw;
            }
        }

        public async Task DeleteTaskAsync(int id)
        {
            Console.WriteLine($"TaskService.DeleteTaskAsync: Deleting task with ID {id}");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("delete_task", new { id, token });
                Console.WriteLine($"TaskService.DeleteTaskAsync: Successfully deleted task {id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"TaskService.DeleteTaskAsync: Error deleting task - {ex.Message}");
                throw;
            }
        }
    }
}
