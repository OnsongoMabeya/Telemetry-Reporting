import html2canvas from 'html2canvas';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import * as ReactDOM from 'react-dom/client';
import { saveAs } from 'file-saver';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const style = `
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .header {
      background-color: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .header h1 {
      color: #1976d2;
      margin: 0 0 10px 0;
    }
    .header-info {
      color: #666;
      font-size: 14px;
    }
    .metrics-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    .metric {
      background-color: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .metric-title {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-bottom: 15px;
    }
    .graph {
      margin: 15px 0;
    }
    .graph img {
      max-width: 100%;
      height: auto;
    }
    .analysis {
      font-size: 14px;
      color: #666;
    }
    .analysis p {
      margin: 5px 0;
    }
    .warning {
      color: #f44336;
      font-weight: bold;
    }
    .normal {
      color: #4caf50;
      font-weight: bold;
    }
  </style>
`;

const generateAnalysis = (metric, data) => {
  // Reuse the analysis logic from NodeDetail.js
  const currentValue = data[data.length - 1]?.[metric] || 0;
  const values = data.map(item => item[metric]).filter(val => val !== null && val !== undefined);
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const percentageChange = ((currentValue - average) / average) * 100;

  let status = 'normal';
  let recommendation = '';

  switch (metric) {
    case 'forwardPower':
      if (currentValue < 10) {
        status = 'warning';
        recommendation = 'Forward power is low. Check transmitter output.';
      }
      break;
    case 'reflectedPower':
      if (currentValue > 2) {
        status = 'warning';
        recommendation = 'High reflected power detected. Check antenna system.';
      }
      break;
    // Add other metrics analysis here
  }

  return {
    currentValue,
    average,
    percentageChange,
    status,
    recommendation
  };
};

