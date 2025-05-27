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

const METRIC_COLORS = {
  'Forward Power': '#2196f3',
  'Reflected Power': '#f44336',
  'VSWR': '#4caf50',
  'Return Loss': '#ff9800',
  'Temperature': '#9c27b0',
  'Voltage': '#795548',
  'Current': '#607d8b',
  'Power': '#009688'
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
    
    // Add header
    pdf.setFontSize(16);
    pdf.text(`Telemetry Report - ${nodeName}`, 105, currentY, { align: 'center' });
    currentY += 10;
    
    pdf.setFontSize(12);
    pdf.text(`Base Station: ${baseStation}`, 105, currentY, { align: 'center' });
    currentY += 10;
    
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 105, currentY, { align: 'center' });
    currentY += 20;

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

        pdf.text(metric, 105, currentY, { align: 'center' });
        currentY += 10;
        pdf.addImage(imgData, 'PNG', 10, currentY, 190, 95);
        currentY += 100;

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

        // Add status and trend
        pdf.setFontSize(11);
        pdf.setTextColor(analysis.status === 'Warning' ? '#f44336' : '#4caf50');
        pdf.text(`Status: ${analysis.status} | Trend: ${analysis.stats.trend.charAt(0).toUpperCase() + analysis.stats.trend.slice(1)}`, 105, currentY, { align: 'center' });
        pdf.setTextColor(0, 0, 0);
        currentY += 15;

        // Add detailed analysis
        pdf.setFontSize(10);
        const analysisLines = pdf.splitTextToSize(analysis.analysis, 170);
        analysisLines.forEach((line, index) => {
          pdf.text(line, 20, currentY + (index * 5));
        });
        currentY += (analysisLines.length * 5) + 10;

        // Add recommendation
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 150);
        const recommendationLines = pdf.splitTextToSize(`Recommendation: ${analysis.recommendation}`, 170);
        recommendationLines.forEach((line, index) => {
          pdf.text(line, 20, currentY + (index * 5));
        });
        pdf.setTextColor(0, 0, 0);
        currentY += (recommendationLines.length * 5) + 20;
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
      if (!baseStation || !baseStation.BaseStationName) {
        console.warn('Invalid base station:', baseStation);
        continue;
      }
      console.log(`Fetching data for base station: ${baseStation.BaseStationName}`);
      const telemetryData = await PDFReport.fetchData(config.node, baseStation.BaseStationName, config.timeRange);
      console.log(`Received data for ${baseStation.BaseStationName}:`, {
        dataLength: telemetryData.length,
        sampleData: telemetryData.slice(0, 2)
      });
      allTelemetryData[baseStation.BaseStationName] = telemetryData;
    }

    // Generate PDF for each base station
    const pdf = new jsPDF();
    let isFirstPage = true;

    for (const baseStation of baseStations) {
      const telemetryData = allTelemetryData[baseStation.BaseStationName];
      if (!telemetryData || telemetryData.length === 0) continue;

      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;

      await PDFReport.generateReport(telemetryData, config.node, baseStation.BaseStationName, pdf);
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
