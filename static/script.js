class Speedometer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.valueDisplay = this.container.querySelector(".value-display");
    this.needle = this.container.querySelector(".needle");
    this.animationInterval = null;
    this.maxSpeed = 180;
    this.initializeMarks();
    this.initializeNumbers();
  }

  initializeMarks() {
    const marksContainer = this.container.querySelector(".marks");
    marksContainer.innerHTML = "";
    for (let i = 0; i < 19; i++) {
      const degrees = -90 + i * 10;
      const mark = document.createElement("div");
      mark.className = `mark ${i % 2 === 0 ? "major" : ""}`;
      mark.style.transform = `rotate(${degrees}deg)`;
      marksContainer.appendChild(mark);
    }
  }

  initializeNumbers() {
    const numbersContainer = this.container.querySelector(".numbers");
    numbersContainer.innerHTML = "";
    [0, 45, 90, 135, 180].forEach((num, i) => {
      const degrees = -90 + i * 45;
      const number = document.createElement("div");
      number.className = "number";
      number.textContent = num;
      number.style.transform = `rotate(${degrees}deg) translateX(-50%)`;
      numbersContainer.appendChild(number);
    });
  }

  updateValue(value) {
    const min = 0;
    const max = this.maxSpeed;
    const range = max - min;
    const percentage = (value - min) / range;
    const degrees = percentage * 180 - 90;

    this.needle.style.transform = `rotate(${degrees}deg)`;
    this.valueDisplay.textContent = Math.round(value * 100) / 100;
  }

  startSweeping() {
    let value = 0;
    let direction = 1;
    const step = this.maxSpeed / 50;

    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }

    this.animationInterval = setInterval(() => {
      value += direction * step;
      if (value >= this.maxSpeed) {
        value = this.maxSpeed;
        direction = -1;
      }
      if (value <= 0) {
        value = 0;
        direction = 1;
      }
      this.updateValue(value);
    }, 100);
  }

  stopAnimation(finalValue) {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
    this.updateValue(finalValue);
  }
}

const downloadSpeedometer = new Speedometer("download-speedometer");
const uploadSpeedometer = new Speedometer("upload-speedometer");

let isTestRunning = false;
let tcpResults = null;
let udpResults = null;
let congestionChart = null;