const renderGraph = async (data, metric) => {
  // Filter out any invalid data points
  const validData = data.filter(point => 
    point.timestamp && point[metric.name] !== undefined && point[metric.name] !== null
  );

  if (validData.length === 0) {
    console.warn(`No valid data points for ${metric.name}`);
    return null;
  }

  const chartContainer = document.createElement('div');
  chartContainer.style.width = '800px';
  chartContainer.style.height = '300px';
  document.body.appendChild(chartContainer);

  try {
    const chart = (
      <LineChart
        width={600}
        height={300}
        data={validData}
        margin={{ top: 20, right: 30, bottom: 30, left: 40 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="timestamp" 
          angle={-45}
          textAnchor="end"
          height={70}
          interval={Math.floor(validData.length / 5)}
        />
        <YAxis 
          label={{ 
            value: metric.unit, 
            angle: -90, 
            position: 'insideLeft',
            style: { textAnchor: 'middle' }
          }} 
        />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey={metric.name}
          name={metric.title}
          stroke={getGraphColor(metric.name)}
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    );

    const root = ReactDOM.createRoot(chartContainer);
    root.render(chart);

    // Wait for chart to render
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(chartContainer, {
      logging: false,
      scale: 2, // Increase resolution
      useCORS: true
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error rendering graph:', error);
    return null;
  } finally {
    try {
      const root = ReactDOM.createRoot(chartContainer);
      root.unmount();
      document.body.removeChild(chartContainer);
    } catch (e) {
      console.warn('Error cleaning up graph container:', e);
    }
  }
};

const getGraphColor = (dataKey) => {
  switch (dataKey) {
    case 'forwardPower': return '#4CAF50';
    case 'reflectedPower': return '#F44336';
    case 'vswr': return '#2196F3';
    case 'returnLoss': return '#FF9800';
    case 'temperature': return '#E91E63';
    case 'voltage': return '#9C27B0';
    case 'current': return '#FF5722';
    case 'power': return '#607D8B';
    default: return '#757575';
  }
};

const createHTMLReport = async (node, baseStations, timeRange) => {
  const style = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    <style>
      body { 
        font-family: 'Inter', sans-serif;
        margin: 40px;
        color: #1a1a1a;
        line-height: 1.6;
      }
      h1 {
        color: #1976d2;
        font-weight: 600;
        font-size: 28px;
        margin-bottom: 24px;
      }
      h2 {
        color: #2c3e50;
        font-weight: 500;
        font-size: 22px;
        margin-top: 40px;
        padding-bottom: 8px;
        border-bottom: 2px solid #e0e0e0;
      }
      .metric {
        margin: 24px 0;
        padding: 24px;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        transition: box-shadow 0.3s ease;
      }
      .metric:hover {
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      }
      .metric-title {
        font-size: 18px;
        font-weight: 500;
        color: #2c3e50;
        margin-bottom: 16px;
      }
      .analysis {
        margin-top: 20px;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;
        font-size: 14px;
      }
      .warning {
        color: #f44336;
        padding: 8px 12px;
        background: #ffebee;
        border-radius: 4px;
        margin-top: 8px;
      }
      .normal {
        color: #4caf50;
        padding: 8px 12px;
        background: #e8f5e9;
        border-radius: 4px;
        margin-top: 8px;
      }
      .graph {
        margin: 20px 0;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;
        overflow: hidden;
      }
      .graph img {
        width: 100%;
        height: auto;
        border-radius: 4px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        background: #f8f9fa;
        border-radius: 8px;
        margin-bottom: 32px;
      }
      .header-info {
        font-size: 14px;
        color: #666;
      }
      @media print {
        .page-break { page-break-before: always; }
      }
    </style>
  `;

  let content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Telemetry Report - ${node}</title>
      ${style}
    </head>
    <body>
      <h1>Telemetry Report</h1>
      <p>Node: ${node}</p>
      <p>Time Range: ${timeRange}</p>
      <p>Generated: ${new Date().toLocaleString()}</p>
  `;

  baseStations.forEach((baseStation, index) => {
    if (index > 0) {
      content += '<div class="page-break"></div>';
    }
    content += `<h2>Base Station: ${baseStation.name}</h2>`;
    baseStation.metrics.forEach(metric => {
      const analysis = generateAnalysis(metric.name, metric.data);
      content += `
        <div class="metric">
          <div class="metric-title">${metric.title}</div>
          <div class="graph">
            <img src="${metric.graphImage}" alt="${metric.title} Graph" style="max-width: 100%;">
          </div>
          <div class="analysis">
            <p>Current Value: ${analysis.currentValue.toFixed(2)} ${metric.unit}</p>
            <p>Average: ${analysis.average.toFixed(2)} ${metric.unit}</p>
            <p>Change: ${analysis.percentageChange.toFixed(2)}%</p>
            <p class="${analysis.status}">${analysis.recommendation}</p>
          </div>
        </div>
      `;
    });
  });

  content += `
    </body>
    </html>
  `;

  return content;
};

export const generateHTMLReport = async (config, baseStations = []) => {
  try {
    // 1. Define metrics
    const metrics = [
      { name: 'forwardPower', title: 'Forward Power', unit: 'W' },
      { name: 'reflectedPower', title: 'Reflected Power', unit: 'W' },
      { name: 'vswr', title: 'VSWR', unit: '' },
      { name: 'returnLoss', title: 'Return Loss', unit: 'dB' },
      { name: 'temperature', title: 'Temperature', unit: '°C' },
      { name: 'voltage', title: 'Voltage', unit: 'V' },
      { name: 'current', title: 'Current', unit: 'A' },
      { name: 'power', title: 'Power', unit: 'W' }
    ];

    // 2. Process each base station
    const baseStationContent = await Promise.all(baseStations.map(async baseStation => {
      // Fetch telemetry data for this base station
      const response = await axios.get(`${API_BASE_URL}/api/telemetry/${config.node}/${baseStation.BaseStationName}`, {
        params: {
          timeFilter: config.timeRange
        }
      });
      const telemetryData = response.data.data;

      // Generate graphs and analysis for each metric
      const metricsContent = await Promise.all(metrics.map(async metric => {
        const data = telemetryData.map(item => ({
          timestamp: new Date(item.sample_time).toLocaleString(),
          [metric.name]: item[metric.name]
        }));

        const analysis = generateAnalysis(metric.name, telemetryData);
        const graphImage = await renderGraph(data, metric);

        return `
          <div class="metric">
            <div class="metric-title">${metric.title}</div>
            <div class="graph">
              <img src="${graphImage}" alt="${metric.title} Graph" style="max-width: 100%;">
            </div>
            <div class="analysis">
              <p>Current Value: ${analysis.currentValue.toFixed(2)} ${metric.unit}</p>
              <p>Average: ${analysis.average.toFixed(2)} ${metric.unit}</p>
              <p>Change: ${analysis.percentageChange.toFixed(2)}%</p>
              <p class="${analysis.status}">${analysis.recommendation}</p>
            </div>
          </div>
        `;
      }));

      return `
        <div class="base-station-section">
          <h2>Base Station: ${baseStation.BaseStationName}</h2>
          <div class="metrics-container">
            ${metricsContent.join('')}
          </div>
        </div>
      `;
    }));

    // 3. Generate HTML content
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Telemetry Report - ${config.node}</title>
        ${style}
        <style>
          .base-station-section {
            margin-bottom: 40px;
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .base-station-section h2 {
            color: #1976d2;
            margin: 0 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Telemetry Report - ${config.node}</h1>
          <div class="header-info">
            <p>Time Range: ${config.timeRange}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Total Base Stations: ${baseStations.length}</p>
          </div>
        </div>

        ${baseStationContent.join('')}
      </body>
      </html>
    `;

    // 4. Save the file
    const blob = new Blob([content], { type: 'text/html' });
    saveAs(blob, `telemetry-report-${config.node}.html`);
  } catch (error) {
    console.error('Error generating HTML report:', error);
    throw error;
  }
};
