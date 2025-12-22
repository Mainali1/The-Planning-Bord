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
        private readonly TauriInterop _tauri;

        public TaskService(TauriInterop tauri)
        {
            _tauri = tauri;
        }

        public async Task<List<TaskModel>> GetTasksAsync()
        {
            return await _tauri.InvokeAsync<List<TaskModel>>("get_tasks", new { });
        }

        public async Task<long> AddTaskAsync(TaskModel task)
        {
            return await _tauri.InvokeAsync<long>("add_task", new { task });
        }

        public async Task UpdateTaskAsync(TaskModel task)
        {
            await _tauri.InvokeVoidAsync("update_task", new { task });
        }

        public async Task DeleteTaskAsync(int id)
        {
            await _tauri.InvokeVoidAsync("delete_task", new { id });
        }
    }
}
