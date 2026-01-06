#[cfg(test)]
mod tests {
    use the_planning_bord_lib::db::{Database, PostgresDatabase, postgres_init};
    use the_planning_bord_lib::models::{User, Invite};
    use std::env;
    use uuid::Uuid;

    fn get_db() -> Option<PostgresDatabase> {
        let connection_string = env::var("DATABASE_URL").ok()?;
        // Re-init DB to ensure schema is fresh/correct
        postgres_init::init_db(&connection_string).ok()?;
        PostgresDatabase::new(&connection_string).ok()
    }

    #[test]
    fn test_auth_flow() {
        let db = match get_db() {
            Some(db) => db,
            None => {
                println!("Skipping test_auth_flow: DATABASE_URL not set");
                return;
            }
        };

        // 1. Admin Registration (Complete Setup)
        let company_name = format!("Test Corp {}", Uuid::new_v4());
        let admin_username = format!("admin_{}", Uuid::new_v4().to_string().replace("-", "")[..8].to_string());
        let admin_email = format!("{}@example.com", admin_username);
        
        // Ensure username doesn't exist
        assert_eq!(db.check_username_exists(admin_username.clone()).unwrap(), false);

        let result = db.complete_setup(
            company_name.clone(),
            "Admin User".to_string(),
            admin_email.clone(),
            "password123".to_string(),
            admin_username.clone()
        );
        assert!(result.is_ok(), "Failed to complete setup: {:?}", result.err());

        // Verify Admin Exists
        let user = db.get_user_by_username(admin_username.clone()).expect("Failed to get user").expect("User not found");
        assert_eq!(user.username, admin_username);
        assert_eq!(user.email, admin_email);
        assert_eq!(user.role, "CEO");

        // Verify Username Check
        assert_eq!(db.check_username_exists(admin_username.clone()).unwrap(), true);

        // 2. Invite Flow
        let invite_token = Uuid::new_v4().to_string(); // In real app, this is a JWT, but DB just stores string
        let invite_email = format!("emp_{}@example.com", Uuid::new_v4());
        
        let invite = Invite {
            id: None,
            token: invite_token.clone(),
            role: "Employee".to_string(),
            name: "New Employee".to_string(),
            email: invite_email.clone(),
            expiration: Some("2030-01-01 00:00:00".to_string()),
            is_used: false,
            is_active: true,
        };

        let invite_id = db.create_invite(invite).expect("Failed to create invite");
        assert!(invite_id > 0);

        // Verify Invite exists
        let stored_invite = db.get_invite(invite_token.clone()).expect("Failed to get invite").expect("Invite not found");
        assert_eq!(stored_invite.email, invite_email);
        assert_eq!(stored_invite.is_used, false);

        // 3. Employee Registration (Accept Invite)
        let emp_username = format!("emp_{}", Uuid::new_v4().to_string().replace("-", "")[..8].to_string());
        
        // Create User manually (simulating accept_invite logic)
        let new_user = User {
            id: None,
            username: emp_username.clone(),
            email: invite_email.clone(),
            full_name: Some("Employee One".to_string()),
            hashed_password: "hashed_secret".to_string(),
            role: "Employee".to_string(),
            is_active: true,
            last_login: None,
        };

        let emp_id = db.create_user(new_user).expect("Failed to create employee user");
        assert!(emp_id > 0);

        // Mark invite used
        let mark_result = db.mark_invite_used(invite_token.clone());
        assert!(mark_result.is_ok());

        // Verify Invite is used
        let used_invite = db.get_invite(invite_token.clone()).expect("Failed to get invite").unwrap();
        assert_eq!(used_invite.is_used, true);

        // Verify Employee Login Fetch
        let emp_user = db.get_user_by_username(emp_username.clone()).expect("Failed to get employee").unwrap();
        assert_eq!(emp_user.email, invite_email);
    }
}
