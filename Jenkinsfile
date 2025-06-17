pipeline {
    agent any

    stages {
        stage('Clone Repo') {
            steps {
                git 'https://github.com/samarthtripathi8996/network-analyzer.git'
            }
        }
        stage('Install Python Dependencies') {
            steps {
                sh 'pip install -r requirements.txt'
            }
        }
        stage('Syntax Check') {
            steps {
                sh 'python -m py_compile app1.py metricsmeasure.py'
            }
        }
        stage('Build Docker Image') {
            steps {
                sh 'docker build -t network-monitor .'
            }
        }
        stage('Run Docker Container') {
            steps {
                sh 'docker run -d -p 5000:5000 network-monitor'
            }
        }
    }
}
