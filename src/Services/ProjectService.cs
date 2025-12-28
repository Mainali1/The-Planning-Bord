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
        Task UpdateProjectAsync(Project project);
        Task UpdateProjectTaskAsync(ProjectTask task);
        Task DeleteProjectTaskAsync(int id);
        Task DeleteProjectAsync(int id);
        Task AssignProjectEmployeeAsync(int projectId, int employeeId, string role);
        Task<List<ProjectAssignment>> GetProjectAssignmentsAsync(int projectId);
        Task<List<ProjectAssignment>> GetAllProjectAssignmentsAsync();
        Task RemoveProjectAssignmentAsync(int projectId, int employeeId);
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
        
        public async Task UpdateProjectAsync(Project project)
        {
            await _tauri.InvokeVoidAsync("update_project", new { project });
        }

        public async Task UpdateProjectTaskAsync(ProjectTask task)
        {
            await _tauri.InvokeVoidAsync("update_project_task", new { task });
        }

        public async Task DeleteProjectTaskAsync(int id)
        {
            await _tauri.InvokeVoidAsync("delete_project_task", new { id });
        }

        public async Task DeleteProjectAsync(int id)
        {
            await _tauri.InvokeVoidAsync("delete_project", new { id });
        }

        public async Task AssignProjectEmployeeAsync(int projectId, int employeeId, string role)
        {
            await _tauri.InvokeVoidAsync("assign_project_employee", new { projectId, employeeId, role });
        }

        public async Task<List<ProjectAssignment>> GetProjectAssignmentsAsync(int projectId)
        {
            return await _tauri.InvokeAsync<List<ProjectAssignment>>("get_project_assignments", new { projectId });
        }

        public async Task<List<ProjectAssignment>> GetAllProjectAssignmentsAsync()
        {
            return await _tauri.InvokeAsync<List<ProjectAssignment>>("get_all_project_assignments", new { });
        }

        public async Task RemoveProjectAssignmentAsync(int projectId, int employeeId)
        {
            await _tauri.InvokeVoidAsync("remove_project_assignment", new { projectId, employeeId });
        }
    }
}
