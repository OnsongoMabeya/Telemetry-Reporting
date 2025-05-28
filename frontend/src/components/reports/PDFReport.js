import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';
import * as d3 from 'd3';
import './PDFReport.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const METRIC_KEYS = {
  'Forward Power': 'forwardPower',
  'Reflected Power': 'reflectedPower',
  'VSWR': 'vswr',
  'Return Loss': 'returnLoss',
  'Temperature': 'temperature',
  'Voltage': 'voltage',
  'Current': 'current',
  'Power': 'power'
};

const METRIC_UNITS = {
  'Forward Power': 'W',
  'Reflected Power': 'W',
  'VSWR': '',
  'Return Loss': 'dB',
  'Temperature': '°C',
  'Voltage': 'V',
  'Current': 'A',
  'Power': 'W'
};

// Modern theme colors
const THEME_COLORS = {
  primary: '#0A2647',      // Deep navy blue
  secondary: '#144272',    // Medium navy blue
  accent: '#205295',       // Bright navy blue
  highlight: '#2C74B3',    // Light navy blue
  warning: '#FF4B4B',      // Modern red for warnings
  success: '#4CAF50',      // Success green
  text: {
    primary: '#0A2647',    // Deep navy for primary text
    secondary: '#525252',   // Dark gray for secondary text
    light: '#FFFFFF'       // White text
  },
  background: {
    primary: '#FFFFFF',    // White
    secondary: '#F5F7F9',   // Light gray-blue
    accent: '#E8F0FE'      // Very light blue
  },
  border: '#E0E7FF'        // Light border color
};

const METRIC_COLORS = {
  'Forward Power': '#4361EE',    // Electric blue
  'Reflected Power': '#FF4B4B',  // Modern red
  'VSWR': '#3CCF4E',            // Fresh green
  'Return Loss': '#FFB700',      // Warm yellow
  'Temperature': '#9B5DE5',      // Modern purple
  'Voltage': '#00C4B4',         // Turquoise
  'Current': '#F72585',         // Hot pink
  'Power': '#4895EF'            // Sky blue
};

const getMetricInfo = (metric) => {
  const metricName = METRIC_KEYS[metric];
  const metricUnit = METRIC_UNITS[metric];
  const metricColor = METRIC_COLORS[metric];
  return { name: metricName, title: metric, unit: metricUnit, color: metricColor };
};

const formatDataPoints = (data, metricKey) => {
  if (!data || !Array.isArray(data)) {
    console.warn(`Invalid data format for ${metricKey}:`, data);
    return [];
  }

  return data.map(point => ({
    x: new Date(point.sample_time).getTime(),
    y: parseFloat(point[metricKey])
  })).filter(point => !isNaN(point.y));
};

