using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public class ResourcePlan
    {
        public List<Employee> Employees { get; set; } = new();
        public List<TaskModel> Tasks { get; set; } = new();
    }

    public interface IResourcePlanningService
    {
        Task<ResourcePlan> GetResourcePlanAsync();
        Task AssignTaskToEmployeeAsync(TaskModel task, int employeeId);
    }

    public class ResourcePlanningService : IResourcePlanningService
    {
        private readonly IHrService _hrService;
        private readonly ITaskService _taskService;

        public ResourcePlanningService(IHrService hrService, ITaskService taskService)
        {
            _hrService = hrService;
            _taskService = taskService;
        }

        public async Task<ResourcePlan> GetResourcePlanAsync()
        {
            var plan = new ResourcePlan();
            var dataTasks = new List<Task>
            {
                Task.Run(async () => plan.Employees = await _hrService.GetEmployeesAsync()),
                Task.Run(async () => plan.Tasks = await _taskService.GetTasksAsync())
            };
            await Task.WhenAll(dataTasks);
            return plan;
        }

        public async Task AssignTaskToEmployeeAsync(TaskModel task, int employeeId)
        {
            task.EmployeeId = employeeId;
            task.AssignedDate = DateTime.Now;
            await _taskService.UpdateTaskAsync(task);
        }
    }
}
