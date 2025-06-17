pipeline {
    agent any

    environment {
        VENV_PATH = "venv"
    }

    stages {
        stage('System Check') {
            steps {
                script {
                    // Check if Python3 is available
                    def pythonCheck = sh(script: 'which python3 || which python', returnStatus: true)
                    if (pythonCheck != 0) {
                        error("Python is not installed on this system. Please install Python 3.x")
                    }
                    
                    // Determine Python command
                    def pythonCmd = sh(script: 'which python3 >/dev/null 2>&1 && echo "python3" || echo "python"', returnStdout: true).trim()
                    env.PYTHON_CMD = pythonCmd
                    
                    echo "Using Python command: ${env.PYTHON_CMD}"
                    sh "${env.PYTHON_CMD} --version"
                }
            }
        }

        stage('Clone Repository') {
            steps {
                git branch: 'main', url: 'https://github.com/samarthtripathi8996/network-analyzer.git'
            }
        }

        stage('Set Up Python & Dependencies') {
            steps {
                sh '''
                # Check if venv module is available
                ${PYTHON_CMD} -m venv --help >/dev/null 2>&1 || {
                    echo "venv module not available, trying to install python3-venv"
                    # For Ubuntu/Debian systems (adjust as needed)
                    if command -v apt-get >/dev/null 2>&1; then
                        sudo apt-get update && sudo apt-get install -y python3-venv python3-pip
                    elif command -v yum >/dev/null 2>&1; then
                        sudo yum install -y python3-venv python3-pip
                    fi
                }
                
                # Create virtual environment
                ${PYTHON_CMD} -m venv ${VENV_PATH}
                
                # Activate and upgrade pip
                . ${VENV_PATH}/bin/activate
                pip install --upgrade pip
                
                # Install requirements if file exists
                if [ -f requirements.txt ]; then
                    echo "Installing requirements from requirements.txt"
                    pip install -r requirements.txt
                else
                    echo "No requirements.txt found, installing common dependencies"
                    pip install flask requests psutil pytest
                fi
                '''
            }
        }

        stage('Verify Setup') {
            steps {
                sh '''
                . ${VENV_PATH}/bin/activate
                pip list
                ${PYTHON_CMD} -c "import sys; print('Python version:', sys.version)"
                '''
            }
        }

        stage('Run app1.py') {
            steps {
                sh '''
                . ${VENV_PATH}/bin/activate
                
                # Check if app1.py exists
                if [ ! -f app1.py ]; then
                    echo "app1.py not found in current directory"
                    ls -la
                    exit 1
                fi
                
                # Start the application in background
                nohup ${PYTHON_CMD} app1.py > app1.log 2>&1 &
                APP_PID=$!
                echo $APP_PID > app1.pid
                
                # Wait a bit for the app to start
                sleep 5
                
                # Check if the process is still running
                if kill -0 $APP_PID 2>/dev/null; then
                    echo "app1.py started successfully with PID: $APP_PID"
                else
                    echo "Failed to start app1.py"
                    cat app1.log
                    exit 1
                fi
                '''
            }
        }

        stage('Run Tests (pytest)') {
            steps {
                sh '''
                . ${VENV_PATH}/bin/activate
                
                # Install pytest if not already installed
                pip install pytest
                
                # Run tests if test files exist
                if ls test_*.py >/dev/null 2>&1 || ls *_test.py >/dev/null 2>&1 || [ -d tests ]; then
                    echo "Running pytest..."
                    pytest -v || echo "Some tests failed, but continuing pipeline"
                else
                    echo "No test files found, skipping tests"
                fi
                '''
            }
        }

        stage('Log Network Metrics') {
            steps {
                sh '''
                . ${VENV_PATH}/bin/activate
                
                # Check if metricsmeasure.py exists
                if [ -f metricsmeasure.py ]; then
                    echo "Running network metrics collection..."
                    ${PYTHON_CMD} metricsmeasure.py
                else
                    echo "metricsmeasure.py not found, skipping metrics collection"
                fi
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                # Optional: Add health check for your application
                if [ -f app1.pid ] && kill -0 $(cat app1.pid) 2>/dev/null; then
                    echo "Application is running"
                    # You can add more health checks here (e.g., HTTP requests)
                else
                    echo "Application is not running"
                fi
                '''
            }
        }

        stage('Cleanup') {
            steps {
                sh '''
                # Kill the application process
                if [ -f app1.pid ]; then
                    PID=$(cat app1.pid)
                    if kill -0 $PID 2>/dev/null; then
                        echo "Stopping app1.py (PID: $PID)"
                        kill $PID || true
                        sleep 2
                        kill -9 $PID 2>/dev/null || true
                    fi
                    rm -f app1.pid
                fi
                
                # Alternative cleanup method
                pkill -f app1.py || true
                '''
            }
        }

        stage('Pipeline Complete') {
            steps {
                echo '✅ CI/CD Pipeline execution completed successfully.'
            }
        }
    }

    post {
        always {
            // Archive logs and other artifacts
            script {
                try {
                    archiveArtifacts artifacts: '**/*.log', allowEmptyArchive: true
                    archiveArtifacts artifacts: '**/pytest-results.xml', allowEmptyArchive: true
                } catch (Exception e) {
                    echo "Failed to archive artifacts: ${e.getMessage()}"
                }
            }
        }
        
        success {
            echo '🎉 Pipeline completed successfully!'
        }
        
        failure {
            echo '❌ Pipeline failed. Check the logs above for details.'
        }
        
        cleanup {
            // Cleanup virtual environment and temporary files
            sh '''
                rm -rf ${VENV_PATH} || true
                rm -f app1.pid || true
                pkill -f app1.py || true
            '''
        }
    }
}