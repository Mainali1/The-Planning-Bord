
#[cfg(test)]
mod tests {
    use the_planning_bord_lib::db::{Database, PostgresDatabase, postgres_init};
    use the_planning_bord_lib::models::{Tool, Project, ProjectTask};
    use std::env;

    fn get_db() -> Option<PostgresDatabase> {
        let connection_string = env::var("DATABASE_URL").ok()?;
        postgres_init::init_db(&connection_string).ok()?;
        PostgresDatabase::new(&connection_string).ok()
    }

    #[tokio::test]
    async fn test_seed_demo_data() {
        let db = match get_db() {
            Some(db) => db,
            None => {
                println!("Skipping test_seed_demo_data: DATABASE_URL not set");
                return;
            }
        };

        // We can't easily wipe the DB here without potentially destroying user data if they run this on prod.
        // So we will just run seed_demo_data and check if it succeeds and counts are > 0.
        // Real integration tests usually use a separate DB.
        
        let result = db.seed_demo_data().await;
        assert!(result.is_ok(), "Failed to seed demo data: {:?}", result.err());

        // Verify Employees
        let employees = db.get_employees().await.expect("Failed to get employees");
        assert!(!employees.is_empty(), "Employees should not be empty after seeding");

        // Verify Projects
        let projects = db.get_projects().await.expect("Failed to get projects");
        assert!(!projects.is_empty(), "Projects should not be empty after seeding");
        
        // Verify Tools
        let tools = db.get_tools().await.expect("Failed to get tools");
        assert!(!tools.is_empty(), "Tools should not be empty after seeding");
    }

    #[tokio::test]
    async fn test_tool_management() {
        let db = match get_db() {
            Some(db) => db,
            None => {
                println!("Skipping test_tool_management: DATABASE_URL not set");
                return;
            }
        };

        // Create a unique tool name to avoid collisions
        let tool_name = format!("Test Tool {}", chrono::Utc::now().timestamp());
        
        let new_tool = Tool {
            id: None,
            name: tool_name.clone(),
            type_name: "Testing Equipment".to_string(),
            status: "available".to_string(),
            assigned_to_employee_id: None,
            purchase_date: Some("2025-01-01".to_string()),
            condition: Some("new".to_string()),
        };

        let id = db.add_tool(new_tool).await.expect("Failed to add tool");
        assert!(id > 0);

        let tools = db.get_tools().await.expect("Failed to get tools");
        let added_tool = tools.iter().find(|t| t.id == Some(id as i32));
        assert!(added_tool.is_some());
        assert_eq!(added_tool.unwrap().name, tool_name);

        // Update
        let mut tool_to_update = added_tool.unwrap().clone();
        tool_to_update.condition = Some("used".to_string());
        db.update_tool(tool_to_update).await.expect("Failed to update tool");

        // Delete
        db.delete_tool(id as i32).await.expect("Failed to delete tool");
        
        let tools_after = db.get_tools().await.expect("Failed to get tools");
        assert!(tools_after.iter().find(|t| t.id == Some(id as i32)).is_none());
    }

    #[tokio::test]
    async fn test_project_management() {
        let db = match get_db() {
            Some(db) => db,
            None => {
                println!("Skipping test_project_management: DATABASE_URL not set");
                return;
            }
        };

        let project_name = format!("Test Project {}", chrono::Utc::now().timestamp());
        
        let new_project = Project {
            id: None,
            name: project_name.clone(),
            description: Some("Test Desc".to_string()),
            start_date: Some("2025-01-01".to_string()),
            end_date: Some("2025-12-31".to_string()),
            status: "planning".to_string(),
            manager_id: None,
        };

        let pid = db.add_project(new_project).await.expect("Failed to add project");
        
        // Add Task
        let task_name = format!("Test Task {}", chrono::Utc::now().timestamp());
        let new_task = ProjectTask {
            id: None,
            project_id: Some(pid as i32),
            name: task_name,
            description: Some("Desc".to_string()),
            assigned_to: None,
            status: "todo".to_string(),
            priority: "medium".to_string(),
            start_date: None,
            due_date: None,
            parent_task_id: None,
            dependencies_json: None,
        };

        let tid = db.add_project_task(new_task).await.expect("Failed to add project task");
        assert!(tid > 0);

        // Assign Employee (Need an employee first)
        let employees = db.get_employees().await.expect("Failed to get employees");
        if let Some(emp) = employees.first() {
            let eid = emp.id.unwrap();
            db.assign_project_employee(pid as i32, eid, "Member".to_string()).await.expect("Failed to assign employee");
            
            let assignments = db.get_project_assignments(pid as i32).await.expect("Failed to get assignments");
            assert!(assignments.iter().any(|a| a.employee_id == eid));
        }

        // Clean up
        db.delete_project(pid as i32).await.expect("Failed to delete project");
    }
}
