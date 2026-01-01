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
        private readonly ITauriInterop _tauri;
        private readonly IUserService _userService;

        public ProjectService(ITauriInterop tauri, IUserService userService)
        {
            _tauri = tauri;
            _userService = userService;
        }

        public async Task<List<Project>> GetProjectsAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<Project>>("get_projects", new { token });
        }

        public async Task<long> AddProjectAsync(Project project)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_project", new { project, token });
        }

        public async Task<List<ProjectTask>> GetProjectTasksAsync(int projectId)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<ProjectTask>>("get_project_tasks", new { projectId, token });
        }

        public async Task<long> AddProjectTaskAsync(ProjectTask task)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_project_task", new { task, token });
        }
        
        public async Task UpdateProjectAsync(Project project)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_project", new { project, token });
        }

        public async Task UpdateProjectTaskAsync(ProjectTask task)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_project_task", new { task, token });
        }

        public async Task DeleteProjectTaskAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("delete_project_task", new { id, token });
        }

        public async Task DeleteProjectAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("delete_project", new { id, token });
        }

        public async Task AssignProjectEmployeeAsync(int projectId, int employeeId, string role)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("assign_project_employee", new { projectId, employeeId, role, token });
        }

        public async Task<List<ProjectAssignment>> GetProjectAssignmentsAsync(int projectId)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<ProjectAssignment>>("get_project_assignments", new { projectId, token });
        }

        public async Task<List<ProjectAssignment>> GetAllProjectAssignmentsAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<ProjectAssignment>>("get_all_project_assignments", new { token });
        }

        public async Task RemoveProjectAssignmentAsync(int projectId, int employeeId)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("remove_project_assignment", new { projectId, employeeId, token });
        }
    }
}
