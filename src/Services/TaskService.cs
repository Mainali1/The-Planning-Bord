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
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<TaskModel>>("get_tasks", new { token });
        }

        public async Task<long> AddTaskAsync(TaskModel task)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_task", new { task, token });
        }

        public async Task UpdateTaskAsync(TaskModel task)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_task", new { task, token });
        }

        public async Task DeleteTaskAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("delete_task", new { id, token });
        }
    }
}
