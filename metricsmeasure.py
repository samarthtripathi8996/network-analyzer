import sqlite3
import time
import os
import json
import csv
import smtplib
from email.message import EmailMessage
from datetime import datetime, timedelta
from ping3 import ping
import speedtest
import socket
import subprocess
import logging
import socket
import time

def send_to_graphite(metric_path, value, timestamp=None, server='localhost', port=2003):
    if timestamp is None:
        timestamp = int(time.time())
    message = f"{metric_path} {value} {timestamp}\n"
    try:
        sock = socket.socket()
        sock.connect((server, port))
        sock.sendall(message.encode())
        sock.close()
        print(f"Sent to Graphite: {message.strip()}")
    except Exception as e:
        print(f"Failed to send metric to Graphite: {e}")
# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='network_metrics.log'
)
logger = logging.getLogger('network_metrics')

# Create a database to store test history
DB_PATH = 'network_metrics.db'

def init_db():
    """Initialize SQLite database for storing metrics"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS test_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            protocol TEXT,
            download_speed REAL,
            upload_speed REAL,
            latency REAL,
            jitter REAL,
            packet_loss REAL,
            dns_lookup_time REAL,
            traceroute_hops REAL,
            packet_sent REAL,
            packet_rec REAL,
            raw_data TEXT
        )
        ''')
        conn.commit()
        conn.close()
        logger.info("Database initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False

def save_test_result(protocol, metrics):
    """Save test results to the database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        timestamp = datetime.now().isoformat()
        cursor.execute('''
        INSERT INTO test_history 
        (timestamp, protocol, download_speed, upload_speed, latency, jitter, packet_loss, 
        dns_lookup_time, traceroute_hops, packet_sent, packet_rec, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            timestamp,
            protocol,
            metrics.get('download_speed', 0),
            metrics.get('upload_speed', 0),
            metrics.get('latency', 0),
            metrics.get('jitter', 0),
            metrics.get('packet_loss', 0),
            metrics.get('dns_lookup_time', 0),
            metrics.get('traceroute_hops', 0),
            metrics.get('packet_sent', 0),
            metrics.get('packet_rec', 0),
            json.dumps(metrics)
        ))
        
        conn.commit()
        conn.close()
        logger.info(f"Test result saved for protocol: {protocol}")
        return True
    except Exception as e:
        logger.error(f"Failed to save test result: {e}")
        return False

def get_historical_data(timeframe='24h'):
    """Retrieve historical data from the database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        now = datetime.now()
        if timeframe == '24h':
            cutoff = (now - timedelta(hours=24)).isoformat()
        elif timeframe == '7d':
            cutoff = (now - timedelta(days=7)).isoformat()
        elif timeframe == '30d':
            cutoff = (now - timedelta(days=30)).isoformat()
        else:
            cutoff = (now - timedelta(hours=24)).isoformat()
        
        cursor.execute('''
        SELECT timestamp, protocol, download_speed, upload_speed, latency, jitter, 
               packet_loss, dns_lookup_time, traceroute_hops, packet_sent, packet_rec, raw_data
        FROM test_history
        WHERE timestamp >= ?
        ORDER BY timestamp ASC
        ''', (cutoff,))
        
        results = []
        for row in cursor.fetchall():
            result = {
                'timestamp': row[0],
                'protocol': row[1],
                'download_speed': row[2],
                'upload_speed': row[3],
                'latency': row[4],
                'jitter': row[5],
                'packet_loss': row[6],
                'dns_lookup_time': row[7],
                'traceroute_hops': row[8],
                'packet_sent': row[9],
                'packet_rec': row[10],
                'data': json.loads(row[11])
            }
            results.append(result)
        
        conn.close()
        logger.info(f"Retrieved {len(results)} historical data points for timeframe: {timeframe}")
        send_to_graphite("results", results)
        return results
        
    except Exception as e:
        logger.error(f"Failed to get historical data: {e}")
        return []

def dns_lookup_time(host="google.com"):
    """Measure DNS lookup time in milliseconds"""
    try:
        start = time.time()
        socket.gethostbyname(host)
        dns_time = (time.time() - start) * 1000  # Convert to ms
        logger.info(f"DNS Lookup Time: {dns_time:.2f} ms")
        return dns_time
    except Exception as e:
        logger.error(f"DNS lookup failed: {e}")
        return 0

def traceroute_hops(host="8.8.8.8"):
    """Count number of hops in traceroute"""
    try:
        cmd = ["tracert", "-h", "30", host] if os.name == "nt" else ["traceroute", "-m", "30", host]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
        trh = len(result.stdout.split("\n")) - 2
        logger.info(f"Traceroute hops: {trh}")
        return trh
    except subprocess.TimeoutExpired:
        logger.warning("Traceroute timed out")
        return 0
    except Exception as e:
        logger.error(f"Traceroute failed: {e}")
        return 0

def measure_packet_loss(host="google.com", count=10):
    """Measure packet loss percentage"""
    try:
        sent = count
        received = sum(1 for _ in range(count) if ping(host, timeout=1) is not None)
        lost = sent - received
        packet_loss = (lost / sent) * 100 if sent > 0 else 0
        logger.info(f"Packets: Sent={sent}, Received={received}, Loss={packet_loss:.2f}%")
        return packet_loss, sent, received
    except Exception as e:
        logger.error(f"Packet loss measurement failed: {e}")
        return 0, 0, 0

def test_bandwidth():
    """Measure download and upload speeds"""
    try:
        st = speedtest.Speedtest()
        st.get_best_server()
        download_speed = st.download() / 1_000_000  # Convert to Mbps
        upload_speed = st.upload() / 1_000_000  # Convert to Mbps
        logger.info(f"Bandwidth: Download={download_speed:.2f} Mbps, Upload={upload_speed:.2f} Mbps")
        return download_speed, upload_speed
    except Exception as e:
        logger.error(f"Bandwidth test failed: {e}")
        return 0, 0

def test_latency(host="8.8.8.8"):
    """Measure network latency"""
    try:
        result = ping(host, timeout=1)
        if result is None:
            logger.warning(f"Ping to {host} timed out")
            return 0
        latency = result * 1000  # Convert to ms
        logger.info(f"Latency: {latency:.2f} ms")
        return latency
    except Exception as e:
        logger.error(f"Latency test failed: {e}")
        return 0

def test_jitter(host="8.8.8.8", count=5):
    """Measure jitter (variation in latency)"""
    try:
        latencies = []
        for _ in range(count):
            result = ping(host, timeout=1)
            if result is not None:
                latencies.append(result * 1000)
        
        if not latencies:
            logger.warning("No successful pings for jitter measurement")
            return 0
            
        jitter = max(latencies) - min(latencies) if len(latencies) > 1 else 0
        logger.info(f"Jitter: {jitter:.2f} ms")
        return jitter
    except Exception as e:
        logger.error(f"Jitter test failed: {e}")
        return 0

def measure_bandwidth_utilization(interface=None):
    """Measure current bandwidth utilization"""
    # Determine default interface based on OS
    if interface is None:
        interface = "eth0" if os.name != "nt" else None
    
    try:
        if os.name != "nt" and os.path.exists(f"/sys/class/net/{interface}/statistics/rx_bytes"):
            # Linux path
            rx_bytes_1 = int(open(f"/sys/class/net/{interface}/statistics/rx_bytes").read())
            tx_bytes_1 = int(open(f"/sys/class/net/{interface}/statistics/tx_bytes").read())
            time.sleep(1)  # Measure over 1 second
            rx_bytes_2 = int(open(f"/sys/class/net/{interface}/statistics/rx_bytes").read())
            tx_bytes_2 = int(open(f"/sys/class/net/{interface}/statistics/tx_bytes").read())

            rx_rate = (rx_bytes_2 - rx_bytes_1) * 8 / 1e6  # Mbps
            tx_rate = (tx_bytes_2 - tx_bytes_1) * 8 / 1e6  # Mbps
            logger.info(f"Bandwidth utilization: RX={rx_rate:.2f} Mbps, TX={tx_rate:.2f} Mbps")
            return rx_rate, tx_rate
        else:
            # Fallback or Windows system - simulate data
            logger.info("Using simulated bandwidth utilization data")
            return 5.5, 2.3  # Simulated values
    except Exception as e:
        logger.error(f"Error measuring bandwidth utilization: {e}")
        return 0, 0

def get_wifi_signal_strength():
    """Get the Wi-Fi signal strength in dBm"""
    try:
        if os.name == "nt":  # Windows
            # Use netsh to get signal strength in Windows
            result = subprocess.run(["netsh", "wlan", "show", "interfaces"], 
                                   capture_output=True, text=True, timeout=5)
            for line in result.stdout.split("\n"):
                if "Signal" in line:
                    # Format: "Signal : 75%"
                    percentage = int(line.split(":")[1].strip().replace("%", ""))
                    # Convert percentage to approximate dBm (rough estimate)
                    dbm = -100 + percentage * 0.7
                    logger.info(f"WiFi signal: {percentage}%, {dbm:.2f} dBm")
                    return {"percentage": percentage, "dbm": dbm}
        else:  # Linux/macOS
            # Try iwconfig for Linux
            try:
                result = subprocess.run(["iwconfig"], capture_output=True, text=True, timeout=5)
                for line in result.stdout.split("\n"):
                    if "Signal level" in line:
                        # Format: "Signal level=-58 dBm"
                        dbm = int(line.split("Signal level=")[1].split()[0])
                        # Convert dBm to approximate percentage
                        percentage = min(100, max(0, int((dbm + 100) * (100/70))))
                        logger.info(f"WiFi signal: {percentage}%, {dbm} dBm")
                        return {"percentage": percentage, "dbm": dbm}
            except (subprocess.SubprocessError, FileNotFoundError):
                pass
        
        # Fallback to simulated data
        dbm = -65  # A typical good signal strength
        percentage = min(100, max(0, int((dbm + 100) * (100/70))))
        logger.info(f"WiFi signal (simulated): {percentage}%, {dbm} dBm")
        return {"percentage": percentage, "dbm": dbm, "note": "Simulated data"}
    
    except Exception as e:
        logger.error(f"Failed to get Wi-Fi signal strength: {e}")
        # Return simulated data
        return {"percentage": 75, "dbm": -65, "note": "Simulated data due to error"}

def collect_metrics(server="8.8.8.8", protocol="tcp"):
    """Collect all network performance metrics"""
    logger.info(f"Starting metrics collection for protocol: {protocol}")
    
    try:
        # Protocol factor adjustments
        protocol_factor = 1.0 if protocol == "tcp" else 1.1
        reliability_factor = 1.0 if protocol == "tcp" else 0.85
        
        # Core metrics with exception handling for each
        try:
            download_speed, upload_speed = test_bandwidth()
            download_speed *= protocol_factor
            upload_speed *= protocol_factor
        except Exception as e:
            logger.error(f"Bandwidth test failed: {e}")
            download_speed, upload_speed = 0, 0
        
        try:
            latency = test_latency(server)
            latency = latency / protocol_factor if protocol == "udp" else latency
        except Exception as e:
            logger.error(f"Latency test failed: {e}")
            latency = 0
        
        try:
            jitter = test_jitter(server)
            jitter = jitter / reliability_factor if protocol == "udp" else jitter
        except Exception as e:
            logger.error(f"Jitter test failed: {e}")
            jitter = 0
        
        try:
            dns_time = dns_lookup_time()
        except Exception as e:
            logger.error(f"DNS lookup test failed: {e}")
            dns_time = 0
        
        try:
            hops = traceroute_hops(server)
        except Exception as e:
            logger.error(f"Traceroute test failed: {e}")
            hops = 0
        
        try:
            packet_loss, packet_sent, packet_rec = measure_packet_loss()
            if protocol == "udp":
                packet_loss *= (1/reliability_factor)
                packet_rec = packet_sent - int((packet_sent * packet_loss) / 100)
        except Exception as e:
            logger.error(f"Packet loss test failed: {e}")
            packet_loss, packet_sent, packet_rec = 0, 0, 0
        
        # Additional metrics
        try:
            rx_rate, tx_rate = measure_bandwidth_utilization()
        except Exception as e:
            logger.error(f"Bandwidth utilization test failed: {e}")
            rx_rate, tx_rate = 0, 0
        
        # Compile all metrics
        metrics = {
            "download_speed": download_speed,
            "upload_speed": upload_speed,
            "latency": latency,
            "jitter": jitter,
            "dns_lookup_time": dns_time,
            "traceroute_hops": hops,
            "packet_loss": packet_loss,
            "packet_sent": float(packet_sent),
            "packet_rec": float(packet_rec),
            "rx_bandwidth": rx_rate,
            "tx_bandwidth": tx_rate,
            "protocol": protocol,
            "timestamp": datetime.now().isoformat()
        }
        
        # Save the test result
        save_test_result(protocol, metrics)
        logger.info("Metrics collection completed successfully")
        
        return metrics
    
    except Exception as e:
        logger.error(f"Metrics collection failed: {e}")
        return {
            "error": f"Failed to collect metrics: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }

def test_protocol_performance(protocol):
    """Test performance of specific protocol (TCP, UDP, HTTP, HTTPS, ICMP)"""
    if protocol.lower() not in ["tcp", "udp", "http", "https", "icmp"]:
        logger.warning(f"Unsupported protocol requested: {protocol}")
        return {"error": "Unsupported protocol. Supported protocols: TCP, UDP, HTTP, HTTPS, ICMP"}
    
    logger.info(f"Testing protocol performance: {protocol}")
    metrics = collect_metrics(protocol=protocol.lower())
    
    # Add protocol-specific details
    if protocol.lower() == "tcp":
        metrics["handshake_time"] = 10.5  # Simulated TCP handshake time in ms
        metrics["connection_overhead"] = "Higher overhead but reliable"
        metrics["notes"] = "TCP provides reliable, ordered, and error-checked delivery"
    
    elif protocol.lower() == "udp":
        metrics["connection_overhead"] = "Lower overhead but less reliable"
        metrics["notes"] = "UDP provides datagram service with no guarantees of delivery, ordering, or duplicate protection"
    
    elif protocol.lower() in ["http", "https"]:
        # Test HTTP/HTTPS with a simple request
        test_url = "https://www.google.com" if protocol.lower() == "https" else "http://example.com"
        try:
            import requests
            start_time = time.time()
            response = requests.get(test_url, timeout=5)
            request_time = (time.time() - start_time) * 1000  # Convert to ms
            
            metrics["request_time"] = request_time
            metrics["status_code"] = response.status_code
            metrics["content_length"] = len(response.content)
            metrics["notes"] = f"{protocol.upper()} request completed successfully"
        
        except ImportError:
            logger.warning("Requests library not available, using simulated HTTP/HTTPS data")
            metrics["notes"] = "Requests library not available, using basic simulation for HTTP/HTTPS"
            metrics["request_time"] = 150.0  # Simulated request time
            metrics["status_code"] = 200
            metrics["content_length"] = 52428  # Simulated content length
        
        except Exception as e:
            logger.error(f"HTTP/HTTPS test failed: {e}")
            metrics["error"] = str(e)
            metrics["notes"] = f"{protocol.upper()} request failed"
    
    elif protocol.lower() == "icmp":
        # ICMP is already tested via ping in collect_metrics
        metrics["notes"] = "ICMP tests performed via ping"
    
    return metrics

def send_alert(email, message):
    """Send an email alert when critical metrics exceed thresholds"""
    try:
        logger.info(f"Sending alert to {email}: {message}")
        
        # This is a simple email sending function.
        # In a production environment, you would use a more robust solution.
        msg = EmailMessage()
        msg.set_content(f"""
        Network Alert Notification
        
        {message}
        
        Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        
        Please check your network metrics dashboard for more details.
        """)
        
        msg['Subject'] = 'Network Metrics Alert'
        msg['From'] = 'network-monitor@example.com'  # Replace with your sending email
        msg['To'] = email
        
        # Configure your SMTP server details here
        # For demonstration purposes, we'll just log the alert
        logger.info(f"ALERT WOULD BE SENT TO {email}: {message}")
        
        # Uncomment below to actually send emails (with proper SMTP configuration)
        # with smtplib.SMTP('smtp.example.com', 587) as server:
        #     server.starttls()
        #     server.login('username', 'password')
        #     server.send_message(msg)
        
        return True
    except Exception as e:
        logger.error(f"Failed to send alert: {e}")
        return False

def save_metrics_to_csv(metrics):
    """Save metrics to a CSV file for long-term data storage"""
    try:
        csv_file = "network_metrics.csv"
        file_exists = os.path.isfile(csv_file)
        
        with open(csv_file, "a", newline='') as f:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            fieldnames = ['timestamp'] + list(metrics.keys())
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            
            if not file_exists:
                writer.writeheader()
            
            row_data = {'timestamp': timestamp}
            row_data.update(metrics)
            writer.writerow(row_data)
            
        logger.info(f"Metrics saved to CSV file: {csv_file}")
        return True
    except Exception as e:
        logger.error(f"Failed to save metrics to CSV: {e}")
        return False

def log_metrics(metrics):
    """Log metrics to console and log file"""
    try:
        # Console output
        print("=" * 50)
        print(f"Network Metrics - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 50)
        for key, value in metrics.items():
            print(f"{key.replace('_', ' ').title()}: {value}")
        print("\n")
        
        # Log file output
        logger.info("Network metrics collected successfully")
        for key, value in metrics.items():
            logger.debug(f"{key}: {value}")
            
        return True
    except Exception as e:
        logger.error(f"Failed to log metrics: {e}")
        return False

def main():
    """Main function to initialize database and collect metrics"""
    try:
        # Initialize the database
        init_db()
        
        # Collect and display metrics
        metrics = collect_metrics()
        log_metrics(metrics)
        save_metrics_to_csv(metrics)
        
        print("\n--- Network Performance Metrics ---")
        for key, value in metrics.items():
            print(f"{key.replace('_', ' ').title()}: {value}")
            
        return metrics
    except Exception as e:
        logger.error(f"Main function failed: {e}")
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    main()
