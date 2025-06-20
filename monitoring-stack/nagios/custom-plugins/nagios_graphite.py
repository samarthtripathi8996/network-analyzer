#!/usr/bin/env python3
"""
Nagios to Graphite Integration Plugin
This script sends Nagios performance data to Graphite
"""

import socket
import time
import sys
import re
import os
from datetime import datetime

class NagiosGraphiteReporter:
    def __init__(self, graphite_host='graphite', graphite_port=2003):
        self.graphite_host = graphite_host
        self.graphite_port = graphite_port
        self.socket = None
        
    def connect_to_graphite(self):
        """Establish connection to Graphite"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((self.graphite_host, self.graphite_port))
            return True
        except Exception as e:
            print(f"Failed to connect to Graphite: {e}")
            return False
    
    def send_metric(self, metric_path, value, timestamp=None):
        """Send a single metric to Graphite"""
        if timestamp is None:
            timestamp = int(time.time())
        
        message = f"{metric_path} {value} {timestamp}\n"
        
        try:
            if self.socket:
                self.socket.sendall(message.encode('utf-8'))
                return True
        except Exception as e:
            print(f"Failed to send metric: {e}")
            return False
    
    def parse_nagios_perfdata(self, perfdata):
        """Parse Nagios performance data string"""
        metrics = {}
        if not perfdata:
            return metrics
        
        # Pattern to match performance data format: 'label'=value[UOM];[warn];[crit];[min];[max]
        pattern = r"'?([^'=]+)'?=([^;]+)(?:;([^;]*);([^;]*);([^;]*);([^;]*))?(?:\s|$)"
        
        for match in re.finditer(pattern, perfdata):
            label = match.group(1).strip()
            value_str = match.group(2).strip()
            
            # Extract numeric value
            value_match = re.search(r'(-?\d+\.?\d*)', value_str)
            if value_match:
                try:
                    value = float(value_match.group(1))
                    metrics[label] = value
                except ValueError:
                    continue
        
        return metrics
    
    def process_service_perfdata(self):
        """Process service performance data from environment variables"""
        # Nagios service perfdata environment variables
        hostname = os.environ.get('NAGIOS_HOSTNAME', 'unknown')
        service_desc = os.environ.get('NAGIOS_SERVICEDESC', 'unknown')
        perfdata = os.environ.get('NAGIOS_SERVICEPERFDATA', '')
        timestamp = int(os.environ.get('NAGIOS_TIMET', time.time()))
        
        # Clean hostname and service description for Graphite path
        hostname = re.sub(r'[^a-zA-Z0-9_-]', '_', hostname)
        service_desc = re.sub(r'[^a-zA-Z0-9_-]', '_', service_desc)
        
        metrics = self.parse_nagios_perfdata(perfdata)
        
        for metric_name, value in metrics.items():
            metric_name = re.sub(r'[^a-zA-Z0-9_-]', '_', metric_name)
            metric_path = f"nagios.services.{hostname}.{service_desc}.{metric_name}"
            self.send_metric(metric_path, value, timestamp)
            print(f"Sent metric: {metric_path} = {value}")
    
    def process_host_perfdata(self):
        """Process host performance data from environment variables"""
        hostname = os.environ.get('NAGIOS_HOSTNAME', 'unknown')
        perfdata = os.environ.get('NAGIOS_HOSTPERFDATA', '')
        timestamp = int(os.environ.get('NAGIOS_TIMET', time.time()))
        
        # Clean hostname for Graphite path
        hostname = re.sub(r'[^a-zA-Z0-9_-]', '_', hostname)
        
        metrics = self.parse_nagios_perfdata(perfdata)
        
        for metric_name, value in metrics.items():
            metric_name = re.sub(r'[^a-zA-Z0-9_-]', '_', metric_name)
            metric_path = f"nagios.hosts.{hostname}.{metric_name}"
            self.send_metric(metric_path, value, timestamp)
            print(f"Sent metric: {metric_path} = {value}")
    
    def close_connection(self):
        """Close connection to Graphite"""
        if self.socket:
            self.socket.close()

def main():
    if len(sys.argv) < 2:
        print("Usage: nagios_graphite.py [service|host]")
        sys.exit(1)
    
    data_type = sys.argv[1].lower()
    
    reporter = NagiosGraphiteReporter()
    
    if not reporter.connect_to_graphite():
        sys.exit(1)
    
    try:
        if data_type == 'service':
            reporter.process_service_perfdata()
        elif data_type == 'host':
            reporter.process_host_perfdata()
        else:
            print("Invalid data type. Use 'service' or 'host'")
            sys.exit(1)
    finally:
        reporter.close_connection()

if __name__ == "__main__":
    main()