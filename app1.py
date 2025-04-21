from flask import Flask, jsonify, request, send_from_directory
import os
import threading
import time
import sqlite3
from flask_cors import CORS
from datetime import datetime
import logging
import json
from werkzeug.middleware.proxy_fix import ProxyFix

# Import from metricsmeasure.py
from metricsmeasure import (
    collect_metrics, log_metrics, test_protocol_performance, 
    get_wifi_signal_strength, save_metrics_to_csv, send_alert,
    init_db, get_historical_data
)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('api_server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('network_api')

# Flask app configuration
app = Flask(__name__, static_folder='static')
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Create static folder if it doesn't exist
os.makedirs(app.static_folder, exist_ok=True)

# Global connection pool for SQLite
DATABASE_CONNECTION = None

def get_db_connection():
    """Get a database connection (singleton pattern)"""
    global DATABASE_CONNECTION
    if DATABASE_CONNECTION is None:
        DATABASE_CONNECTION = sqlite3.connect("network_metrics.db", check_same_thread=False)
    return DATABASE_CONNECTION

def store_metrics_in_db(metrics):
    """Store metrics in the database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''CREATE TABLE IF NOT EXISTS metrics (
                            timestamp TEXT,
                            download_speed REAL,
                            upload_speed REAL,
                            latency REAL,
                            jitter REAL,
                            dns_lookup_time REAL,
                            traceroute_hops INTEGER,
                            packet_loss REAL)
                        ''')
        cursor.execute('''INSERT INTO metrics VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                    (datetime.now().isoformat(), 
                     metrics.get("download_speed", 0), 
                     metrics.get("upload_speed", 0), 
                     metrics.get("latency", 0),
                     metrics.get("jitter", 0), 
                     metrics.get("dns_lookup_time", 0), 
                     metrics.get("traceroute_hops", 0), 
                     metrics.get("packet_loss", 0)))
        conn.commit()
        logger.info("Metrics stored in database successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to store metrics in database: {e}")
        return False

# API routes
@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    """Get current network metrics"""
    try:
        logger.info("API request received: /api/metrics")
        metrics = collect_metrics()
        log_metrics(metrics)
        save_metrics_to_csv(metrics)
        store_metrics_in_db(metrics)
        
        # Check for alert conditions
        if metrics.get("packet_loss", 0) > 10 or metrics.get("latency", 0) > 100:
            send_alert("your_email@gmail.com", "High packet loss or latency detected!")
        
        return jsonify({
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "data": metrics
        })
    except Exception as e:
        logger.error(f"Error in /api/metrics: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route("/api/protocol_test/<protocol>", methods=["GET"])
def protocol_test(protocol):
    """Test specific protocol performance"""
    try:
        logger.info(f"API request received: /api/protocol_test/{protocol}")
        result = test_protocol_performance(protocol)
        return jsonify({
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "protocol": protocol,
            "data": result
        })
    except Exception as e:
        logger.error(f"Error in /api/protocol_test/{protocol}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route("/api/wifi_signal", methods=["GET"])
def wifi_signal():
    """Get WiFi signal strength"""
    try:
        logger.info("API request received: /api/wifi_signal")
        signal_strength = get_wifi_signal_strength()
        return jsonify({
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "data": {"wifi_signal": signal_strength}
        })
    except Exception as e:
        logger.error(f"Error in /api/wifi_signal: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route("/api/historical/<timeframe>", methods=["GET"])
def historical_data(timeframe):
    """Get historical data for specified timeframe (24h, 7d, 30d)"""
    try:
        logger.info(f"API request received: /api/historical/{timeframe}")
        data = get_historical_data(timeframe)
        return jsonify({
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "timeframe": timeframe,
            "count": len(data),
            "data": data
        })
    except Exception as e:
        logger.error(f"Error in /api/historical/{timeframe}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route("/api/docs", methods=["GET"])
def api_docs():
    """Serve API documentation"""
    return send_from_directory(app.static_folder, 'api-docs.html')

# Generate Swagger JSON file for API documentation
@app.route("/api/swagger.json", methods=["GET"])
def swagger_json():
    """Serve Swagger JSON specification"""
    swagger_spec = {
        "openapi": "3.0.0",
        "info": {
            "title": "Network Metrics API",
            "description": "API for measuring and retrieving network performance metrics",
            "version": "1.0.0"
        },
        "servers": [
            {
                "url": "/",
                "description": "Default server"
            }
        ],
        "paths": {
            "/api/metrics": {
                "get": {
                    "summary": "Get current network metrics",
                    "responses": {
                        "200": {
                            "description": "Successful response",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/protocol_test/{protocol}": {
                "get": {
                    "summary": "Test specific protocol performance",
                    "parameters": [
                        {
                            "name": "protocol",
                            "in": "path",
                            "required": True,
                            "schema": {
                                "type": "string",
                                "enum": ["tcp", "udp", "http", "https", "icmp"]
                            },
                            "description": "Network protocol to test"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Successful response",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/wifi_signal": {
                "get": {
                    "summary": "Get WiFi signal strength",
                    "responses": {
                        "200": {
                            "description": "Successful response",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/historical/{timeframe}": {
                "get": {
                    "summary": "Get historical data for the specified timeframe",
                    "parameters": [
                        {
                            "name": "timeframe",
                            "in": "path",
                            "required": True,
                            "schema": {
                                "type": "string",
                                "enum": ["24h", "7d", "30d"]
                            },
                            "description": "Time period for historical data (24 hours, 7 days, or 30 days)"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Successful response",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "status": {"type": "string"},
                                            "timestamp": {"type": "string"},
                                            "timeframe": {"type": "string"},
                                            "count": {"type": "integer"},
                                            "data": {"type": "array"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/docs": {
                "get": {
                    "summary": "Get API documentation",
                    "responses": {
                        "200": {
                            "description": "HTML documentation page",
                            "content": {
                                "text/html": {
                                    "schema": {
                                        "type": "string"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/swagger.json": {
                "get": {
                    "summary": "Get Swagger JSON specification",
                    "responses": {
                        "200": {
                            "description": "Swagger JSON specification",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return jsonify(swagger_spec)

# Serve front-end application
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_app(path):
    """Serve the front-end application"""
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

# Function to run metrics collection in background
def background_metrics_collection():
    """Background thread to periodically collect and store metrics"""
    while True:
        try:
            metrics = collect_metrics()
            store_metrics_in_db(metrics)
            save_metrics_to_csv(metrics)
            logger.info("Background metrics collection completed")
        except Exception as e:
            logger.error(f"Error in background metrics collection: {str(e)}")
        time.sleep(300)  # Collect metrics every 5 minutes

if __name__ == "__main__":
    # Initialize database
    init_db()
    
    # Start background metrics collection
    metrics_thread = threading.Thread(target=background_metrics_collection, daemon=True)
    metrics_thread.start()
    
    # Start the Flask server
    logger.info("Starting Network Metrics API server")
    app.run(host="0.0.0.0", port=5000, debug=False)
