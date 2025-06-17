pipeline {
    agent any

    environment {
        VENV_PATH = "venv"
    }

    stages {
        stage('Clone Repository') {
            steps {
                git branch: 'main', url: 'https://github.com/samarthtripathi8996/network-analyzer.git'
            }
        }

        stage('Install Python & Set Up Virtualenv') {
            steps {
                sh '''
                sudo apt-get update
                sudo apt-get install -y python3 python3-venv python3-pip
                python3 -m venv venv
                . venv/bin/activate
                pip install --upgrade pip
                if [ -f requirements.txt ]; then
                    pip install -r requirements.txt
                fi
                '''
            }
        }

        stage('Run app1.py') {
            steps {
                sh '''
                . venv/bin/activate
                nohup python app1.py > app1.log 2>&1 &
                sleep 5
                '''
            }
        }

        stage('Run Tests (pytest)') {
            steps {
                sh '''
                . venv/bin/activate
                pip install pytest
                pytest || true
                '''
            }
        }

        stage('Log Network Metrics') {
            steps {
                sh '''
                . venv/bin/activate
                python metricsmeasure.py
                '''
            }
        }

        stage('Cleanup') {
            steps {
                sh 'pkill -f app1.py || true'
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
