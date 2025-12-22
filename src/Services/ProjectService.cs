using Microsoft.JSInterop;
using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface IProjectService
    {
        Task<List<Project>> GetProjectsAsync();
        Task<long> AddProjectAsync(Project project);
        Task<List<ProjectTask>> GetProjectTasksAsync(int projectId);
        Task<long> AddProjectTaskAsync(ProjectTask task);
        Task UpdateProjectTaskAsync(ProjectTask task);
    }

    public class ProjectService : IProjectService
    {
        private readonly TauriInterop _tauri;

        public ProjectService(TauriInterop tauri)
        {
            _tauri = tauri;
        }

        public async Task<List<Project>> GetProjectsAsync()
        {
            return await _tauri.InvokeAsync<List<Project>>("get_projects", new { });
        }

        public async Task<long> AddProjectAsync(Project project)
        {
            return await _tauri.InvokeAsync<long>("add_project", new { project });
        }

        public async Task<List<ProjectTask>> GetProjectTasksAsync(int projectId)
        {
            return await _tauri.InvokeAsync<List<ProjectTask>>("get_project_tasks", new { projectId });
        }

        public async Task<long> AddProjectTaskAsync(ProjectTask task)
        {
            return await _tauri.InvokeAsync<long>("add_project_task", new { task });
        }
        
        public async Task UpdateProjectTaskAsync(ProjectTask task)
        {
            await _tauri.InvokeVoidAsync("update_project_task", new { task });
        }
    }
}
