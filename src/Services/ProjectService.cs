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
            Console.WriteLine("ProjectService.GetProjectsAsync: Fetching all projects");
            try
            {
                var token = await _userService.GetTokenAsync();
                return await _tauri.InvokeAsync<List<Project>>("get_projects", new { token });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ProjectService.GetProjectsAsync: Error fetching projects - {ex.Message}");
                throw;
            }
        }

        public async Task<long> AddProjectAsync(Project project)
        {
            Console.WriteLine($"ProjectService.AddProjectAsync: Adding project '{project.Name}' with status '{project.Status}'");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<long>("add_project", new { project, token });
                Console.WriteLine($"ProjectService.AddProjectAsync: Successfully added project with ID {result}");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ProjectService.AddProjectAsync: Error adding project - {ex.Message}");
                throw;
            }
        }

        public async Task<List<ProjectTask>> GetProjectTasksAsync(int projectId)
        {
            Console.WriteLine($"ProjectService.GetProjectTasksAsync: Fetching tasks for project {projectId}");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<List<ProjectTask>>("get_project_tasks", new { projectId, token });
                Console.WriteLine($"ProjectService.GetProjectTasksAsync: Successfully fetched {result?.Count ?? 0} tasks for project {projectId}");
                return result ?? new List<ProjectTask>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ProjectService.GetProjectTasksAsync: Error fetching tasks for project {projectId} - {ex.Message}");
                throw;
            }
        }

        public async Task<long> AddProjectTaskAsync(ProjectTask task)
        {
            Console.WriteLine($"ProjectService.AddProjectTaskAsync: Adding task '{task.Name}' to project {task.ProjectId}");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<long>("add_project_task", new { task, token });
                Console.WriteLine($"ProjectService.AddProjectTaskAsync: Successfully added task with ID {result}");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ProjectService.AddProjectTaskAsync: Error adding task - {ex.Message}");
                throw;
            }
        }
        
        public async Task UpdateProjectAsync(Project project)
        {
            Console.WriteLine($"ProjectService.UpdateProjectAsync: Updating project '{project.Name}' (ID: {project.Id})");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("update_project", new { project, token });
                Console.WriteLine($"ProjectService.UpdateProjectAsync: Successfully updated project {project.Id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ProjectService.UpdateProjectAsync: Error updating project - {ex.Message}");
                throw;
            }
        }

        public async Task UpdateProjectTaskAsync(ProjectTask task)
        {
            Console.WriteLine($"ProjectService.UpdateProjectTaskAsync: Updating task '{task.Name}' (ID: {task.Id})");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("update_project_task", new { task, token });
                Console.WriteLine($"ProjectService.UpdateProjectTaskAsync: Successfully updated task {task.Id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ProjectService.UpdateProjectTaskAsync: Error updating task - {ex.Message}");
                throw;
            }
        }

        public async Task DeleteProjectTaskAsync(int id)
        {
            Console.WriteLine($"ProjectService.DeleteProjectTaskAsync: Deleting project task with ID {id}");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("delete_project_task", new { id, token });
                Console.WriteLine($"ProjectService.DeleteProjectTaskAsync: Successfully deleted project task {id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ProjectService.DeleteProjectTaskAsync: Error deleting project task - {ex.Message}");
                throw;
            }
        }

        public async Task DeleteProjectAsync(int id)
        {
            Console.WriteLine($"ProjectService.DeleteProjectAsync: Deleting project with ID {id}");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("delete_project", new { id, token });
                Console.WriteLine($"ProjectService.DeleteProjectAsync: Successfully deleted project {id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ProjectService.DeleteProjectAsync: Error deleting project {id} - {ex.Message}");
                throw;
            }
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