const analyzeMetricData = (data, metric) => {
  if (!data || data.length === 0) {
    return {
      status: 'No Data',
      analysis: 'No data available for analysis.',
      recommendation: 'Please check data collection system.',
      stats: {
        current: 0,
        min: 0,
        max: 0,
        avg: 0,
        trend: 'stable'
      }
    };
  }

  const values = data.map(point => point.y);
  const current = values[values.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // Calculate trend
  const recentValues = values.slice(-5); // Last 5 points
  const trend = recentValues.every((val, i) => i === 0 || val >= recentValues[i - 1]) ? 'increasing' :
                recentValues.every((val, i) => i === 0 || val <= recentValues[i - 1]) ? 'decreasing' : 'stable';

  let status = 'Normal';
  let analysis = '';
  let recommendation = '';

  switch(metric.name) {
    case 'forwardPower':
      if (current < 0.8 * avg) {
        status = 'Warning';
        analysis = `Forward power (${current.toFixed(2)}W) is ${((1 - current/avg) * 100).toFixed(1)}% below average (${avg.toFixed(2)}W).`;
        recommendation = 'Check transmitter output and connections. Consider maintenance if power continues to decrease.';
      } else {
        analysis = `Forward power is stable at ${current.toFixed(2)}W, within normal operating range.`;
        recommendation = 'Continue regular monitoring.';
      }
      break;

    case 'reflectedPower':
      const forwardRatio = current / (values.find(v => v > 0) || 1);
      if (forwardRatio > 0.2) {
        status = 'Warning';
        analysis = `High reflected power detected (${current.toFixed(2)}W). This indicates potential impedance mismatch.`;
        recommendation = 'Inspect antenna system, connections, and VSWR readings. Consider immediate maintenance.';
      } else {
        analysis = `Reflected power is at acceptable levels (${current.toFixed(2)}W).`;
        recommendation = 'Maintain current system configuration.';
      }
      break;

    case 'vswr':
      if (current > 1.5) {
        status = 'Warning';
        analysis = `VSWR is elevated at ${current.toFixed(2)}:1. This indicates potential antenna system issues.`;
        recommendation = 'Check antenna system, feedline, and connections. Consider professional inspection if VSWR remains high.';
      } else {
        analysis = `VSWR is good at ${current.toFixed(2)}:1, indicating proper impedance matching.`;
        recommendation = 'Continue regular monitoring of VSWR trends.';
      }
      break;

    case 'temperature':
      if (current > 40) {
        status = 'Warning';
        analysis = `Temperature is high at ${current.toFixed(2)}°C, above recommended operating range.`;
        recommendation = 'Check cooling system, airflow, and ventilation. Consider reducing power if temperature continues to rise.';
      } else {
        analysis = `Temperature is normal at ${current.toFixed(2)}°C.`;
        recommendation = 'Maintain current cooling configuration.';
      }
      break;

    case 'voltage':
      const voltageVariation = Math.abs((current - avg) / avg * 100);
      if (voltageVariation > 10) {
        status = 'Warning';
        analysis = `Voltage shows ${voltageVariation.toFixed(1)}% variation from average. Current: ${current.toFixed(2)}V, Avg: ${avg.toFixed(2)}V.`;
        recommendation = 'Monitor power supply stability. Consider UPS or voltage regulation if fluctuations persist.';
      } else {
        analysis = `Voltage is stable at ${current.toFixed(2)}V with normal variation.`;
        recommendation = 'Continue monitoring power supply performance.';
      }
      break;

    case 'current':
      if (current > 1.2 * avg) {
        status = 'Warning';
        analysis = `Current draw is ${((current/avg - 1) * 100).toFixed(1)}% above average. Current: ${current.toFixed(2)}A, Avg: ${avg.toFixed(2)}A.`;
        recommendation = 'Check for potential short circuits or equipment malfunction. Monitor power consumption closely.';
      } else {
        analysis = `Current draw is normal at ${current.toFixed(2)}A.`;
        recommendation = 'Maintain regular monitoring of current consumption.';
      }
      break;

    default:
      if (Math.abs((current - avg) / avg * 100) > 20) {
        status = 'Warning';
        analysis = `Significant variation detected in ${metric.title}. Current: ${current.toFixed(2)}${metric.unit}, Avg: ${avg.toFixed(2)}${metric.unit}.`;
        recommendation = 'Investigate cause of variation and monitor system performance.';
      } else {
        analysis = `${metric.title} is within normal operating parameters.`;
        recommendation = 'Continue regular monitoring.';
      }
  }

  return {
    status,
    analysis,
    recommendation,
    stats: {
      current,
      min,
      max,
      avg,
      trend
    }
  };
};

const drawGraphOnCanvas = (ctx, data, metric, width, height) => {
  if (!data || data.length === 0) {
    console.warn(`No data points for ${metric}`);
    return;
  }

  // Calculate min/max values for scaling
  const values = data.map(point => point.y);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valuePadding = (maxValue - minValue) * 0.1;

  // Calculate time range
  const timestamps = data.map(point => point.x);
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);

  // Set up scaling functions
  const scaleX = d3.scaleTime()
    .domain([new Date(minTime), new Date(maxTime)])
    .range([50, width - 20]);

  const scaleY = d3.scaleLinear()
    .domain([minValue - valuePadding, maxValue + valuePadding])
    .range([height - 30, 20]);

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw axes
  ctx.beginPath();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;

  // Y-axis
  ctx.moveTo(50, 20);
  ctx.lineTo(50, height - 30);

  // X-axis
  ctx.moveTo(50, height - 30);
  ctx.lineTo(width - 20, height - 30);
  ctx.stroke();

  // Draw data points and lines
  ctx.beginPath();
  ctx.strokeStyle = metric.color || '#2196f3';
  ctx.lineWidth = 2;

  data.forEach((point, i) => {
    const x = scaleX(new Date(point.x));
    const y = scaleY(point.y);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Add labels
  ctx.fillStyle = '#000';
  ctx.font = '12px Arial';

  // Y-axis labels
  const yTicks = scaleY.ticks(5);
  yTicks.forEach(tick => {
    const y = scaleY(tick);
    ctx.fillText(`${tick.toFixed(1)}${metric.unit}`, 5, y + 4);
  });

  // X-axis labels
  const xTicks = scaleX.ticks(5);
  xTicks.forEach(tick => {
    const x = scaleX(tick);
    ctx.fillText(tick.toLocaleTimeString(), x - 20, height - 10);
  });
};

const PDFReport = {
  async generateReport(telemetryData, nodeName, baseStation, pdf = new jsPDF()) {
    let currentY = 20;
    
    // Add BSI logo
    const logoImg = new Image();
    logoImg.src = '/bsilogo512.png';
    
    await new Promise((resolve, reject) => {
      logoImg.onload = () => {
        try {
          // Calculate logo dimensions (max height 30px)
          const aspectRatio = logoImg.width / logoImg.height;
          const logoHeight = 30;
          const logoWidth = logoHeight * aspectRatio;
          
          // Add logo at top center
          pdf.addImage(logoImg, 'PNG', (pdf.internal.pageSize.width - logoWidth) / 2, currentY - 15, logoWidth, logoHeight);
          resolve();
        } catch (error) {
          console.error('Error adding logo:', error);
          resolve(); // Continue without logo if there's an error
        }
      };
      logoImg.onerror = () => {
        console.error('Error loading logo');
        resolve(); // Continue without logo if there's an error
      };
    });
    
    currentY += 20;
    
    // Create modern gradient header
    const gradient = pdf.setFillColor(THEME_COLORS.primary);
    pdf.rect(0, 0, pdf.internal.pageSize.width, 80, 'F');

    // Add decorative accent line
    pdf.setDrawColor(THEME_COLORS.highlight);
    pdf.setLineWidth(3);
    pdf.line(20, 70, pdf.internal.pageSize.width - 20, 70);

    // Add header text with modern typography
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.text(`Telemetry Report`, 105, currentY, { align: 'center' });
    currentY += 15;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(16);
    pdf.text(nodeName, 105, currentY, { align: 'center' });
    currentY += 12;
    
    pdf.setFontSize(12);
    pdf.text(`Base Station: ${baseStation} | Generated: ${new Date().toLocaleString()}`, 105, currentY, { align: 'center' });
    currentY += 30;

    // Reset text color and add page border
    pdf.setTextColor(THEME_COLORS.text.primary);
    pdf.setDrawColor(THEME_COLORS.border);
    pdf.setLineWidth(1);
    pdf.rect(10, 90, pdf.internal.pageSize.width - 20, pdf.internal.pageSize.height - 100);

    // Create canvas for graphs
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    // Process each metric
    for (const metric of Object.keys(METRIC_KEYS)) {
      const metricInfo = getMetricInfo(metric);
      const formattedData = formatDataPoints(telemetryData, metricInfo.name);

      if (formattedData.length > 0) {
        // Draw graph on canvas
        drawGraphOnCanvas(ctx, formattedData, metricInfo, canvas.width, canvas.height);

        // Add graph to PDF
        const imgData = canvas.toDataURL('image/png');
        if (currentY + 200 > pdf.internal.pageSize.height) {
          pdf.addPage();
          currentY = 20;
        }

        // Add modern metric section
        pdf.setFillColor(THEME_COLORS.background.secondary);
        pdf.roundedRect(20, currentY - 5, pdf.internal.pageSize.width - 40, 160, 3, 3, 'F');

        // Add metric title with icon-like indicator
        pdf.setFillColor(metricInfo.color);
        pdf.circle(30, currentY + 7, 3, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(THEME_COLORS.text.primary);
        pdf.setFontSize(14);
        pdf.text(metric, 40, currentY + 8);
        currentY += 20;

        // Add graph with subtle shadow effect
        pdf.setFillColor(THEME_COLORS.background.primary);
        pdf.roundedRect(25, currentY, pdf.internal.pageSize.width - 50, 100, 2, 2, 'F');
        pdf.addImage(imgData, 'PNG', 30, currentY + 2, pdf.internal.pageSize.width - 60, 95);
        currentY += 105;

        // Add analysis
        const analysis = analyzeMetricData(formattedData, metricInfo);
        
        // Add statistics
        pdf.setFontSize(10);
        const statsText = `Current: ${analysis.stats.current.toFixed(2)}${metricInfo.unit} | ` +
                          `Min: ${analysis.stats.min.toFixed(2)}${metricInfo.unit} | ` +
                          `Max: ${analysis.stats.max.toFixed(2)}${metricInfo.unit} | ` +
                          `Avg: ${analysis.stats.avg.toFixed(2)}${metricInfo.unit}`;
        pdf.text(statsText, 105, currentY, { align: 'center' });
        currentY += 10;

        // Add modern stats panel
        pdf.setFillColor(THEME_COLORS.background.accent);
        pdf.roundedRect(30, currentY, pdf.internal.pageSize.width - 60, 25, 2, 2, 'F');

        // Add status indicator with modern styling
        const statusColor = analysis.status === 'Warning' ? THEME_COLORS.warning : THEME_COLORS.success;
        pdf.setFillColor(statusColor);
        pdf.circle(40, currentY + 12, 4, 'F');

        // Add status and trend text
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(THEME_COLORS.text.primary);
        pdf.text(`${analysis.status.toUpperCase()} | Trend: ${analysis.stats.trend.charAt(0).toUpperCase() + analysis.stats.trend.slice(1)}`, 50, currentY + 12);
        
        // Add stats on the right
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(`Current: ${analysis.stats.current.toFixed(2)}${metricInfo.unit} | Avg: ${analysis.stats.avg.toFixed(2)}${metricInfo.unit}`, pdf.internal.pageSize.width - 70, currentY + 12);
        currentY += 35;

        // Add analysis section with modern card design
        pdf.setFillColor(THEME_COLORS.background.primary);
        pdf.roundedRect(30, currentY - 5, pdf.internal.pageSize.width - 60, 50, 2, 2, 'F');
        
        // Add analysis icon and title
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(THEME_COLORS.text.primary);
        pdf.text('Analysis', 40, currentY + 5);
        
        // Add analysis content
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(THEME_COLORS.text.secondary);
        const analysisLines = pdf.splitTextToSize(analysis.analysis, pdf.internal.pageSize.width - 80);
        analysisLines.forEach((line, index) => {
          pdf.text(line, 40, currentY + 15 + (index * 5));
        });
        currentY += 55;

        // Add recommendation section with accent styling
        pdf.setFillColor(THEME_COLORS.background.accent);
        pdf.roundedRect(30, currentY - 5, pdf.internal.pageSize.width - 60, 40, 2, 2, 'F');
        
        // Add recommendation icon and content
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(THEME_COLORS.accent);
        pdf.text('Recommendation', 40, currentY + 5);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(THEME_COLORS.text.secondary);
        const recommendationLines = pdf.splitTextToSize(analysis.recommendation, pdf.internal.pageSize.width - 80);
        recommendationLines.forEach((line, index) => {
          pdf.text(line, 40, currentY + 15 + (index * 5));
        });
        currentY += 45;
      }
    }

    return pdf;
  },

  async fetchData(nodeName, baseStation, timeFilter) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/telemetry/${nodeName}/${baseStation}?timeFilter=${timeFilter}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching telemetry data:', error);
      return [];
    }
  }
};

export const generatePDFReport = async (config, baseStations = []) => {
  try {
    if (!baseStations || baseStations.length === 0) {
      throw new Error('No base stations available for this node');
    }

    // Fetch telemetry data for each base station
    const allTelemetryData = {};
    for (const baseStation of baseStations) {
      if (!baseStation || !baseStation.name) {
        console.warn('Invalid base station:', baseStation);
        continue;
      }
      console.log(`Fetching data for base station: ${baseStation.name}`);
      const telemetryData = await PDFReport.fetchData(config.node, baseStation.name, config.timeRange);
      console.log(`Received data for ${baseStation.name}:`, {
        dataLength: telemetryData.length,
        sampleData: telemetryData.slice(0, 2)
      });
      allTelemetryData[baseStation.name] = telemetryData;
    }

    // Generate PDF for each base station
    const pdf = new jsPDF();
    let isFirstPage = true;

    for (const baseStation of baseStations) {
      const telemetryData = allTelemetryData[baseStation.name];
      if (!telemetryData || telemetryData.length === 0) continue;

      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;

      await PDFReport.generateReport(telemetryData, config.node, baseStation.name, pdf);
    }

    pdf.save(`${config.node}_telemetry_report.pdf`);

    return {
      success: true,
      message: 'PDF report generated successfully'
    };
  } catch (error) {
    console.error('Error generating PDF report:', error);
    return {
      success: false,
      message: error.message || 'Error generating PDF report'
    };
  }
};

export default PDFReport;
