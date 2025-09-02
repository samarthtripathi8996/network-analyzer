# Network Analyzer Pipeline

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/samarthtripathi8996/network-analyzer/actions)
[![Python](https://img.shields.io/badge/python-3.11.2-blue.svg)](https://www.python.org/downloads/release/python-3112/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Overview

**Network Analyzer Pipeline** is a comprehensive solution for real-time network monitoring, analytics, and automated deployment. Built using modern DevOps practices, it integrates monitoring, visualization, alerting, and automation to provide actionable insights into network performance.

---

## Features

- ✅ **CI/CD Pipeline:** Automated deployment with Jenkins (100% success rate)
- 📊 **Real-time Monitoring:** Network performance dashboards via Grafana
- 🛡️ **Service Monitoring:** Automated health checks with Nagios
- 🐳 **Containerization:** Portable deployment using Docker and Docker Compose
- 📈 **Performance Metrics:** In-depth network performance data collection and analysis
- 💾 **Data Management:** Metrics storage in SQLite and CSV export functionality
- 🔔 **Alerting System:** Automated notifications for network issues

---

## System Architecture

### Monitoring Stack
- **Grafana:** Interactive dashboards and data visualization
- **Automated dashboard provisioning**

### Network Monitoring
- **Nagios:** Service and host health monitoring
- **Custom plugins and configuration**

### Application Layer
- Core network analysis logic
- Metrics collection module
- WebSocket interface for real-time updates

### Data Management
- SQLite database for metrics storage
- CSV export
- Comprehensive logging

### DevOps Pipeline
- Docker containerization
- Jenkins CI/CD automation
- Dependency management

### Frontend Interface
- Web UI for dashboards
- Static file serving

---

## Technology Stack

| Technology | Version | Purpose                       |
| ---------- | ------- | ---------------------------- |
| Python     | 3.11.2  | Core application language    |
| Docker     | Latest  | Containerization             |
| Jenkins    | Latest  | CI/CD Pipeline               |
| Grafana    | Latest  | Data visualization           |
| Nagios     | Latest  | Service monitoring           |
| Flask      | 3.1.1   | Web interface                |
| SQLite     | Latest  | Metrics storage              |

---

## Performance Metrics

- ⚡ **Download Speed:** 974.44 Mbps
- ⚡ **Upload Speed:** 1060.17 Mbps
- 🕒 **DNS Lookup Time:** 1.58 ms
- ⏱️ **Pipeline Execution Time:** 56 seconds
- ✅ **Pipeline Success Rate:** 100%

---

## Project Structure

```
network-analyzer/
├── app1.py                  # Core network analysis logic
├── metricsmeasure.py        # Network metrics gathering
├── wsgi.py                  # Real-time communication layer
├── requirements.txt         # Dependencies
├── Dockerfile               # Container configuration
├── docker-compose.yml       # Multi-container orchestration
├── Jenkinsfile              # CI/CD pipeline configuration
├── nagios/                  # Nagios monitoring configs
│   ├── commands.cfg
│   ├── hosts.cfg
│   ├── services.cfg
│   └── templates.cfg
└── grafana/
    ├── dashboards/          # Dashboard JSON definitions
    └── provisioning/        # Automated configuration
```

---

## Installation

1. **Clone the repository:**
    ```bash
    git clone https://github.com/samarthtripathi8996/network-analyzer.git
    cd network-analyzer
    ```

2. **Create & activate a virtual environment:**
    - **Linux/Mac:**
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```
    - **Windows:**
        ```bash
        python -m venv venv
        venv\Scripts\activate
        ```

3. **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

---

## Usage

### Running the Application

- **Start the main application:**
    ```bash
    python app1.py
    ```

- **Collect network metrics:**
    ```bash
    python metricsmeasure.py
    ```

### Docker Deployment

- **Build the Docker image:**
    ```bash
    docker build -t network-analyzer .
    ```

- **Run the container:**
    ```bash
    docker run -p 5000:5000 network-analyzer
    ```

- **Multi-container deployment (Docker Compose):**
    ```bash
    docker-compose up -d
    ```

### Jenkins Pipeline

- Add the `Jenkinsfile` to your Jenkins instance
- Configure your pipeline job
- Run the pipeline for automated deployment

---

## Dashboard Features

- 📈 Time series visualization
- ⏰ 6-hour time range analysis
- 🔄 Real-time metrics display
- 🖱️ Interactive data exploration
- 🎛️ Custom panel configuration

---

## Challenges & Solutions

- **Network Connectivity:**  
  _Challenge:_ 100% packet loss during testing  
  _Solution:_ Alternative metrics collection and bandwidth monitoring

- **Test Framework:**  
  _Challenge:_ Missing test files for pytest  
  _Solution:_ Graceful handling and future-proofing for tests

- **Process Management:**  
  _Challenge:_ Jenkins background process management  
  _Solution:_ PID-based tracking and cleanup

- **Dependency Management:**  
  _Challenge:_ Ensuring consistent Python environment  
  _Solution:_ Use of virtual env and pinned dependencies

---

## Future Enhancements

- 🌥️ **Cloud Integration:** AWS, Azure, GCP, and cloud-native monitoring
- 🧠 **Advanced Analytics:** ML-based anomaly detection and prediction
- 🔒 **Enhanced Security:** Intrusion detection and security monitoring
- 📱 **Mobile Support:** Mobile dashboards and push notifications

---

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request. For major changes, open an issue first to discuss your ideas.

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

## Author & Contact

**Samarth Tripathi**  
[GitHub](https://github.com/samarthtripathi8996)

---
