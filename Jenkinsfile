pipeline {
    agent {
        docker {
            image 'python:3.10-slim'
        }
    }

    environment {
        VENV_PATH = "./venv"
    }

    stages {
        stage('Clone Repository') {
            steps {
                git branch: 'main', url: 'https://github.com/samarthtripathi8996/network-analyzer.git'
            }
        }

        stage('Set Up Python & Dependencies') {
            steps {
                sh '''
                python3 -m venv $VENV_PATH
                . $VENV_PATH/bin/activate
                python -m pip install --upgrade pip
                if [ -f requirements.txt ]; then
                    pip install -r requirements.txt
                fi
                '''
            }
        }

        stage('Run app1.py') {
            steps {
                sh '''
                . $VENV_PATH/bin/activate
                nohup python app1.py > app.log 2>&1 &
                sleep 5
                '''
            }
        }

        stage('Run Tests (pytest)') {
            steps {
                sh '''
                . $VENV_PATH/bin/activate
                pip install pytest
                pytest || true
                '''
            }
        }

        stage('Log Network Metrics') {
            steps {
                sh '''
                . $VENV_PATH/bin/activate
                python metricsmeasure.py
                '''
            }
        }

        stage('Cleanup') {
            steps {
                sh '''
                pkill -f app1.py || true
                '''
            }
        }

        stage('Pipeline Complete') {
            steps {
                echo '✅ CI/CD Pipeline execution completed.'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: '**/*.log', allowEmptyArchive: true
        }
    }
}
