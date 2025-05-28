import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const generateAnalysis = (metric, data) => {
  const currentValue = parseFloat(data[data.length - 1]?.[metric]) || 0;
  const values = data.map(item => parseFloat(item[metric])).filter(val => !isNaN(val));
  const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const percentageChange = average !== 0 ? ((currentValue - average) / average) * 100 : 0;

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

  return { currentValue, average, percentageChange, status, recommendation };
};

let chartRoot = null;

const renderGraph = async (data, metric) => {
  const validData = data.filter(point => 
    point[metric.name] !== null && 
    point[metric.name] !== undefined && 
    !isNaN(point[metric.name])
  );

  if (validData.length === 0) {
    console.warn(`No valid data points for ${metric.name}`);
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');

  // Set white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Graph margins
  const margin = { top: 40, right: 30, bottom: 60, left: 60 };
  const graphWidth = canvas.width - margin.left - margin.right;
  const graphHeight = canvas.height - margin.top - margin.bottom;

  // Find min/max values
  const values = validData.map(d => d[metric.name]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1; // Prevent division by zero

  // Draw axes
  ctx.beginPath();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  
  // Y-axis
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, canvas.height - margin.bottom);
  
  // X-axis
  ctx.moveTo(margin.left, canvas.height - margin.bottom);
  ctx.lineTo(canvas.width - margin.right, canvas.height - margin.bottom);
  ctx.stroke();

  // Draw data points and lines
  ctx.beginPath();
  ctx.strokeStyle = getGraphColor(metric.name);
  ctx.lineWidth = 2;

  validData.forEach((point, i) => {
    const x = margin.left + (i * (graphWidth / (validData.length - 1 || 1)));
    const normalizedValue = (point[metric.name] - minValue) / valueRange;
    const y = margin.top + (graphHeight - (normalizedValue * graphHeight));

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Add labels
  ctx.fillStyle = '#000000';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';

  // Title
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`${metric.title} (${metric.unit})`, canvas.width / 2, margin.top / 2);

  // Y-axis labels
  ctx.textAlign = 'right';
  ctx.font = '12px Arial';
  for (let i = 0; i <= 5; i++) {
    const value = minValue + (valueRange * (i / 5));
    const y = margin.top + graphHeight - (graphHeight * (i / 5));
    ctx.fillText(value.toFixed(1), margin.left - 5, y + 4);
  }

  // X-axis labels
  ctx.textAlign = 'center';
  ctx.font = '12px Arial';
  for (let i = 0; i < validData.length; i += Math.ceil(validData.length / 5)) {
    const x = margin.left + (i * (graphWidth / (validData.length - 1 || 1)));
    const timestamp = new Date(validData[i].timestamp).toLocaleTimeString();
    ctx.fillText(timestamp, x, canvas.height - margin.bottom + 20);
  }

  return canvas.toDataURL('image/png');
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

const createHTMLReport = (node, baseStations, timeRange) => {
  const style = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
      body { 
        font-family: 'Inter', sans-serif;
        margin: 40px;
        color: #1a1a1a;
        line-height: 1.6;
      }
      h1 { color: #1976d2; font-weight: 600; font-size: 28px; margin-bottom: 24px; }
      h2 { color: #2c3e50; font-weight: 500; font-size: 22px; margin-top: 40px; }
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 24px;
        margin: 24px 0;
      }
      .metric {
        padding: 24px;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
      }
      .metric-title { font-size: 18px; font-weight: 500; color: #2c3e50; margin-bottom: 16px; }
      .analysis {
        margin-top: 20px;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;
        font-size: 14px;
      }
      .warning { color: #dc3545; }
      .normal { color: #28a745; }
      @media print { .page-break { page-break-before: always; } }
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
      <p>Total Base Stations: ${baseStations.length}</p>
  `;

  baseStations.forEach((baseStation, index) => {
    if (index > 0) {
      content += '<div class="page-break"></div>';
    }
    content += `<h2>Base Station: ${baseStation.name}</h2>`;
    content += '<div class="metrics-grid">';
    baseStation.metrics.forEach(metric => {
      content += `
        <div class="metric">
          <div class="metric-title">${metric.title}</div>
          <div class="graph">
            <img src="${metric.graphImage}" alt="${metric.title} Graph" style="max-width: 100%;">
          </div>
          <div class="analysis">
            <p>Current Value: ${metric.analysis.currentValue.toFixed(2)} ${metric.unit}</p>
            <p>Average: ${metric.analysis.average.toFixed(2)} ${metric.unit}</p>
            <p>Change: ${metric.analysis.percentageChange.toFixed(2)}%</p>
            ${metric.analysis.recommendation ? `<p class="${metric.analysis.status}">${metric.analysis.recommendation}</p>` : ''}
          </div>
        </div>
      `;
    });
    content += '</div>';
  });

  content += `
    </body>
    </html>
  `;

  return content;
};

export const generateHTMLReport = async (config, baseStations = []) => {
  try {
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

    const processedBaseStations = await Promise.all(baseStations.map(async baseStation => {
      const response = await axios.get(`${API_BASE_URL}/api/telemetry/${config.node}/${baseStation.name}`, {
        params: { timeFilter: config.timeRange }
      });
      const telemetryData = response.data.data;

      const processedMetrics = await Promise.all(metrics.map(async metric => {
        const data = telemetryData.map(item => ({
          timestamp: new Date(item.sample_time).toLocaleString(),
          [metric.name]: parseFloat(item[metric.name]) || 0
        }));

        const analysis = generateAnalysis(metric.name, telemetryData);
        const graphImage = await renderGraph(data, metric);

        return { ...metric, data, analysis, graphImage };
      }));

      return { ...baseStation, metrics: processedMetrics };
    }));

    const html = createHTMLReport(config.node, processedBaseStations, config.timeRange);
    const blob = new Blob([html], { type: 'text/html' });
    saveAs(blob, `telemetry-report-${config.node}-${new Date().toISOString()}.html`);
  } catch (error) {
    console.error('Error generating HTML report:', error);
    throw error;
  }
};
