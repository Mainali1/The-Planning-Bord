#!/usr/bin/env python3
"""
Deployment script for The Planning Bord Backend
Supports local and cloud deployment modes
"""

import os
import sys
import shutil
import subprocess
import argparse
from pathlib import Path
from typing import Dict, Any
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DeploymentManager:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.backend_dir = self.project_root
        self.config_dir = self.backend_dir / "config"
        
    def setup_local_deployment(self):
        """Set up local server deployment"""
        logger.info("Setting up local server deployment...")
        
        # Check if Python is available
        if not self._check_python():
            logger.error("Python 3.8+ is required")
            return False
            
        # Create local environment file
        env_file = self.backend_dir / ".env"
        if not env_file.exists():
            logger.info("Creating local environment file...")
            example_env = self.config_dir / "local.example.env"
            if example_env.exists():
                shutil.copy(example_env, env_file)
                logger.info("Created .env file from local.example.env")
            else:
                logger.error("local.example.env not found")
                return False
        else:
            logger.info(".env file already exists")
            
        # Install dependencies
        logger.info("Installing dependencies...")
        if not self._install_dependencies():
            return False
            
        # Create necessary directories
        self._create_directories()
        
        # Initialize database
        logger.info("Initializing database...")
        if not self._initialize_database():
            return False
            
        logger.info("Local deployment setup complete!")
        logger.info("To start the server, run: python main.py")
        return True
        
    def setup_cloud_deployment(self):
        """Set up cloud server deployment"""
        logger.info("Setting up cloud server deployment...")
        
        # Check if Docker is available
        if not self._check_docker():
            logger.warning("Docker not found. Setting up without Docker...")
            
        # Create cloud environment file
        env_file = self.backend_dir / ".env"
        if not env_file.exists():
            logger.info("Creating cloud environment file...")
            example_env = self.config_dir / "cloud.example.env"
            if example_env.exists():
                shutil.copy(example_env, env_file)
                logger.info("Created .env file from cloud.example.env")
            else:
                logger.error("cloud.example.env not found")
                return False
        else:
            logger.info(".env file already exists")
            
        # Install dependencies
        logger.info("Installing dependencies...")
        if not self._install_dependencies():
            return False
            
        # Create Docker setup if available
        if self._check_docker():
            self._create_docker_setup()
            
        logger.info("Cloud deployment setup complete!")
        logger.info("Review and update the .env file with your cloud settings")
        logger.info("Then run: python main.py")
        return True
        
    def _check_python(self) -> bool:
        """Check if Python 3.8+ is available"""
        try:
            result = subprocess.run(
                [sys.executable, "--version"],
                capture_output=True,
                text=True,
                check=True
            )
            version_line = result.stdout.strip() or result.stderr.strip()
            logger.info(f"Python version: {version_line}")
            
            # Extract version number
            version_str = version_line.replace("Python ", "")
            major, minor = version_str.split(".")[:2]
            
            if int(major) >= 3 and int(minor) >= 8:
                return True
            else:
                logger.error(f"Python 3.8+ required, found {version_str}")
                return False
                
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.error("Python not found")
            return False
            
    def _check_docker(self) -> bool:
        """Check if Docker is available"""
        try:
            result = subprocess.run(
                ["docker", "--version"],
                capture_output=True,
                text=True,
                check=True
            )
            logger.info(f"Docker version: {result.stdout.strip()}")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("Docker not found")
            return False
            
    def _install_dependencies(self) -> bool:
        """Install Python dependencies"""
        try:
            requirements_file = self.backend_dir / "requirements.txt"
            if not requirements_file.exists():
                logger.error("requirements.txt not found")
                return False
                
            logger.info("Installing Python dependencies...")
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)],
                cwd=self.backend_dir,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                logger.error(f"Failed to install dependencies: {result.stderr}")
                return False
                
            logger.info("Dependencies installed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error installing dependencies: {e}")
            return False
            
    def _create_directories(self):
        """Create necessary directories"""
        directories = [
            "uploads",
            "backups",
            "logs",
            "temp"
        ]
        
        for directory in directories:
            dir_path = self.backend_dir / directory
            dir_path.mkdir(exist_ok=True)
            logger.info(f"Created directory: {directory}")
            
    def _initialize_database(self) -> bool:
        """Initialize the database"""
        try:
            # Import and run database initialization
            sys.path.insert(0, str(self.backend_dir))
            
            from src.database import engine, Base
            
            logger.info("Creating database tables...")
            Base.metadata.create_all(bind=engine)
            logger.info("Database initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing database: {e}")
            return False
            
    def _create_docker_setup(self):
        """Create Docker configuration files"""
        dockerfile_content = """FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    g++ \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads backups logs temp

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "main.py"]
"""
        
        docker_compose_content = """version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      - ./uploads:/app/uploads
      - ./backups:/app/backups
      - ./logs:/app/logs
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: planning_bord
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  postgres_data:
"""
        
        # Create Dockerfile
        dockerfile = self.backend_dir / "Dockerfile"
        with open(dockerfile, "w") as f:
            f.write(dockerfile_content)
        logger.info("Created Dockerfile")
        
        # Create docker-compose.yml
        docker_compose = self.backend_dir / "docker-compose.yml"
        with open(docker_compose, "w") as f:
            f.write(docker_compose_content)
        logger.info("Created docker-compose.yml")
        
    def run_tests(self):
        """Run the test suite"""
        logger.info("Running tests...")
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pytest", "tests/", "-v"],
                cwd=self.backend_dir,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                logger.info("All tests passed!")
                return True
            else:
                logger.error(f"Tests failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Error running tests: {e}")
            return False
            
    def start_server(self):
        """Start the backend server"""
        logger.info("Starting backend server...")
        try:
            subprocess.run(
                [sys.executable, "main.py"],
                cwd=self.backend_dir
            )
        except KeyboardInterrupt:
            logger.info("Server stopped by user")
        except Exception as e:
            logger.error(f"Error starting server: {e}")

def main():
    parser = argparse.ArgumentParser(description="Deploy The Planning Bord Backend")
    parser.add_argument(
        "mode",
        choices=["local", "cloud", "test", "start"],
        help="Deployment mode"
    )
    parser.add_argument(
        "--run-tests",
        action="store_true",
        help="Run tests after setup"
    )
    
    args = parser.parse_args()
    
    deployer = DeploymentManager()
    
    if args.mode == "local":
        success = deployer.setup_local_deployment()
        if success and args.run_tests:
            deployer.run_tests()
            
    elif args.mode == "cloud":
        success = deployer.setup_cloud_deployment()
        if success and args.run_tests:
            deployer.run_tests()
            
    elif args.mode == "test":
        deployer.run_tests()
        
    elif args.mode == "start":
        deployer.start_server()
        
    else:
        parser.print_help()

if __name__ == "__main__":
    main()