function runNetworkTest() {
  if (isTestRunning) return;

  isTestRunning = true;
  downloadSpeedometer.startSweeping();
  uploadSpeedometer.startSweeping();
  document.getElementById("results").innerHTML = `<h2>Loading...</h2>`;

  const protocol = document.getElementById("protocolSelect").value;

  // First fetch basic metrics
  fetch(`http://localhost:5000/api/metrics`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((response) => {
      // The metrics are nested under the "data" key in the response
      const data = response.data;

      // Store the result for comparison
      if (protocol === "tcp") {
        tcpResults = data;
      } else {
        udpResults = data;
      }

      downloadSpeedometer.stopAnimation(data.download_speed);
      uploadSpeedometer.stopAnimation(data.upload_speed);

      // Then fetch protocol-specific tests
      fetch(`http://localhost:5000/api/protocol_test/${protocol}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((protocolResponse) => protocolResponse.json())
        .then((protocolData) => {
          // Merge the protocol-specific data with basic metrics
          const mergedData = { ...data, ...protocolData.data };

          // Update the display with all data
          document.getElementById("results").innerHTML = `
            <h2>Results (${protocol.toUpperCase()})</h2>
            <div class="metric">
              <strong>Download Speed:</strong>
              <span id="downloadSpeed">${data.download_speed.toFixed(
                2
              )}</span> Mbps
            </div>
            <div class="metric">
              <strong>Upload Speed:</strong>
              <span id="uploadSpeed">${data.upload_speed.toFixed(2)}</span> Mbps
            </div>
            <div class="metric">
              <strong>Jitter:</strong>
              <span id="jitter">${data.jitter.toFixed(2)}</span> ms
            </div>
            <div class="metric">
              <strong>Latency:</strong>
              <span id="latency">${data.latency.toFixed(2)}</span> ms
            </div>
            <div class="metric">
              <strong>DNS Lookup Time:</strong>
              <span id="dns">${data.dns_lookup_time.toFixed(2)}</span> ms
            </div>
            <div class="metric">
              <strong>Packet Loss:</strong>
              <span id="packetloss">${data.packet_loss.toFixed(2)}</span> %
            </div>
            <div class="metric">
              <strong>Traceroute Hops:</strong>
              <span id="tracehops">${data.traceroute_hops}</span>
            </div>
            <div class="metric">
              <strong>Test Time:</strong>
              <span id="testtime">${new Date().toLocaleString()}</span>
            </div>
          `;

          // Store this test in our history
          saveTestResult(protocol, data);

          // Update the congestion chart after saving the test result
          updateCongestionChartFromAPI();

          isTestRunning = false;
        })
        .catch((error) => {
          console.error("Error fetching protocol test data:", error);
          // Still display basic metrics even if protocol test fails
          document.getElementById("results").innerHTML = `
            <h2>Results (${protocol.toUpperCase()})</h2>
            <div class="metric">
              <strong>Download Speed:</strong>
              <span id="downloadSpeed">${data.download_speed.toFixed(
                2
              )}</span> Mbps
            </div>
            <div class="metric">
              <strong>Upload Speed:</strong>
              <span id="uploadSpeed">${data.upload_speed.toFixed(2)}</span> Mbps
            </div>
            <div class="metric">
              <strong>Jitter:</strong>
              <span id="jitter">${data.jitter.toFixed(2)}</span> ms
            </div>
            <div class="metric">
              <strong>Latency:</strong>
              <span id="latency">${data.latency.toFixed(2)}</span> ms
            </div>
            <div class="metric">
              <strong>DNS Lookup Time:</strong>
              <span id="dns">${data.dns_lookup_time.toFixed(2)}</span> ms
            </div>
            <div class="metric">
              <strong>Packet Loss:</strong>
              <span id="packetloss">${data.packet_loss.toFixed(2)}</span> %
            </div>
            <div class="metric">
              <strong>Test Time:</strong>
              <span id="testtime">${new Date().toLocaleString()}</span>
            </div>
          `;
          isTestRunning = false;
        });
    })
    .catch((error) => {
      console.error("Error fetching network metrics:", error);
      document.getElementById(
        "results"
      ).innerHTML = `<h2>Error fetching data. Please try again later.</h2>`;
      downloadSpeedometer.stopAnimation(0);
      uploadSpeedometer.stopAnimation(0);
      isTestRunning = false;
    });
}
function compareProtocols() {
  if (!tcpResults || !udpResults) {
    alert("Please run tests for both TCP and UDP protocols first");
    return;
  }

  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = `
    <h2>TCP vs UDP Comparison</h2>
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th class="tcp-data">TCP</th>
          <th class="udp-data">UDP</th>
          <th>Difference</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Download Speed (Mbps)</td>
          <td class="tcp-data">${tcpResults.download_speed.toFixed(2)}</td>
          <td class="udp-data">${udpResults.download_speed.toFixed(2)}</td>
          <td>${Math.abs(
            tcpResults.download_speed - udpResults.download_speed
          ).toFixed(2)} ${
    tcpResults.download_speed > udpResults.download_speed
      ? "(TCP better)"
      : "(UDP better)"
  }</td>
        </tr>
        <tr>
          <td>Upload Speed (Mbps)</td>
          <td class="tcp-data">${tcpResults.upload_speed.toFixed(2)}</td>
          <td class="udp-data">${udpResults.upload_speed.toFixed(2)}</td>
          <td>${Math.abs(
            tcpResults.upload_speed - udpResults.upload_speed
          ).toFixed(2)} ${
    tcpResults.upload_speed > udpResults.upload_speed
      ? "(TCP better)"
      : "(UDP better)"
  }</td>
        </tr>
        <tr>
          <td>Jitter (ms)</td>
          <td class="tcp-data">${tcpResults.jitter.toFixed(2)}</td>
          <td class="udp-data">${udpResults.jitter.toFixed(2)}</td>
          <td>${Math.abs(tcpResults.jitter - udpResults.jitter).toFixed(2)} ${
    tcpResults.jitter < udpResults.jitter ? "(TCP better)" : "(UDP better)"
  }</td>
        </tr>
        <tr>
          <td>Latency (ms)</td>
          <td class="tcp-data">${tcpResults.latency.toFixed(2)}</td>
          <td class="udp-data">${udpResults.latency.toFixed(2)}</td>
          <td>${Math.abs(tcpResults.latency - udpResults.latency).toFixed(2)} ${
    tcpResults.latency < udpResults.latency ? "(TCP better)" : "(UDP better)"
  }</td>
        </tr>
        <tr>
          <td>Packet Loss (%)</td>
          <td class="tcp-data">${tcpResults.packet_loss.toFixed(2)}</td>
          <td class="udp-data">${udpResults.packet_loss.toFixed(2)}</td>
          <td>${Math.abs(
            tcpResults.packet_loss - udpResults.packet_loss
          ).toFixed(2)} ${
    tcpResults.packet_loss < udpResults.packet_loss
      ? "(TCP better)"
      : "(UDP better)"
  }</td>
        </tr>
      </tbody>
    </table>
    
    <h3 style="margin-top: 20px; color: white;">Analysis</h3>
    <div style="color: #94a3b8; line-height: 1.6;">
      <p>TCP provides a reliable, connection-oriented protocol with built-in error correction and flow control. UDP is connectionless and offers lower latency but without guaranteed delivery.</p>
      
      <p><strong style="color: #06b6d4;">Key findings:</strong></p>
      <ul style="list-style-type: disc; margin-left: 20px;">
        ${
          tcpResults.download_speed > udpResults.download_speed
            ? "<li>TCP showed higher download speeds, likely due to its congestion control mechanisms performing well in current network conditions.</li>"
            : "<li>UDP showed higher download speeds, which is expected in networks with low congestion where TCP's overhead can limit throughput.</li>"
        }
        
        ${
          tcpResults.upload_speed > udpResults.upload_speed
            ? "<li>TCP showed higher upload speeds, suggesting stable network conditions where TCP's reliability features are beneficial.</li>"
            : "<li>UDP showed higher upload speeds, which is common when avoiding TCP's acknowledgment overhead.</li>"
        }
        
        ${
          tcpResults.latency < udpResults.latency
            ? "<li>Surprisingly, TCP showed lower latency than UDP. This could indicate network optimization for TCP traffic.</li>"
            : "<li>UDP showed lower latency than TCP, which is the expected behavior due to UDP's lightweight nature.</li>"
        }
        
        ${
          tcpResults.packet_loss < udpResults.packet_loss
            ? "<li>TCP showed lower packet loss, which demonstrates its reliable delivery mechanism.</li>"
            : "<li>UDP showed lower packet loss than expected, suggesting good network conditions during testing.</li>"
        }
      </ul>
    </div>
  `;
}

function saveTestResult(protocol, data) {
  // Get existing test history from localStorage
  let testHistory =
    JSON.parse(localStorage.getItem("networkTestHistory")) || [];

  // Add the new test with timestamp
  testHistory.push({
    timestamp: new Date().toISOString(),
    protocol: protocol,
    data: data,
  });

  // Keep only the last 100 tests to avoid excessive storage usage
  if (testHistory.length > 100) {
    testHistory = testHistory.slice(testHistory.length - 100);
  }

  // Save back to localStorage
  localStorage.setItem("networkTestHistory", JSON.stringify(testHistory));

  // Update the congestion chart
  updateCongestionChart();
}

function updateCongestionChartFromAPI() {
  const timeframe = document.getElementById("timeSelector").value || "24h"; // Default to 24h if not selected

  // Fetch historical data from our backend API - fix the endpoint URL
  fetch(`http://localhost:5000/api/historical/${timeframe}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((response) => {
      // Extract the data array from the response
      const historyData = response.data || [];

      if (historyData.length === 0) {
        console.log("No historical data available");
        return;
      }

      // Format the timestamp if it's in ISO format
      const labels = historyData.map((test) => {
        const date = new Date(test.timestamp);
        return (
          date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
          " " +
          date.toLocaleDateString([], { month: "short", day: "numeric" })
        );
      });

      const downloadData = historyData.map((test) => test.download_speed);
      const uploadData = historyData.map((test) => test.upload_speed);
      const latencyData = historyData.map((test) => test.latency);
      const packetLossData = historyData.map((test) => test.packet_loss);

      // API might not return protocol info, so we'll use a default
      const protocols = historyData.map((test) => test.protocol || "unknown");

      // Define colors based on protocol
      const pointBackgroundColors = protocols.map((protocol) =>
        protocol === "tcp"
          ? "#3b82f6"
          : protocol === "udp"
          ? "#06b6d4"
          : "#94a3b8"
      );

      // Destroy previous chart if exists
      if (congestionChart) {
        congestionChart.destroy();
      }

      // Create new chart
      const ctx = document.getElementById("congestionCanvas").getContext("2d");
      congestionChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Download Speed (Mbps)",
              data: downloadData,
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              tension: 0.4,
              pointBackgroundColor: pointBackgroundColors,
            },
            {
              label: "Upload Speed (Mbps)",
              data: uploadData,
              borderColor: "#06b6d4",
              backgroundColor: "rgba(6, 182, 212, 0.1)",
              tension: 0.4,
              pointBackgroundColor: pointBackgroundColors,
            },
            {
              label: "Latency (ms)",
              data: latencyData,
              borderColor: "#f59e0b",
              backgroundColor: "rgba(245, 158, 11, 0.1)",
              tension: 0.4,
              yAxisID: "y1",
              pointBackgroundColor: pointBackgroundColors,
            },
          ],
        },
        options: {
          scales: {
            y: {
              title: {
                display: true,
                text: "Speed (Mbps)",
                color: "#94a3b8",
              },
              ticks: {
                color: "#94a3b8",
              },
              grid: {
                color: "rgba(148, 163, 184, 0.1)",
              },
            },
            y1: {
              position: "right",
              title: {
                display: true,
                text: "Latency (ms)",
                color: "#f59e0b",
              },
              ticks: {
                color: "#f59e0b",
              },
              grid: {
                display: false,
              },
            },
            x: {
              ticks: {
                color: "#94a3b8",
                maxRotation: 45,
                minRotation: 45,
              },
              grid: {
                color: "rgba(148, 163, 184, 0.1)",
              },
            },
          },
          plugins: {
            legend: {
              labels: {
                color: "#94a3b8",
              },
            },
            tooltip: {
              callbacks: {
                afterBody: function (context) {
                  const index = context[0].dataIndex;
                  return `Protocol: ${(
                    protocols[index] || "unknown"
                  ).toUpperCase()}\nPacket Loss: ${packetLossData[
                    index
                  ].toFixed(2)}%`;
                },
              },
            },
          },
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    })
    .catch((error) => {
      console.error("Error fetching historical data:", error);
    });
}

// Event listeners setup
document.addEventListener("DOMContentLoaded", () => {
  updateCongestionChartFromAPI();

  // Add the event listeners
  document.getElementById("runTest").addEventListener("click", (event) => {
    event.preventDefault();
    runNetworkTest();
  });

  document
    .getElementById("compareProtocols")
    .addEventListener("click", (event) => {
      event.preventDefault();
      compareProtocols();
    });

  document.getElementById("timeSelector").addEventListener("change", () => {
    updateCongestionChartFromAPI();
  });
});

// Initial animation
downloadSpeedometer.startSweeping();
uploadSpeedometer.startSweeping();
