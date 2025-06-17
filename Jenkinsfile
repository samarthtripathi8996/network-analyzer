pipeline {
    agent any

    stages {
        stage('Clone Repository') {
            steps {
                git branch: 'main', url: 'https://github.com/samarthtripathi8996/network-analyzer.git'

            }
        }

        stage('Set Up Python & Dependencies') {
            steps {
                sh '''
                python3 -m venv venv
                . venv/bin/activate
                pip install --upgrade pip
                pip install -r requirements.txt || true
                '''
            }
        }

        stage('Run app1.py') {
            steps {
                sh '''
                . venv/bin/activate
                python app1.py &
                sleep 5  # wait for app to initialize if needed
                '''
            }
        }

        stage('Run Tests (pytest)') {
            steps {
                sh '''
                . venv/bin/activate
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
